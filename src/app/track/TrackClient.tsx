'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  PackageCheck,
  MapPin,
  HelpCircle,
  ArrowLeft,
  Printer,
  ShoppingBag,
  CreditCard,
  User,
  Phone,
  FileText,
  SearchX,
  Hash,
  Calendar,
  Banknote,
  ChevronRight,
} from 'lucide-react';
import { useCart, OrderRecord } from '@/context/CartContext';
import { formatCurrency, getProductVariationImage, getProductVariationColorHex } from '@/lib/utils';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';

// Safe Image Component for products in order preview
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  if (hasError || !imgSrc) {
    return (
      <div className="w-full h-full bg-stone-100 flex flex-col items-center justify-center p-1 text-center text-[#0D153A]">
        <ShoppingBag className="w-4 h-4 text-[#A80C14]" />
        <span className="text-[8px] font-bold mt-0.5 font-mono line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="60px"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

/* Status → semantic color pill */
function statusPillClass(status: string) {
  switch (status) {
    case 'Completed':
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Shipped':
    case 'Out for Delivery':
    case 'Ready for Shipment':
    case 'Packed':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Confirmed':
    case 'Processing':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Pending':
    case 'Payment Pending':
    case 'Refund Processing':
    case 'Return Requested':
    case 'On Hold':
    case 'Quality Checked':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Cancelled':
    case 'Payment Failed':
    case 'Failed Delivery':
    case 'Failed':
      return 'bg-[#FDF2F3] text-[#A80C14] border-[#F8D2D5]';
    case 'Returned':
    case 'Refunded':
      return 'bg-stone-100 text-stone-700 border-stone-300';
    default:
      return 'bg-stone-100 text-stone-800 border-stone-300';
  }
}

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id') || '';
  const phoneParam = searchParams.get('phone') || '';

  const { getOrderById, getOrdersByPhone, orders } = useCart();

  const [inputQuery, setInputQuery] = useState(idParam || phoneParam || '');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | undefined>(undefined);
  const [searched, setSearched] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const qId = (idParam || phoneParam || '').trim();

    if (qId) {
      const found = getOrderById(qId);

      if (found) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveOrder(found);
        setSearched(true);
      } else {
        // Fetch from API strictly by Order ID / Tracking Number
        fetch(`/api/orders?query=${encodeURIComponent(qId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
              setActiveOrder(data.orders[0]);
            } else {
              setActiveOrder(undefined);
            }
            setSearched(true);
          })
          .catch(() => {
            setActiveOrder(undefined);
            setSearched(true);
          });
      }
    } else {
      setActiveOrder(undefined);
      setSearched(false);
    }
  }, [idParam, phoneParam, orders, getOrderById]);

  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputQuery.trim();
    if (!query) {
      setActiveOrder(undefined);
      setSearched(false);
      return;
    }

    const localFound = getOrderById(query);

    if (localFound) {
      setActiveOrder(localFound);
      setSearched(true);
      return;
    }

    // Remote search via API strictly by Order ID / Tracking Number
    setIsSearchingApi(true);
    try {
      const res = await fetch(`/api/orders?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        setActiveOrder(data.orders[0]);
      } else {
        setActiveOrder(undefined);
      }
    } catch {
      setActiveOrder(undefined);
    } finally {
      setIsSearchingApi(false);
      setSearched(true);
    }
  };

  const handlePrintInvoice = () => {
    setShowReceipt(true);
  };

  const statusSteps = [
    { title: 'Pending', desc: 'Received & logged', icon: PackageCheck },
    { title: 'Confirmed', desc: 'Order confirmed', icon: CheckCircle2 },
    { title: 'Processing', desc: 'Packaging & fulfillment', icon: Clock },
    { title: 'Shipped', desc: 'Dispatched via courier', icon: Truck },
    { title: 'Out for Delivery', desc: 'Courier rider on the way', icon: MapPin },
    { title: 'Delivered', desc: 'Received at doorstep', icon: CheckCircle2 },
    { title: 'Completed', desc: 'Order completed', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: OrderRecord['status']) => {
    switch (status) {
      case 'Confirmed':
        return 1;
      case 'Processing':
      case 'Packed':
      case 'Ready for Shipment':
      case 'On Hold':
      case 'Quality Checked':
        return 2;
      case 'Shipped':
        return 3;
      case 'Out for Delivery':
        return 4;
      case 'Delivered':
        return 5;
      case 'Completed':
        return 6;
      default:
        return 0;
    }
  };

  const currentStep = activeOrder ? getStepIndex(activeOrder.status) : 0;
  const progressPercent = (currentStep / (statusSteps.length - 1)) * 100;

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-36 lg:pb-12 font-sans">

      {/* Navigation & Header Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/account')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#FDF2F3] border border-stone-200 hover:border-[#F8D2D5] text-[#0D153A] hover:text-[#A80C14] text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to</span> My Account
        </button>

        {activeOrder && (
          <button
            onClick={handlePrintInvoice}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A80C14] hover:bg-[#8C0A10] border border-[#A80C14] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-md shadow-[#A80C14]/25"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / Save Receipt</span>
            <span className="sm:hidden">Receipt</span>
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="relative bg-white border border-stone-200/80 p-5 sm:p-7 rounded-3xl shadow-sm overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#A80C14] via-[#E75A95] to-[#8C0A10]" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="min-w-0">
            <span className="px-3 py-1 bg-[#FDF2F3] text-[#A80C14] text-[10px] font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#F8D2D5]">
              <FileText className="w-3.5 h-3.5" /> Order Details & Receipt
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0D153A] mt-2 truncate">
              {activeOrder ? `Order #${activeOrder.id}` : 'Track Your Order'}
            </h1>
            {activeOrder ? (
              <p className="text-xs text-stone-500 mt-1">
                Placed on{' '}
                {new Date(activeOrder.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            ) : (
              <p className="text-xs text-stone-500 mt-1">
                Enter your Order ID or phone number to see live delivery status.
              </p>
            )}
          </div>

          {activeOrder && (
            <span
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wide border shrink-0 inline-flex items-center gap-1.5 ${statusPillClass(
                activeOrder.status
              )}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {activeOrder.status}
            </span>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="max-w-2xl mx-auto space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Enter Order ID or phone number…"
              aria-label="Order ID or phone number"
              className="w-full min-h-[48px] pl-11 pr-4 py-3 bg-white border border-stone-200 focus:border-[#A80C14] rounded-full text-sm text-[#0D153A] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A80C14]/20 shadow-xs transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#A80C14]" />
          </div>
          <button
            type="submit"
            disabled={isSearchingApi}
            className="min-h-[48px] px-8 bg-[#A80C14] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#8C0A10] transition-all shadow-md shadow-[#A80C14]/25 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isSearchingApi ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{isSearchingApi ? 'Searching...' : 'Track'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-stone-500 font-medium">
          <span>Enter your Order ID (e.g. FLK-1024) or the 11-digit phone number used at checkout</span>
        </div>
      </div>

      {/* Order Details Preview Display */}
      {activeOrder ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-7 shadow-sm space-y-6 sm:space-y-8">

          {/* Top Invoice Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Hash,
                label: 'Order Reference',
                value: `#${activeOrder.id}`,
                accent: true,
              },
              {
                icon: Calendar,
                label: 'Est. Delivery',
                value: activeOrder.estimatedDelivery || '2-3 Business Days',
              },
              {
                icon: Truck,
                label: 'Courier Tracking',
                value: activeOrder.trackingNumber || 'FLK-EXP-99',
              },
              {
                icon: Banknote,
                label: 'Total Amount',
                value: formatCurrency(activeOrder.total),
                accent: true,
              },
            ].map(({ icon: Icon, label, value, accent }) => (
              <div
                key={label}
                className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-1.5"
              >
                <span className="flex items-center gap-1.5 text-[10px] text-stone-400 uppercase font-bold tracking-wide">
                  <Icon className="w-3.5 h-3.5 text-[#A80C14]" /> {label}
                </span>
                <span
                  className={`font-mono font-extrabold text-xs sm:text-sm ${
                    accent ? 'text-[#A80C14]' : 'text-[#0D153A]'
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Interactive Logistics Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D153A] font-serif flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#A80C14]" />
                <span>Delivery Progress</span>
              </h3>
              <span className="text-[10px] font-bold text-[#A80C14] bg-[#FDF2F3] border border-[#F8D2D5] px-2.5 py-1 rounded-full">
                Step {currentStep + 1} of {statusSteps.length}
              </span>
            </div>

            {/* Desktop: connected horizontal stepper */}
            <div className="hidden sm:block">
              <div className="relative">
                <div className="absolute top-[22px] left-[8.33%] right-[8.33%] h-1 bg-stone-200 rounded-full" />
                <div
                  className="absolute top-[22px] left-[8.33%] h-1 bg-gradient-to-r from-[#A80C14] to-[#8C0A10] rounded-full transition-all duration-700"
                  style={{ width: `calc((100% - 16.66%) * ${progressPercent / 100})` }}
                />
                <div className="relative grid grid-cols-6 gap-2">
                  {statusSteps.map((step, idx) => {
                    const Icon = step.icon;
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={step.title} className="flex flex-col items-center gap-2 text-center">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-[#A80C14] text-white ring-4 ring-[#A80C14]/20 shadow-lg shadow-[#A80C14]/30 scale-110'
                              : isPassed
                                ? 'bg-[#A80C14]/90 text-white'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p
                            className={`font-bold text-[11px] leading-tight ${
                              isPassed ? 'text-[#0D153A]' : 'text-stone-400'
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-[9px] text-stone-400 leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="sm:hidden space-y-0">
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const isLast = idx === statusSteps.length - 1;

                return (
                  <div key={step.title} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCurrent
                            ? 'bg-[#A80C14] text-white ring-4 ring-[#A80C14]/20 shadow-md shadow-[#A80C14]/30'
                            : isPassed
                              ? 'bg-[#A80C14]/90 text-white'
                              : 'bg-stone-100 text-stone-400 border border-stone-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 min-h-[24px] ${
                            idx < currentStep ? 'bg-[#A80C14]' : 'bg-stone-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className={`pb-5 ${isLast ? 'pb-1' : ''}`}>
                      <p
                        className={`font-bold text-xs leading-tight pt-1.5 ${
                          isPassed ? 'text-[#0D153A]' : 'text-stone-400'
                        }`}
                      >
                        {step.title}
                        {isCurrent && (
                          <span className="ml-2 text-[9px] font-black uppercase tracking-wide text-[#A80C14] bg-[#FDF2F3] border border-[#F8D2D5] px-1.5 py-0.5 rounded-full align-middle">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-400 leading-tight mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Shipping & Payment Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consignee Address */}
            <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-2.5">
              <p className="font-bold text-[#0D153A] uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-stone-200 pb-2">
                <User className="w-3.5 h-3.5 text-[#A80C14]" />
                <span>Shipping Consignee</span>
              </p>
              <div className="space-y-1 text-xs text-stone-600">
                <p className="font-bold text-[#0D153A] text-sm">
                  {activeOrder.shippingAddress?.fullName || 'Valued Client'}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-[#A80C14]" />
                  {activeOrder.shippingAddress?.phone || 'N/A'}
                </p>
                <p>{activeOrder.shippingAddress?.street || 'Full Delivery Address'}</p>
                <p className="font-medium">
                  {activeOrder.shippingAddress?.city || 'Dhaka'},{' '}
                  {activeOrder.shippingAddress?.country || 'Bangladesh'}
                </p>
              </div>
            </div>

            {/* Payment & Invoice Summary */}
            <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-2.5">
              <p className="font-bold text-[#0D153A] uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-stone-200 pb-2">
                <CreditCard className="w-3.5 h-3.5 text-[#A80C14]" />
                <span>Payment Summary</span>
              </p>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between gap-2">
                  <span className="text-stone-400">Payment Method</span>
                  <span className="font-bold text-[#0D153A] text-right">
                    {activeOrder.paymentMethod || 'Cash on Delivery (COD)'}
                  </span>
                </div>

                {activeOrder.paymentMethod === 'bKash Send Money (Manual)' && (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">bKash Sender</span>
                      <span className="font-mono font-bold text-stone-700">
                        {activeOrder.paymentSenderNumber
                          ? `${activeOrder.paymentSenderNumber.substring(0, 3)}•••••${activeOrder.paymentSenderNumber.substring(8)}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">Transaction ID</span>
                      <span className="font-mono font-bold text-stone-700">
                        {activeOrder.paymentTrxId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-stone-400">Payment Status</span>
                      <span
                        className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded border ${
                          activeOrder.paymentStatus === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : activeOrder.paymentStatus === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}
                      >
                        {activeOrder.paymentStatus || 'Pending'}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span className="text-stone-400">Subtotal</span>
                  <span className="font-mono font-bold text-[#0D153A]">
                    {formatCurrency(activeOrder.subtotal || activeOrder.total)}
                  </span>
                </div>

                {activeOrder.discount !== undefined && activeOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>
                      {activeOrder.promoCode ? `Coupon ${activeOrder.promoCode}` : 'Promo Discount'}
                    </span>
                    <span className="font-mono">-{formatCurrency(activeOrder.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-stone-400">Delivery Charge</span>
                  <span className="font-mono text-[#0D153A] font-bold">
                    {activeOrder.shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold uppercase text-[10px]">
                        Free Delivery
                      </span>
                    ) : (
                      formatCurrency(activeOrder.shippingFee || 60)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 text-sm">
                  <span className="font-bold text-[#0D153A]">Total</span>
                  <span className="font-mono font-extrabold text-[#A80C14]">
                    {formatCurrency(activeOrder.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Products Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D153A] font-serif flex items-center justify-between">
              <span>Ordered Products ({activeOrder.items?.length || 0} items)</span>
              <span className="font-mono text-[10px] text-stone-400 font-normal normal-case">
                All items quality inspected
              </span>
            </h3>

            <div className="divide-y divide-stone-100 border border-stone-200/60 rounded-2xl overflow-hidden bg-white">
              {activeOrder.items?.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-stone-50 shrink-0 border border-stone-200/60">
                      <SafeImage
                        src={getProductVariationImage(item.product, item.selectedColor)}
                        alt={item.product?.name || 'Product'}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-[#0D153A] line-clamp-1">
                        {item.product?.name || 'Falak Closet Item'}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-400">
                        {item.selectedColor && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-stone-50 border border-stone-200/60 rounded font-medium">
                            {(() => {
                              const hex = getProductVariationColorHex(item.product, item.selectedColor);
                              return hex ? (
                                <span
                                  className="w-2 h-2 rounded-full border border-black/15 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: hex }}
                                />
                              ) : null;
                            })()}
                            Color: <strong className="text-[#0D153A]">{item.selectedColor}</strong>
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-50 border border-stone-200/60 rounded font-medium">
                            Size: <strong className="text-[#0D153A]">{item.selectedSize}</strong>
                          </span>
                        )}
                        <span className="font-mono text-stone-500 font-bold">
                          Qty: {item.quantity}
                        </span>
                      </div>

                      {activeOrder.status === 'Delivered' && item.product?.slug && (
                        <div className="pt-1">
                          <Link
                            href={`/product/${item.product.slug}?writeReview=true`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#A80C14] hover:bg-[#8C0A10] text-white text-[10px] font-bold rounded-lg transition-colors shadow-xs"
                          >
                            Write a Review
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono font-extrabold text-[#A80C14] text-xs sm:text-sm">
                    {formatCurrency((item.product?.price || 0) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3 bg-[#A80C14] hover:bg-[#8C0A10] text-white text-xs font-bold rounded-full text-center shadow-md shadow-[#A80C14]/25 transition-all inline-flex items-center justify-center gap-1.5"
            >
              Continue Shopping <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="w-full sm:w-auto px-6 py-3 bg-white border border-[#A80C14]/40 text-[#A80C14] hover:bg-[#FDF2F3] text-xs font-bold rounded-full text-center transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <Link
                href="/account"
                className="w-full sm:w-auto px-6 py-3 bg-white border border-stone-200 hover:border-[#F8D2D5] hover:text-[#A80C14] text-[#0D153A] text-xs font-bold rounded-full text-center transition-all"
              >
                My Orders Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : searched ? (
        /* Not Found */
        <div className="py-14 text-center bg-white rounded-3xl border border-stone-200/80 p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FDF2F3] border border-[#F8D2D5] flex items-center justify-center">
            <SearchX className="w-8 h-8 text-[#A80C14]" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#0D153A]">
            No order found matching &quot;{inputQuery}&quot;
          </h3>
          <div className="text-xs text-stone-500 max-w-sm mx-auto space-y-1">
            <p>• Double-check the Order ID from your confirmation message</p>
            <p>
              • Or try the phone number used at checkout — e.g.{' '}
              <strong className="text-[#A80C14] font-mono">01700000000</strong>
            </p>
            <p>
              • Sample format: <strong className="text-[#A80C14] font-mono">FLK-POS-56598</strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.length > 0 && (
            /* Recent local orders quick pick */
            <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-serif font-bold text-sm text-[#0D153A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A80C14]" /> Your Recent Orders
              </h3>
              <div className="flex flex-wrap gap-2">
                {orders.slice(0, 4).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setInputQuery(o.id);
                      setActiveOrder(o);
                      setSearched(true);
                    }}
                    className="px-4 py-2 bg-stone-50 hover:bg-[#FDF2F3] border border-stone-200 hover:border-[#F8D2D5] rounded-full text-[11px] font-mono font-bold text-stone-600 hover:text-[#A80C14] transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    #{o.id}
                    <span className="text-stone-400 font-sans">·</span>
                    <span className="font-sans">{formatCurrency(o.total)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clean Guidance Hero when no order is searched */}
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-stone-200/80 shadow-xs text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] flex items-center justify-center mx-auto">
              <Truck className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-serif font-bold text-lg text-[#0D153A]">
                Track Your Shipment & Order Status
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Enter your Order ID (from SMS confirmation) or your contact phone number in the search box above to view real-time delivery progress.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto pt-2">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-1">
                <span className="text-xs font-bold text-[#0D153A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Real-time Tracking
                </span>
                <p className="text-[11px] text-stone-500">Live courier tracking from confirmation to doorstep delivery.</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-1">
                <span className="text-xs font-bold text-[#0D153A] flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#A80C14]" /> Digital Invoice
                </span>
                <p className="text-[11px] text-stone-500">View and print official invoice receipt with QR verification.</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-1">
                <span className="text-xs font-bold text-[#0D153A] flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-amber-600" /> Parcel Inspection
                </span>
                <p className="text-[11px] text-stone-500">Inspect parcel at delivery before paying Cash on Delivery.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="p-5 sm:p-6 bg-white border border-stone-200/80 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FDF2F3] border border-[#F8D2D5] flex items-center justify-center shrink-0">
            <HelpCircle className="w-[22px] h-[22px] text-[#A80C14]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-[#0D153A]">
              Need assistance with this order?
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Our customer care team is available 24/7 for address changes, delivery tracking, and
              returns.
            </p>
          </div>
        </div>
        <Link
          href="/how-to-order"
          className="w-full sm:w-auto text-center px-6 py-3 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-full transition-all shadow-md shadow-[#A80C14]/25 shrink-0"
        >
          Contact Customer Care
        </Link>
      </div>
      {/* Printable receipt (portal modal) */}
      {showReceipt && activeOrder && (
        <ReceiptModal order={activeOrder} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

export default function TrackClient() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-stone-500">Loading order details preview…</div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
