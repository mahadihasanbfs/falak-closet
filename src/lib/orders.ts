/**
 * orders.ts — shared shaping for the orders API.
 *
 * Two things this file exists to reconcile:
 *
 * 1. **Order number vs id.** The app generates and tracks by `FLK-12345`
 *    (`CartContext.placeOrder`, `AdminCreateOrderModal`), but under Prisma `id`
 *    is the Mongo ObjectId. The number lives in `orderNumber`, and
 *    `serializeOrder` puts it back on `id` so no caller has to change.
 * 2. **Unknown keys.** Writers post whole UI objects, including keys Prisma has
 *    no column for (`createdAt: Date.now()` as a number, for one). Prisma rejects
 *    unknown fields, so every write goes through `buildOrderData`.
 */

import type { Order as OrderRow, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ORDER_STATUSES, type OrderStatusValue } from './orderStatuses';
export { ORDER_STATUSES, type OrderStatusValue };

function opt<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value: unknown, fallback = 0): number {
  return Math.trunc(toNum(value, fallback));
}

type Raw = Record<string, unknown>;

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

/** `Date` objects cannot cross to a Client Component, and `id` must read as the FLK number. */
export function serializeOrder(row: OrderRow) {
  return {
    id: row.orderNumber,
    _id: row.id,
    orderNumber: row.orderNumber,
    date: row.date,
    items: row.items,
    subtotal: row.subtotal,
    discount: row.discount,
    shippingFee: row.shippingFee,
    total: row.total,
    status: row.status,
    shippingAddress: {
      fullName: row.shippingAddress.fullName,
      phone: row.shippingAddress.phone,
      district: opt(row.shippingAddress.district),
      fullAddress: opt(row.shippingAddress.fullAddress),
      street: opt(row.shippingAddress.street),
      city: opt(row.shippingAddress.city),
      country: opt(row.shippingAddress.country),
      postalCode: opt(row.shippingAddress.postalCode),
      pathaoCityId: opt(row.shippingAddress.pathaoCityId),
      pathaoZoneId: opt(row.shippingAddress.pathaoZoneId),
      pathaoAreaId: opt(row.shippingAddress.pathaoAreaId),
      pathaoCityName: opt(row.shippingAddress.pathaoCityName),
      pathaoZoneName: opt(row.shippingAddress.pathaoZoneName),
      pathaoAreaName: opt(row.shippingAddress.pathaoAreaName),
    },
    userEmail: opt(row.userEmail),
    userIp: opt(row.userIp),
    deliveryMethod: opt(row.deliveryMethod),
    paymentMethod: opt(row.paymentMethod),
    trackingNumber: opt(row.trackingNumber),
    estimatedDelivery: opt(row.estimatedDelivery),
    deliveryZone: opt(row.deliveryZone),
    deliverySubArea: opt(row.deliverySubArea),
    paymentSenderNumber: opt(row.paymentSenderNumber),
    paymentTrxId: opt(row.paymentTrxId),
    paymentStatus: opt(row.paymentStatus),
    promoCode: opt(row.promoCode),
    courierDeliveryFee: opt(row.courierDeliveryFee),
    consignmentId: opt(row.consignmentId),
    courierStatus: opt(row.courierStatus),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((i): i is Raw => Boolean(i) && typeof i === 'object')
    .map((i) => ({
      // A snapshot of the product as sold — deliberately Json, so historical
      // orders keep their prices when the catalog entry later changes.
      product: (i.product ?? {}) as Prisma.InputJsonValue,
      selectedColor: toStr(i.selectedColor),
      selectedSize: toStr(i.selectedSize),
      quantity: Math.max(1, toInt(i.quantity, 1)),
    }));
}

function toShippingAddress(value: unknown) {
  const raw: Raw = value && typeof value === 'object' ? (value as Raw) : {};

  const fullName = toStr(raw.fullName);
  const phone = toStr(raw.phone);
  if (!fullName || !phone) {
    throw new OrderValidationError('Shipping address needs at least a full name and phone number');
  }

  const optional = (value: unknown): string | undefined => toStr(value) || undefined;
  const optionalNum = (value: unknown): number | undefined => {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    fullName,
    phone,
    district: optional(raw.district),
    fullAddress: optional(raw.fullAddress),
    street: optional(raw.street),
    city: optional(raw.city),
    country: optional(raw.country),
    postalCode: optional(raw.postalCode),
    pathaoCityId: optionalNum(raw.pathaoCityId),
    pathaoZoneId: optionalNum(raw.pathaoZoneId),
    pathaoAreaId: optionalNum(raw.pathaoAreaId),
    pathaoCityName: optional(raw.pathaoCityName),
    pathaoZoneName: optional(raw.pathaoZoneName),
    pathaoAreaName: optional(raw.pathaoAreaName),
  };
}

/** Fallback for a writer that did not supply one. Both current writers do. */
function generateOrderNumber(): string {
  return `FLK-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function buildOrderData(body: Raw): Prisma.OrderCreateInput {
  const items = toItems(body.items);
  if (items.length === 0) {
    throw new OrderValidationError('An order needs at least one item');
  }

  const subtotal = toNum(body.subtotal);
  const discount = toNum(body.discount);
  const shippingFee = toNum(body.shippingFee);

  const optionalNum = (value: unknown): number | undefined => {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    orderNumber: toStr(body.orderNumber) || toStr(body.id) || generateOrderNumber(),
    date: toStr(body.date) || new Date().toISOString(),
    items,
    subtotal,
    discount,
    shippingFee,
    total: toNum(body.total, Math.max(0, subtotal - discount + shippingFee)),
    status: toStr(body.status) || 'Pending',
    shippingAddress: toShippingAddress(body.shippingAddress),
    ...(toStr(body.userEmail) ? { userEmail: toStr(body.userEmail) } : {}),
    ...(toStr(body.userIp) ? { userIp: toStr(body.userIp) } : {}),
    ...(toStr(body.deliveryMethod) ? { deliveryMethod: toStr(body.deliveryMethod) } : {}),
    ...(toStr(body.paymentMethod) ? { paymentMethod: toStr(body.paymentMethod) } : {}),
    ...(toStr(body.trackingNumber) ? { trackingNumber: toStr(body.trackingNumber) } : {}),
    ...(toStr(body.estimatedDelivery)
      ? { estimatedDelivery: toStr(body.estimatedDelivery) }
      : {}),
    ...(toStr(body.deliveryZone) ? { deliveryZone: toStr(body.deliveryZone) } : {}),
    ...(toStr(body.deliverySubArea) ? { deliverySubArea: toStr(body.deliverySubArea) } : {}),
    ...(toStr(body.paymentSenderNumber) ? { paymentSenderNumber: toStr(body.paymentSenderNumber) } : {}),
    ...(toStr(body.paymentTrxId) ? { paymentTrxId: toStr(body.paymentTrxId) } : {}),
    ...(toStr(body.paymentStatus) ? { paymentStatus: toStr(body.paymentStatus) } : {}),
    ...(toStr(body.promoCode) ? { promoCode: toStr(body.promoCode) } : {}),
    ...(optionalNum(body.courierDeliveryFee) !== undefined ? { courierDeliveryFee: optionalNum(body.courierDeliveryFee) } : {}),
    ...(toStr(body.consignmentId) ? { consignmentId: toStr(body.consignmentId) } : {}),
    ...(toStr(body.courierStatus) ? { courierStatus: toStr(body.courierStatus) } : {}),
  };
}

/**
 * Adjust stock quantities across product level and variation matrix for order items.
 * Direction:
 *   - 'decrease': Order placed or un-cancelled -> reduce stock
 *   - 'increase': Order cancelled -> restock items
 */
export async function adjustStockForOrderItems(
  items: Array<any>,
  direction: 'decrease' | 'increase'
) {
  if (!Array.isArray(items) || items.length === 0) return;

  for (const item of items) {
    const rawProd = item.product;
    const pId =
      typeof rawProd === 'object' && rawProd
        ? (rawProd.id || rawProd._id)
        : item.productId;

    if (!pId || typeof pId !== 'string') continue;

    const qty = Math.max(1, Number(item.quantity) || 1);
    const color = toStr(item.selectedColor).toLowerCase();
    const size = toStr(item.selectedSize).toLowerCase();

    try {
      const product = await prisma.product.findUnique({ where: { id: pId } });
      if (!product) continue;

      let updatedVariations = [...(product.variations || [])];

      if (updatedVariations.length > 0) {
        updatedVariations = updatedVariations.map((v) => {
          const vColor = (v.colorName || '').toLowerCase();
          const vSize = (v.size || '').toLowerCase();

          const isMatch =
            color && size
              ? vColor === color && vSize === size
              : color
              ? vColor === color
              : size
              ? vSize === size
              : false;

          if (isMatch) {
            const currentStock = typeof v.stock === 'number' ? v.stock : 0;
            const newVarStock =
              direction === 'decrease'
                ? Math.max(0, currentStock - qty)
                : currentStock + qty;
            return { ...v, stock: newVarStock };
          }
          return v;
        });
      }

      // Compute total product stock
      let newStock = product.stock;
      if (updatedVariations.length > 0) {
        newStock = updatedVariations.reduce((sum, v) => sum + (v.stock || 0), 0);
      } else {
        newStock =
          direction === 'decrease'
            ? Math.max(0, product.stock - qty)
            : product.stock + qty;
      }

      await prisma.product.update({
        where: { id: pId },
        data: {
          stock: newStock,
          variations: updatedVariations,
        },
      });
    } catch (err) {
      console.error(`[adjustStockForOrderItems] Failed to adjust stock for product ${pId}:`, err);
    }
  }
}
