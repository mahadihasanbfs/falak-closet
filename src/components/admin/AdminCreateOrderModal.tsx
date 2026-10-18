'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Tag,
  CheckCircle2,
  Search,
  Printer,
  Sparkles,
  Zap,
  Check,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/data/products';
import { CartItem, OrderRecord } from '@/context/CartContext';
import { formatCurrency, getProductVariationPrice, getProductVariationImage, getProductVariationColorHex } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface AdminCreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: OrderRecord) => void;
  productsList?: Product[];
}

export function AdminCreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  // Empty, not the seed array: a POS that can ring up demo products would create
  // real orders for items the store does not stock.
  productsList = []
}: AdminCreateOrderModalProps) {
  const { showToast } = useToast();
  // POS Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Customer Details State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('Dhaka');
  const [customerAddress, setCustomerAddress] = useState('');

  // Selected Product Variation Modal State
  const [activeProductForVariation, setActiveProductForVariation] = useState<Product | null>(null);
  const [varColor, setVarColor] = useState<string>('');
  const [varSize, setVarSize] = useState<string>('');

  // Order Items Ticket State
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  // Financials & Settings
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(120);
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Express (2-3 Days)');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');
  const [orderStatus, setOrderStatus] = useState<OrderRecord['status']>('Processing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Extract color name helper
  const getColorName = (c: any): string => {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && c.name) return c.name;
    return 'Default';
  };

  // The modal stays mounted while closed, so a failure from the previous ticket
  // would still be on screen when the operator opens it for the next customer.
  useEffect(() => {
    if (isOpen) setSubmitError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter products by category and search query. Chips come from the catalog
  // in hand — a hardcoded list hid every product in a newly added category.
  const categories = ['All', ...Array.from(new Set(productsList.map((p) => p.category).filter(Boolean)))];
  const filteredProducts = productsList.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = (p.code || '').toLowerCase().includes(q);
      const matchMat = (p.material || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchMat) return false;
    }
    return true;
  });

  // Open variation picker for a product card
  const handleOpenVariationPicker = (product: Product) => {
    setActiveProductForVariation(product);
    if (product.colors && product.colors.length > 0) {
      setVarColor(getColorName(product.colors[0]));
    } else {
      setVarColor('Default');
    }
    if (product.sizes && product.sizes.length > 0) {
      setVarSize(product.sizes[0]);
    } else {
      setVarSize('Free Size');
    }
  };

  // Add product item to POS Ticket
  const handleAddProductToTicket = (product: Product, color: string, size: string) => {
    const newItem: CartItem = {
      product,
      selectedColor: color || 'Default',
      selectedSize: size || 'Free Size',
      quantity: 1
    };

    setOrderItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.product.id === newItem.product.id &&
          i.selectedColor === newItem.selectedColor &&
          i.selectedSize === newItem.selectedSize
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [newItem, ...prev];
    });

    setActiveProductForVariation(null);
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = orderItems.reduce(
    (sum, item) => sum + getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity,
    0
  );
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleSubmitPOSOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      showToast({
        type: 'info',
        title: 'Selection Required',
        subtitle: 'Please select at least one product item for the POS ticket.'
      });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast({
        type: 'info',
        title: 'Customer Details Required',
        subtitle: 'Customer Name and Phone Number are required for POS ticket.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `FLK-POS-${randomNum}`;
    const trackingNum = `TRK-POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPOSOrder: OrderRecord = {
      id: orderId,
      date: new Date().toISOString(),
      createdAt: Date.now(),
      items: orderItems,
      subtotal,
      discount: discountAmount,
      shippingFee,
      total: totalAmount,
      status: orderStatus,
      shippingAddress: {
        fullName: customerName.trim(),
        phone: customerPhone.trim(),
        district: customerDistrict,
        city: customerDistrict,
        fullAddress: customerAddress.trim() || `${customerDistrict}, Bangladesh`,
        street: customerAddress.trim()
      },
      deliveryMethod,
      paymentMethod,
      trackingNumber: trackingNum,
      estimatedDelivery: '2-3 Business Days'
    };

    // Save to Database API. The POS used to ignore the response and print a
    // receipt regardless — a ticket handed to a paying customer for an order
    // that was never stored.
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPOSOrder)
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        setSubmitError(body?.error || `Could not save the order (HTTP ${res.status}). Nothing was charged.`);
        setIsSubmitting(false);
        return;
      }

      // Hand back the stored record, so the receipt shows the persisted order.
      onOrderCreated({ ...newPOSOrder, ...body.order });
    } catch (err) {
      setSubmitError((err as Error).message || 'Network error — the order was not saved.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] bg-stone-900 text-stone-100 rounded-3xl shadow-2xl overflow-hidden border border-stone-800 flex flex-col">
        {/* POS Header Bar */}
        <div className="px-6 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 flex items-center justify-center font-bold shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base text-amber-400">FALAK CLOSET POS TERMINAL</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-500/30 uppercase">
                  LIVE SYSTEM
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Direct Order Billing & Instant Receipt Printer</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-stone-900 border border-stone-800 rounded-full text-stone-300">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Cashier: <strong className="text-white">Super Admin</strong></span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dual Panel Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT PANEL: Product Catalog Grid & Search (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-r border-stone-800 bg-stone-900/60 overflow-hidden">
            {/* Catalog Search & Category Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search catalog by product name, SKU code (e.g. FLK-101), fabric..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-400 text-stone-950 font-extrabold shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenVariationPicker(p)}
                  className="bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/50 p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden bg-stone-800 mb-2">
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-stone-900/90 text-amber-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-stone-800">
                      {p.code}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-stone-100 text-xs line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {formatCurrency(p.price)}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-stone-950 font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL: Live Order Ticket & Billing Summary (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-stone-950 overflow-hidden">
            <form onSubmit={handleSubmitPOSOrder} className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Customer Quick Input Bar */}
              <div className="p-3.5 bg-stone-900 border-b border-stone-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-400 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5 text-stone-200">
                    <User className="w-3.5 h-3.5 text-amber-400" /> Customer Information
                  </span>
                  <span className="font-mono text-stone-500">POS Ticket #FLK-POS</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone (017...) *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={customerDistrict}
                    onChange={(e) => setCustomerDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none"
                  >
                    {['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Street / Area Address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Order Ticket Items Manifest */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                {orderItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-stone-500 py-12">
                    <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center text-stone-600">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-300 text-xs">POS Ticket is empty</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Click any product from left catalog to add to ticket.</p>
                    </div>
                  </div>
                ) : (
                  orderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-stone-900 rounded-2xl border border-stone-800 flex items-center gap-3"
                    >
                      <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-stone-800 flex-shrink-0">
                        <Image
                          src={getProductVariationImage(item.product, item.selectedColor)}
                          alt={item.product?.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-100 text-xs line-clamp-1">{item.product?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.selectedColor && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-800 border border-stone-750 text-[10px] text-stone-200">
                              {(() => {
                                const hex = getProductVariationColorHex(item.product, item.selectedColor);
                                return hex ? (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                                    style={{ backgroundColor: hex }}
                                  />
                                ) : null;
                              })()}
                              <span>{item.selectedColor}</span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              | {item.selectedSize}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-amber-400 font-mono block mt-1">
                          {formatCurrency(getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity)}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-xs min-w-[18px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-stone-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* POS Discounts, Shipping & Billing Footer */}
              <div className="p-4 bg-stone-900 border-t border-stone-800 space-y-3">
                {/* Discount Presets */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold">
                    <span>Admin Discount</span>
                    <span className="font-mono text-emerald-400">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 100, 200, 500].map((disc) => (
                      <button
                        type="button"
                        key={disc}
                        onClick={() => setDiscountAmount(disc)}
                        className={`py-1 rounded-lg font-mono text-[11px] font-bold border transition-all ${
                          discountAmount === disc
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {disc === 0 ? 'No Disc' : `৳${disc}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Shipping Fee</label>
                    <select
                      value={shippingFee}
                      onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                    >
                      <option value={120}>Standard (৳120)</option>
                      <option value={150}>Same-Day Dhaka (৳150)</option>
                      <option value={0}>Free Delivery (৳0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none"
                    >
                      <option value="Cash on Delivery (COD)">Cash on Delivery</option>
                      <option value="Admin POS Cash">Admin POS Cash</option>
                      <option value="Bkash Direct Payment">Bkash Direct</option>
                      <option value="Bank Wire Transfer">Bank Wire</option>
                    </select>
                  </div>
                </div>

                {/* Grand Bill Net Total Display */}
                <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">NET PAYABLE TOTAL</span>
                    <span className="text-xs text-stone-400 font-mono">
                      Subtotal: {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-extrabold text-amber-400">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {/* Save failure — shown here rather than swallowed, since the
                    next thing this button does is print a customer invoice. */}
                {submitError && (
                  <div className="px-3 py-2.5 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-[11px] font-bold">
                    {submitError}
                  </div>
                )}

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || orderItems.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isSubmitting ? 'SAVING ORDER…' : 'PAY & PRINT INVOICE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Product Variation Selection Modal */}
      {activeProductForVariation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm max-h-[85vh] bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl text-stone-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 p-4 shrink-0">
              <h3 className="font-bold text-sm text-amber-400 line-clamp-1">{activeProductForVariation.name}</h3>
              <button
                onClick={() => setActiveProductForVariation(null)}
                className="p-1 text-stone-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Colors Picker */}
              {activeProductForVariation.colors && activeProductForVariation.colors.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-400">Select Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProductForVariation.colors.map((c, i) => {
                      const cName = getColorName(c);
                      return (
                        <button
                          type="button"
                          key={`${cName}-${i}`}
                          onClick={() => setVarColor(cName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            varColor === cName
                              ? 'bg-amber-400 text-stone-950 font-extrabold'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          {cName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes Picker */}
              {activeProductForVariation.sizes && activeProductForVariation.sizes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-400">Select Size</label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProductForVariation.sizes.map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setVarSize(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          varSize === s
                            ? 'bg-amber-400 text-stone-950 font-extrabold'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAddProductToTicket(activeProductForVariation, varColor, varSize)}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Add to POS Ticket ({formatCurrency(activeProductForVariation.price)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
