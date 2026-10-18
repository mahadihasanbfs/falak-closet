'use client';

/**
 * ReceiptModal.tsx — printable A4 invoice/receipt for an order.
 *
 * Rendered through a portal as a direct <body> child (#receipt-portal) so the
 * global print rules in globals.css can hide the entire app and print ONLY
 * the receipt sheet, regardless of the page it was opened from.
 *
 * Screen: preview modal (scrollable, ESC/backdrop to close).
 * Print:  the sheet alone fills the page — colors degrade gracefully to
 *         grayscale, all text stays high-contrast black on white.
 */

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Info, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { OrderRecord } from '@/context/CartContext';
import { formatCurrency, getProductVariationColorHex } from '@/lib/utils';

/* ─────────────────────────── helpers ─────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Store identity shown on the receipt header — falls back gracefully. */
interface StoreIdentity {
  contactPhone: string;
  contactEmail: string;
  address: string;
}

const FALLBACK_IDENTITY: StoreIdentity = {
  contactPhone: '',
  contactEmail: '',
  address: 'Dhaka, Bangladesh',
};

function statusLabel(s: string) {
  switch (s) {
    case 'Pending Payment': return 'PENDING PAYMENT';
    case 'Processing': return 'PROCESSING';
    case 'On Hold': return 'ON HOLD';
    case 'Shipped': return 'SHIPPED';
    case 'Delivered': return 'DELIVERED';
    case 'Completed': return 'COMPLETED';
    case 'Cancelled': return 'CANCELLED';
    case 'Refunded': return 'REFUNDED';
    case 'Failed': return 'FAILED';
    default: return s.toUpperCase();
  }
}

/* ─────────────────────────── component ─────────────────────────── */

interface ReceiptModalProps {
  order: OrderRecord;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [identity, setIdentity] = useState<StoreIdentity>(FALLBACK_IDENTITY);

  /* Portal needs the client — hydration flag without a setState-in-effect. */
  const mounted = useSyncExternalStore(
    () => () => { }, // no subscriptions: server snapshot never changes
    () => true, // client
    () => false // server
  );

  /* Pull admin-configured contact details for the letterhead. */
  useEffect(() => {
    let alive = true;
    fetch('/api/settings?key=site', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.success) return;
        const v = data.setting?.value ?? {};
        setIdentity({
          contactPhone: typeof v.contactPhone === 'string' ? v.contactPhone : '',
          contactEmail: typeof v.contactEmail === 'string' ? v.contactEmail : '',
          address: typeof v.address === 'string' && v.address ? v.address : 'Dhaka, Bangladesh',
        });
      })
      .catch(() => { /* fallback identity already set */ });
    return () => {
      alive = false;
    };
  }, []);

  /* ESC to close + lock body scroll while open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!mounted) return null;

  const contactLine = [
    identity.address,
    identity.contactPhone && `Hotline: ${identity.contactPhone}`,
    identity.contactEmail,
  ]
    .filter(Boolean)
    .join('  •  ');

  const sh = order.shippingAddress ?? {
    fullName: 'Valued Client',
    phone: 'N/A',
    street: '',
    city: '',
    district: '',
    country: 'Bangladesh',
  };

  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://falakcloset.com';
  const trackingUrl = `${origin}/track?id=${encodeURIComponent(order.id)}`;

  return createPortal(
    <div id="receipt-portal">
      {/* ── Backdrop (screen only) ── */}
      <div
        className="no-print fixed inset-0 z-[90] bg-[#0D153A]/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Modal panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Order receipt preview"
        className="fixed inset-0 z-[100] overflow-y-auto print:static print:overflow-visible print:z-auto"
      >
        <div className="min-h-full flex flex-col items-center justify-start py-6 sm:py-10 px-3 print:py-0 print:px-0 print:block">
          {/* Toolbar (screen only) */}
          <div className="no-print w-full max-w-[800px] mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <h2 className="font-serif font-extrabold text-lg text-white">Receipt Preview</h2>
              <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Choose “Save as PDF” in the print dialog to keep a copy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#A80C14] hover:bg-[#8C0A10] text-white text-xs font-bold rounded-full shadow-md shadow-[#A80C14]/30 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>
          </div>

          {/* ── The receipt sheet ── */}
          <div
            id="receipt-sheet"
            className="w-full max-w-[800px] bg-white text-stone-900 shadow-2xl rounded-none print:shadow-none print:rounded-none print:max-w-none receipt-sheet"
          >
            {/* Letterhead */}
            <div className="px-8 sm:px-10 pt-8 pb-5 border-b-2 border-[#0D153A] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-serif font-black text-2xl sm:text-[28px] leading-none text-[#0D153A] tracking-tight">
                  Falak Closet
                </p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#A80C14] font-bold mt-1.5">
                  Premium Modest Fashion
                </p>
                <p className="text-[10px] text-stone-500 mt-2 leading-relaxed max-w-[300px]">
                  {contactLine}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-serif font-extrabold text-xl sm:text-2xl text-[#0D153A] uppercase tracking-wide">
                  Invoice
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">/ Order Receipt</p>
                <p className="mt-3 text-[11px] font-mono font-bold text-[#0D153A]">#{order.id}</p>
                <p className="text-[10px] text-stone-500">{formatDate(order.date)}</p>
              </div>
            </div>

            {/* Meta strip */}
            <div className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200 text-center">
              <div className="py-3 px-2">
                <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">Order Status</p>
                <p className={`text-[11px] font-black mt-1 tracking-wide ${order.status === 'Cancelled' ? 'text-rose-600' : 'text-[#0D153A]'}`}>
                  {statusLabel(order.status)}
                </p>
              </div>
              <div className="py-3 px-2">
                <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">Courier Tracking</p>
                <p className="text-[11px] font-mono font-bold mt-1 text-[#0D153A]">
                  {order.trackingNumber || '—'}
                </p>
              </div>
              <div className="py-3 px-2">
                <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">Est. Delivery</p>
                <p className="text-[11px] font-bold mt-1 text-[#0D153A]">
                  {order.estimatedDelivery || '2-3 Business Days'}
                </p>
              </div>
            </div>

            {/* Bill-to / Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-8 sm:px-10 py-6 border-b border-stone-200">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold border-b border-stone-200 pb-1.5 mb-2.5">
                  Billed / Shipped To
                </p>
                <div className="text-[11px] leading-relaxed text-stone-700 space-y-0.5">
                  <p className="font-bold text-[13px] text-[#0D153A]">{sh.fullName || 'Valued Client'}</p>
                  <p className="font-mono">{sh.phone || 'N/A'}</p>
                  {(sh.fullAddress || sh.street) && <p>{sh.fullAddress || sh.street}</p>}
                  <p>
                    {[sh.city, sh.district, sh.country || 'Bangladesh'].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold border-b border-stone-200 pb-1.5 mb-2.5 sm:ml-auto sm:max-w-[240px]">
                  Payment Details
                </p>
                <div className="text-[11px] leading-relaxed text-stone-700 space-y-0.5 sm:ml-auto sm:max-w-[240px]">
                  <p>
                    <span className="text-stone-400">Method: </span>
                    <span className="font-bold text-[#0D153A]">
                      {order.paymentMethod || 'Cash on Delivery (COD)'}
                    </span>
                  </p>
                  {order.paymentMethod === 'bKash Send Money (Manual)' && (
                    <>
                      <p className="font-mono">
                        <span className="text-stone-400 font-sans">Sender: </span>
                        {order.paymentSenderNumber || 'N/A'}
                      </p>
                      <p className="font-mono">
                        <span className="text-stone-400 font-sans">TrxID: </span>
                        {order.paymentTrxId || 'N/A'}
                      </p>
                    </>
                  )}
                  {order.paymentStatus && (
                    <p>
                      <span className="text-stone-400">Status: </span>
                      <span className={`font-black ${order.paymentStatus === 'Verified' ? 'text-emerald-700' : order.paymentStatus === 'Rejected' ? 'text-rose-600' : 'text-amber-700'}`}>
                        {order.paymentStatus.toUpperCase()}
                      </span>
                    </p>
                  )}
                  {order.promoCode && (
                    <p>
                      <span className="text-stone-400">Coupon: </span>
                      <span className="font-mono font-bold text-[#0D153A]">{order.promoCode}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="px-8 sm:px-10 py-5">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0D153A] text-white">
                    <th className="text-left font-bold uppercase tracking-wider text-[9px] py-2.5 pl-3 pr-2 rounded-l-md">
                      Item
                    </th>
                    <th className="text-center font-bold uppercase tracking-wider text-[9px] py-2.5 px-2 w-16">Qty</th>
                    <th className="text-right font-bold uppercase tracking-wider text-[9px] py-2.5 px-2 w-24">Unit</th>
                    <th className="text-right font-bold uppercase tracking-wider text-[9px] py-2.5 pl-2 pr-3 w-28 rounded-r-md">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    /* Admin POS orders can store name/price flat instead of a
                     * nested product — accept both shapes. */
                    const raw = item as { name?: string; price?: number };
                    const itemName = item.product?.name || raw.name || 'Falak Closet Item';
                    const unitPrice = item.product?.price ?? raw.price ?? 0;
                    return (
                      <tr key={i} className="border-b border-stone-100">
                        <td className="py-2.5 pl-3 pr-2">
                          <p className="font-bold text-[#0D153A] leading-snug">{itemName}</p>
                          {(item.selectedColor || item.selectedSize) && (
                            <div className="flex items-center gap-1.5 text-[9px] text-stone-500 mt-0.5">
                              {item.selectedColor && (
                                <span className="inline-flex items-center gap-1">
                                  {(() => {
                                    const hex = getProductVariationColorHex(item.product, item.selectedColor);
                                    return hex ? (
                                      <span
                                        className="w-2 h-2 rounded-full border border-black/20 shrink-0"
                                        style={{ backgroundColor: hex }}
                                      />
                                    ) : null;
                                  })()}
                                  <span>{item.selectedColor}</span>
                                </span>
                              )}
                              {item.selectedColor && item.selectedSize && <span>·</span>}
                              {item.selectedSize && <span>{item.selectedSize}</span>}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2 font-mono">{item.quantity}</td>
                        <td className="text-right py-2.5 px-2 font-mono text-stone-600">
                          {formatCurrency(unitPrice)}
                        </td>
                        <td className="text-right py-2.5 pl-2 pr-3 font-mono font-bold text-[#0D153A]">
                          {formatCurrency(unitPrice * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-full sm:w-72 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(order.subtotal ?? order.total)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span>
                      <span className="font-mono">−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Charge</span>
                    <span className="font-mono">
                      {order.shippingFee === 0 ? 'FREE' : formatCurrency(order.shippingFee ?? 60)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-[#0D153A] pt-2 mt-1.5">
                    <span className="font-black text-[13px] text-[#0D153A] uppercase tracking-wide">Total Paid</span>
                    <span className="font-mono font-black text-lg text-[#0D153A]">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature + footer */}
            <div className="px-8 sm:px-10 pb-6">
              <div className="mt-5 border-t border-stone-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Left / Center Info & Return Policy */}
                  <div className="sm:col-span-2 text-left space-y-1.5">
                    <p className="text-[11px] font-bold text-[#0D153A]">
                      Thank you for shopping with Falak Closet!
                    </p>
                    <p className="text-[9.5px] text-stone-600 leading-relaxed">
                      Exchange accepted within 7 days with this invoice and unworn items in original condition.
                      {identity.contactPhone && ` Questions? Hotline: ${identity.contactPhone}.`}
                    </p>

                    {/* Return Policy Link */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[9.5px]">
                      <span className="text-stone-500 font-medium">Need returns or exchange?</span>
                      <a
                        href="/returns"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#A80C14] hover:text-[#8C0A10] font-bold underline inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Return & Exchange Policy</span>
                        <ExternalLink className="w-3 h-3 no-print" />
                      </a>
                      <span className="text-stone-400 font-mono text-[9px]">(falakcloset.com/returns)</span>
                    </div>
                  </div>

                  {/* Right: Scan to Track Order QR Code */}
                  <div className="sm:col-span-1 flex flex-col items-center sm:items-end text-center sm:text-right border-t sm:border-t-0 sm:border-l border-stone-200 pt-3 sm:pt-0 sm:pl-4">
                    <div className="bg-white p-1.5 border border-stone-200 rounded-md shadow-xs inline-block">
                      <QRCodeSVG
                        value={trackingUrl}
                        size={72}
                        level="M"
                        includeMargin={false}
                        className="w-18 h-18 text-[#0D153A]"
                      />
                    </div>
                    <p className="text-[9.5px] font-bold text-[#0D153A] mt-1 flex items-center justify-center sm:justify-end gap-1">
                      <QrCode className="w-3 h-3 text-[#A80C14]" />
                      Scan to Track Order
                    </p>
                    <p className="text-[8px] text-stone-400 font-mono mt-0.5">
                      falakcloset.com/track?id={order.id}
                    </p>
                  </div>
                </div>

                {/* Bottom Receipt Metadata */}
                <div className="mt-4 pt-2.5 border-t border-dashed border-stone-200 flex flex-col sm:flex-row items-center justify-between text-[8px] text-stone-400 font-mono gap-1">
                  <span>Generated {new Date().toLocaleString('en-US')} · Official Invoice</span>
                  <span>Falak Closet · falakcloset.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
