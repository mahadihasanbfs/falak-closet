'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Truck,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  MapPin
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency, getProductVariationImage, getProductVariationPrice, getProductVariationColorHex } from '@/lib/utils';

export default function CartClient() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    appliedCoupon,
    applyPromoCode,
    removePromoCode,
    promoNotice,
    discountAmount,
    shippingFee,
    totalAmount,
    freeShippingThreshold,
    freeShippingProgress,
    quantityFreeDelivery,
    selectedZoneName
  } = useCart();

  // Item selection state for cart checkout
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    return new Set(cart.map((item) => `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`));
  });

  // Sync selected keys when cart items change
  React.useEffect(() => {
    setSelectedKeys((prev) => {
      const next = new Set<string>();
      cart.forEach((item) => {
        const key = `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`;
        if (prev.has(key) || prev.size === 0) {
          next.add(key);
        }
      });
      return next.size > 0 ? next : new Set(cart.map((item) => `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`));
    });
  }, [cart]);

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allKeys = cart.map((item) => `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`);
    if (selectedKeys.size === allKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  // Promo Form Input
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim() || isValidatingPromo) return;

    setIsValidatingPromo(true);
    setPromoMessage(null);

    const res = await applyPromoCode(promoCodeInput.trim());
    if (res.success) {
      setPromoMessage({ type: 'success', text: res.message });
      setPromoCodeInput('');
    } else {
      setPromoMessage({ type: 'error', text: res.message });
    }
    setIsValidatingPromo(false);
  };

  // Calculate totals for selected items
  const selectedCartItems = cart.filter((item) =>
    selectedKeys.has(`${item.product?.id}-${item.selectedColor}-${item.selectedSize}`)
  );

  const selectedSubtotal = selectedCartItems.reduce(
    (sum, item) =>
      sum + getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity,
    0
  );

  const selectedCount = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="bg-white rounded-3xl border border-[#F8D2D5] p-8 sm:p-12 shadow-xs space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FDF2F3] border-2 border-[#F8D2D5] rounded-full flex items-center justify-center mx-auto text-[#A80C14] shadow-inner">
            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-[#FDF2F3] text-[#A80C14] text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#F8D2D5]">
              <Sparkles className="w-3.5 h-3.5" /> Empty Cart
            </span>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Your Shopping Cart is Empty
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
              Explore our latest collection of luxury abayas, handcrafted hijabs, and elegant modest fashion creations.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-[#A80C14] to-[#8C0A10] hover:from-[#8C0A10] hover:to-[#70080C] text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md shadow-[#A80C14]/20 transition-all hover:shadow-lg hover:shadow-[#A80C14]/30 active:scale-[0.98]"
            >
              <span>Discover Haute Couture</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-28 lg:pb-12 text-stone-900">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#F8D2D5] pb-5 sm:pb-6 gap-4">
        <div className="space-y-1">
          <span className="px-3 py-1 bg-[#FDF2F3] text-[#A80C14] text-[11px] sm:text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#F8D2D5]">
            <ShoppingBag className="w-3.5 h-3.5" /> Shopping Bag
          </span>
          <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight">
            Your Cart <span className="text-[#A80C14]">({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Selected <strong className="text-stone-900 font-mono">{selectedCount}</strong> items for express checkout
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 px-3.5 py-2 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Cart
        </button>
      </div>

      {/* Free Shipping Progress Indicator */}
      {((freeShippingThreshold > 0 && freeShippingThreshold < Infinity) || quantityFreeDelivery) && (
        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#F8D2D5] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm font-bold">
            <span className="flex items-start sm:items-center gap-2 text-stone-900 leading-snug">
              <span className="p-1.5 bg-[#FDF2F3] text-[#A80C14] rounded-full border border-[#F8D2D5] shrink-0 mt-0.5 sm:mt-0">
                <Truck className="w-4 h-4" />
              </span>
              {freeShippingProgress >= 100 || quantityFreeDelivery?.unlocked ? (
                <strong className="text-emerald-700 font-semibold">
                  {quantityFreeDelivery?.unlocked
                    ? `Congratulations! You unlocked FREE Delivery via "${quantityFreeDelivery.productName}" Qty! 🚚`
                    : 'Congratulations! You unlocked FREE Nationwide Delivery! 🎉'}
                </strong>
              ) : (
                <span>
                  {quantityFreeDelivery ? (
                    <span>
                      Buy <strong className="text-[#A80C14] font-mono text-sm">{quantityFreeDelivery.requiredQty - quantityFreeDelivery.currentQty}</strong> more of <strong className="text-stone-900">"{quantityFreeDelivery.productName}"</strong> for FREE Delivery!
                    </span>
                  ) : (
                    <span>Add <strong className="text-[#A80C14] font-mono text-sm">{formatCurrency(freeShippingThreshold - subtotal)}</strong> more for FREE Shipping!</span>
                  )}
                </span>
              )}
            </span>
            {freeShippingThreshold > 0 && freeShippingThreshold < Infinity && (
              <span className="self-end sm:self-auto font-mono text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full shrink-0">
                {freeShippingProgress >= 100 || quantityFreeDelivery?.unlocked
                  ? '100%'
                  : `${Math.round(freeShippingProgress)}%`}
              </span>
            )}
          </div>

          {freeShippingThreshold > 0 && freeShippingThreshold < Infinity && (
            <div className="w-full h-2.5 bg-[#FDF2F3] rounded-full overflow-hidden border border-[#F8D2D5]/50 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#A80C14] via-[#D93843] to-[#F5C77E] transition-all duration-700 rounded-full shadow-xs"
                style={{
                  width: `${freeShippingProgress >= 100 || quantityFreeDelivery?.unlocked
                    ? 100
                    : Math.min(100, freeShippingProgress)
                    }%`
                }}
              />
            </div>
          )}

          {shippingFee > 0 && (
            <p className="text-[11px] text-stone-500 font-sans flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#A80C14] shrink-0" />
              <span>Delivery zone: <strong className="text-stone-800">{selectedZoneName}</strong> — ৳{shippingFee} (final fee set at checkout)</span>
            </p>
          )}
        </div>
      )}

      {/* Main Grid: Cart Items List + Order Summary Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Select All Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 bg-stone-50/90 rounded-2xl border border-stone-200/80 text-xs sm:text-sm">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800 hover:text-[#A80C14] transition-colors select-none">
              <input
                type="checkbox"
                checked={selectedKeys.size === cart.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 sm:w-4 sm:h-4 accent-[#A80C14] rounded cursor-pointer shrink-0"
              />
              <span>Select All Items ({cart.length})</span>
            </label>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-white border border-stone-200 text-stone-600 rounded-full">
              {selectedKeys.size} selected
            </span>
          </div>

          {/* Item Row Loop */}
          <div className="divide-y divide-[#F8D2D5] border border-[#F8D2D5] rounded-3xl overflow-hidden bg-white shadow-xs">
            {cart.map((item) => {
              const key = `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`;
              const isSelected = selectedKeys.has(key);
              const mainImage = getProductVariationImage(item.product, item.selectedColor);
              const unitPrice = getProductVariationPrice(item.product, item.selectedColor, item.selectedSize);
              const itemTotal = unitPrice * item.quantity;

              return (
                <div key={key} className="p-4 sm:p-5 transition-colors hover:bg-stone-50/40">
                  {/* Desktop Layout (sm and up) */}
                  <div className="hidden sm:flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectKey(key)}
                        className="w-4 h-4 accent-[#A80C14] rounded cursor-pointer shrink-0"
                      />

                      <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-[#F8D2D5] shadow-xs group">
                        <Image src={mainImage} alt={item.product?.name || 'Product'} fill sizes="96px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <Link href={`/product/${item.product?.slug || ''}`} className="font-bold text-stone-900 hover:text-[#A80C14] text-base line-clamp-1 transition-colors">
                          {item.product?.name}
                        </Link>
                        <p className="text-xs text-stone-400 font-mono">Code: {item.product?.code || 'FLK'}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          {item.selectedColor && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FDF2F3] text-[#A80C14] border border-[#F8D2D5] font-semibold rounded-full">
                              {(() => {
                                const hex = getProductVariationColorHex(item.product, item.selectedColor);
                                return hex ? (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0 shadow-2xs"
                                    style={{ backgroundColor: hex }}
                                  />
                                ) : null;
                              })()}
                              <span>Color: <span className="font-bold">{item.selectedColor}</span></span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="px-2.5 py-0.5 bg-[#FDF2F3] text-[#A80C14] border border-[#F8D2D5] font-semibold rounded-full">
                              Size: <span className="font-bold">{item.selectedSize}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Right Side: Price & Quantity Controls */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right space-y-0.5">
                        <div className="font-extrabold text-[#A80C14] text-lg font-mono">
                          {formatCurrency(itemTotal)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-stone-400 font-mono">
                            {formatCurrency(unitPrice)} × {item.quantity}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-stone-200 rounded-full overflow-hidden bg-stone-50/80 shadow-xs">
                          <button
                            onClick={() => updateQuantity(item.product?.id || '', item.selectedColor, item.selectedSize, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-stone-700 hover:bg-[#FDF2F3] hover:text-[#A80C14] transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold font-mono text-sm text-stone-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product?.id || '', item.selectedColor, item.selectedSize, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-stone-700 hover:bg-[#FDF2F3] hover:text-[#A80C14] transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product?.id || '', item.selectedColor, item.selectedSize)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout (< sm breakpoint) */}
                  <div className="block sm:hidden space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectKey(key)}
                        className="w-4 h-4 accent-[#A80C14] rounded cursor-pointer shrink-0 mt-1"
                      />

                      <div className="relative w-16 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-[#F8D2D5] shadow-xs">
                        <Image src={mainImage} alt={item.product?.name || 'Product'} fill sizes="64px" className="object-cover" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <Link href={`/product/${item.product?.slug || ''}`} className="font-bold text-stone-900 hover:text-[#A80C14] text-sm line-clamp-2 leading-snug">
                          {item.product?.name}
                        </Link>
                        <p className="text-[11px] text-stone-400 font-mono">Code: {item.product?.code || 'FLK'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                          {item.selectedColor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FDF2F3] text-[#A80C14] border border-[#F8D2D5] font-semibold rounded-full">
                              {(() => {
                                const hex = getProductVariationColorHex(item.product, item.selectedColor);
                                return hex ? (
                                  <span
                                    className="w-2 h-2 rounded-full border border-black/15 shrink-0 shadow-2xs"
                                    style={{ backgroundColor: hex }}
                                  />
                                ) : null;
                              })()}
                              <span>{item.selectedColor}</span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="px-2 py-0.5 bg-[#FDF2F3] text-[#A80C14] border border-[#F8D2D5] font-semibold rounded-full">
                              Size: {item.selectedSize}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Bottom Row Controls */}
                    <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-100 flex items-center justify-between gap-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-200 rounded-full overflow-hidden bg-white shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.product?.id || '', item.selectedColor, item.selectedSize, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-stone-700 active:bg-[#FDF2F3] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold font-mono text-xs text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product?.id || '', item.selectedColor, item.selectedSize, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-stone-700 active:bg-[#FDF2F3] transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Price & Delete Button */}
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#A80C14] text-base font-mono">
                          {formatCurrency(itemTotal)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product?.id || '', item.selectedColor, item.selectedSize)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 active:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Order Summary Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-[#F8D2D5] shadow-xs space-y-5 sm:space-y-6 lg:sticky lg:top-24">
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider text-stone-900 border-b border-[#F8D2D5] pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-stone-500 normal-case">({selectedCount} selected)</span>
            </h3>

            {/* Promo Code Form */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#A80C14]" /> Promo Voucher Code
              </label>

              {appliedCoupon ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-mono font-bold text-emerald-900 uppercase flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> {appliedCoupon.code}
                    </span>
                    <p className="text-[11px] text-emerald-700">Saved {formatCurrency(discountAmount)}</p>
                  </div>
                  <button onClick={removePromoCode} className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline shrink-0 ml-2 cursor-pointer">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="Enter code (e.g. FALAK10)"
                    className="flex-1 px-4 py-2.5 bg-stone-50 border border-[#F8D2D5] rounded-full text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#A80C14]/20 focus:border-[#A80C14] transition-all min-w-0 placeholder:text-stone-400 placeholder:font-sans placeholder:normal-case"
                  />
                  <button
                    type="submit"
                    disabled={isValidatingPromo || !promoCodeInput.trim()}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs active:scale-95"
                  >
                    {isValidatingPromo ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}

              {promoMessage && (
                <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${promoMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-[#A80C14]'}`}>
                  {promoMessage.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-[#A80C14] shrink-0" />}
                  <span>{promoMessage.text}</span>
                </div>
              )}

              {promoNotice && (
                <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{promoNotice}</span>
                </p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-xs sm:text-sm text-stone-600 border-t border-[#F8D2D5] pt-4">
              <div className="flex justify-between items-center">
                <span>Selected Subtotal:</span>
                <span className="font-mono font-bold text-stone-900">{formatCurrency(selectedSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>Discount ({appliedCoupon?.code || 'Applied'}):</span>
                  <span className="font-mono font-bold">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Nationwide Shipping:</span>
                <span className="font-mono font-bold text-stone-900">
                  {shippingFee === 0 ? <strong className="text-emerald-700 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs">FREE</strong> : formatCurrency(shippingFee)}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-[#F8D2D5] pt-3.5 text-base sm:text-lg font-extrabold text-stone-900">
                <span>Total Amount:</span>
                <span className="font-mono text-[#A80C14]">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Desktop Checkout Action */}
            <Link
              href="/checkout"
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[#A80C14] to-[#8C0A10] hover:from-[#8C0A10] hover:to-[#70080C] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md shadow-[#A80C14]/20 hover:shadow-lg hover:shadow-[#A80C14]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Express Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="p-3.5 bg-[#FDF2F3] border border-[#F8D2D5] rounded-2xl text-xs text-stone-600 space-y-1.5">
              <p className="flex items-center gap-1.5 font-bold text-stone-800">
                <ShieldCheck className="w-4 h-4 text-[#A80C14]" /> Safe & Secure Checkout Guarantee
              </p>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Cash on Delivery (COD), bKash, and Mobile Banking accepted across Bangladesh.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bottom Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F8D2D5] p-3 sm:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
            Total ({selectedCount} {selectedCount === 1 ? 'item' : 'items'})
          </span>
          <div className="font-mono font-extrabold text-base sm:text-lg text-[#A80C14]">
            {formatCurrency(totalAmount)}
          </div>
        </div>

        <Link
          href="/checkout"
          className="px-6 py-3 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <span>Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

