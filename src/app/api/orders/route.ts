import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildOrderData, serializeOrder, OrderValidationError, adjustStockForOrderItems } from '@/lib/orders';
import { evaluatePromotion } from '@/lib/promotions';
import { getPathaoDeliveryFee, calculateOrderWeight } from '@/lib/shipping/pathao';
import { getStoreSettingsSafe } from '@/lib/siteSettings';
import { checkIsFreeDelivery, calculateShippingFee } from '@/lib/shipping/locationBilingual';
import { broadcastSocketEventServer } from '@/lib/socketServerBroadcast';

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Server error';
}

// ─── GET /api/orders ─────────────────────────────────────────────────────────
// Without query params: legacy full response `{ orders }` (used by CartContext
// and the admin dashboard context).
//
// With `page`/`pageSize`: server-paginated admin view —
//   GET /api/orders?page=2&pageSize=8&status=Processing&query=017&sort=date&dir=desc
//   → { orders: [...one page...], pagination, counts, stats }
//   status: All | Unverified Payments | Pending | Processing | Quality Checked |
//           Shipped | Out for Delivery | Delivered | Cancelled
//   sort:   date | total   dir: asc | desc
//   pageSize caps at 100 for views and 500 for CSV export.
const STATUS_FILTERS = [
  'All',
  'Unverified Payments',
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Ready for Shipment',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
  'Payment Pending',
  'Payment Failed',
  'Cancelled',
  'Return Requested',
  'Returned',
  'Refund Processing',
  'Refunded',
  'Failed Delivery',
] as const;
const ORDER_SORTS = ['date', 'total'] as const;

export async function GET(req: NextRequest) {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    const serialized = orders.map(serializeOrder);

    const sp = req.nextUrl.searchParams;
    if (!sp.has('page') && !sp.has('pageSize')) {
      if (sp.has('query')) {
        const query = (sp.get('query') || '').trim().replace(/^#/, '').toLowerCase();
        const searched = query
          ? serialized.filter((o) => {
              const oId = o.id.toLowerCase();
              const track = (o.trackingNumber || '').toLowerCase();
              return oId === query || oId === `flk-${query}` || (track && track === query);
            })
          : [];
        return NextResponse.json({ success: true, orders: searched });
      }
      return NextResponse.json({ success: true, orders: serialized });
    }

    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(sp.get('pageSize') || '8', 10) || 8));
    const rawStatus = sp.get('status') || 'All';
    const status = (STATUS_FILTERS as readonly string[]).includes(rawStatus) ? rawStatus : 'All';
    const query = (sp.get('query') || '').trim().toLowerCase();
    const rawSort = sp.get('sort') || 'date';
    const sort = (ORDER_SORTS as readonly string[]).includes(rawSort) ? rawSort : 'date';
    const dir = sp.get('dir') === 'asc' ? 'asc' : 'desc';

    const isUnverified = (o: (typeof serialized)[number]) =>
      o.paymentMethod === 'bKash Send Money (Manual)' && o.paymentStatus === 'Pending';

    // Pill counts are computed over the ENTIRE order book (search-independent),
    // matching the previous client-side pill behaviour.
    const counts: Record<string, number> = { All: serialized.length, 'Unverified Payments': 0 };
    for (const st of STATUS_FILTERS) {
      if (st !== 'All' && st !== 'Unverified Payments') counts[st] = 0;
    }
    let revenue = 0;
    let delivered = 0;
    let pendingFulfillment = 0;
    for (const o of serialized) {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
      if (isUnverified(o)) counts['Unverified Payments'] += 1;
      revenue += o.total;
      if (o.status === 'Delivered' || o.status === 'Completed') delivered += 1;
      if (
        o.status === 'Pending' ||
        o.status === 'Confirmed' ||
        o.status === 'Processing' ||
        o.status === 'Packed' ||
        o.status === 'Ready for Shipment' ||
        o.status === 'Payment Pending' ||
        o.status === 'On Hold' ||
        o.status === 'Quality Checked'
      ) {
        pendingFulfillment += 1;
      }
    }

    // Search → status filter → sort → paginate
    const searched = query
      ? serialized.filter((o) => {
          const hay = [
            o.id,
            o.shippingAddress?.phone || '',
            o.shippingAddress?.fullName || '',
            o.shippingAddress?.district || o.shippingAddress?.city || '',
          ];
          return hay.some((h) => h.toLowerCase().includes(query));
        })
      : serialized;

    const filtered =
      status === 'All'
        ? searched
        : status === 'Unverified Payments'
          ? searched.filter(isUnverified)
          : searched.filter((o) => o.status === status);

    const dirMul = dir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sort === 'total') return (a.total - b.total) * dirMul;
      return (
        (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * dirMul
      );
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    return NextResponse.json({
      success: true,
      orders: pageRows,
      pagination: { page: safePage, pageSize, totalItems, totalPages },
      counts,
      stats: {
        totalOrders: serialized.length,
        pendingFulfillment,
        delivered,
        revenue,
      },
    });
  } catch (err) {
    console.error('[GET /api/orders]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// ─── POST /api/orders ────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = buildOrderData(body);
    let warning: string | undefined = undefined;

    const subtotal = data.subtotal;

    const storeSettings = await getStoreSettingsSafe();
    const isFreeShipping = checkIsFreeDelivery(
      data.items as any,
      subtotal,
      storeSettings.freeShippingThreshold
    );

    // Calculate customer delivery fee based on standard store rates:
    // Inside Dhaka: 80, Sub-area Dhaka: 100, Outside Dhaka: 150 (or 0 if free delivery)
    const shippingCalc = calculateShippingFee({
      district: body.shippingAddress?.district,
      city: body.shippingAddress?.city,
      address: body.shippingAddress?.fullAddress || body.shippingAddress?.street,
      zoneName: body.shippingAddress?.pathaoZoneName || body.deliveryZone,
      areaName: body.shippingAddress?.pathaoAreaName || body.deliverySubArea,
      subtotal,
      freeShippingThreshold: storeSettings.freeShippingThreshold,
      isFreeDelivery: isFreeShipping,
      items: data.items as any,
    });

    data.shippingFee = isFreeShipping ? 0 : shippingCalc.fee;

    // Server-side Pathao delivery fee quote for internal merchant logistics only
    // (Does not overwrite the standard customer shipping fee)
    const pathaoCityId = body.shippingAddress?.pathaoCityId;
    const pathaoZoneId = body.shippingAddress?.pathaoZoneId;

    if (pathaoCityId && pathaoZoneId) {
      try {
        const weight = calculateOrderWeight(data.items as any);
        const quote = await getPathaoDeliveryFee({
          cityId: parseInt(String(pathaoCityId), 10),
          zoneId: parseInt(String(pathaoZoneId), 10),
          weight,
        });

        data.courierDeliveryFee = quote.final_price;
      } catch (pathaoErr) {
        console.error('[POST /api/orders] Pathao price calculation failed:', pathaoErr);
      }
    }

    const shippingFee = typeof data.shippingFee === 'number' ? data.shippingFee : 0;

    if (body.promoCode) {
      const cleanCode = String(body.promoCode).toUpperCase().trim();
      const promotion = await prisma.promotion.findUnique({ where: { code: cleanCode } });

      if (!promotion) {
        warning = `Promo code "${cleanCode}" could not be applied: Code is invalid.`;
        data.discount = 0;
        data.promoCode = null;
        data.total = Math.max(0, subtotal + shippingFee);
      } else {
        const evaluation = evaluatePromotion(promotion, subtotal);
        if (!evaluation.isValid) {
          warning = `Promo code "${cleanCode}" could not be applied: ${evaluation.error}`;
          data.discount = 0;
          data.promoCode = null;
          data.total = Math.max(0, subtotal + shippingFee);
        } else {
          // Overwrite client values with server-calculated ones
          data.discount = evaluation.calculatedDiscount || 0;
          data.promoCode = promotion.code;
          data.total = Math.max(0, subtotal - data.discount + shippingFee);
        }
      }
    } else {
      data.discount = typeof body.discount === 'number' ? body.discount : 0;
      data.promoCode = null;
      data.total = Math.max(0, subtotal - (data.discount || 0) + shippingFee);
    }

    let order;
    if (data.promoCode && !warning) {
      // Best-effort atomic transaction to create order and increment coupon usage.
      // MongoDB does not support native row-level locks, so this serves as a
      // best-effort race guard to ensure usedCount is kept in sync with the order record.
      const [newOrder] = await prisma.$transaction([
        prisma.order.create({ data }),
        prisma.promotion.update({
          where: { code: data.promoCode },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
      order = newOrder;
    } else {
      order = await prisma.order.create({ data });
    }

    // Deduct stock for ordered items from product stock & variation matrix
    try {
      await adjustStockForOrderItems(order.items, 'decrease');
    } catch (stockErr) {
      console.error('[POST /api/orders] stock deduction failed:', stockErr);
    }

    // Auto-register the customer as a user profile. Deliberately in its own
    // try/catch: the order is already committed, so a profile-sync failure must
    // not turn a successful purchase into an error response.
    try {
      const { fullName, phone, district, city, fullAddress, street } = order.shippingAddress;
      const email =
        order.userEmail ||
        (fullName ? `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}@falakcloset.com` : '') ||
        `${phone}@falakcloset.com`;

      const profile = {
        phone,
        name: fullName,
        district: district || city || 'Dhaka',
        fullAddress: fullAddress || street || 'Dhaka, Bangladesh',
        ...(order.userIp ? { ip: order.userIp } : {}),
      };

      await prisma.user.upsert({
        where: { email: email.toLowerCase() },
        update: profile,
        create: { email: email.toLowerCase(), ...profile },
      });
    } catch (profileErr) {
      console.error('[POST /api/orders] profile sync skipped', profileErr);
    }

    const serialized = serializeOrder(order);
    void broadcastSocketEventServer('new_order_alert', serialized);

    return NextResponse.json(
      {
        success: true,
        message: 'Order placed',
        order: serialized,
        ...(warning ? { warning } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error('[POST /api/orders]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// ─── PATCH /api/orders ───────────────────────────────────────────────────────
// body: { orderId: 'FLK-12345', status?: 'Out for Delivery', paymentStatus?: 'Verified' | 'Rejected' }
export async function PATCH(req: Request) {
  try {
    const { orderId, status, paymentStatus } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    // `orderId` is the customer-facing FLK number, which lives in `orderNumber`.
    const existing = await prisma.order.findUnique({ where: { orderNumber: String(orderId) } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const updateData: { status?: string; paymentStatus?: string } = {};
    if (status !== undefined) updateData.status = String(status);
    if (paymentStatus !== undefined) updateData.paymentStatus = String(paymentStatus);

    // If order status changes to or from restock statuses ('Cancelled', 'Returned', 'Refunded', 'Payment Failed', 'Failed Delivery'), adjust stock accordingly
    if (status !== undefined && String(status) !== existing.status) {
      const newStatus = String(status);
      const oldStatus = existing.status;
      const isRestock = (st: string) =>
        st === 'Cancelled' ||
        st === 'Returned' ||
        st === 'Refunded' ||
        st === 'Payment Failed' ||
        st === 'Failed Delivery';

      try {
        if (isRestock(newStatus) && !isRestock(oldStatus)) {
          // Restock items back to inventory
          await adjustStockForOrderItems(existing.items, 'increase');
        } else if (!isRestock(newStatus) && isRestock(oldStatus)) {
          // Re-deduct items from inventory
          await adjustStockForOrderItems(existing.items, 'decrease');
        }
      } catch (stockErr) {
        console.error('[PATCH /api/orders] stock adjustment failed:', stockErr);
      }
    }

    const order = await prisma.order.update({
      where: { orderNumber: existing.orderNumber },
      data: updateData,
    });

    const serialized = serializeOrder(order);
    void broadcastSocketEventServer('order_updated', serialized);

    return NextResponse.json({
      success: true,
      message: 'Order updated',
      order: serialized,
    });
  } catch (err) {
    console.error('[PATCH /api/orders]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
