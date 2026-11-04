'use client';

import React from 'react';
import Link from 'next/link';
import { SmartImage } from '@/components/ui/SmartImage';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Tag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency, getProductVariationImage, getProductVariationPrice } from '@/lib/utils';

export function CartDrawer() {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    freeShippingThreshold,
    freeShippingProgress,
    appliedCoupon,
    removePromoCode,
    discountAmount,
    shippingFee,
    totalAmount,
    quantityFreeDelivery,
    selectedZoneName,
    selectedZoneId,
    selectedSubAreaId,
    deliveryZones
  } = useCart();

  // Item selection state inside drawer
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(() => {
    return new Set(cart.map((item) => `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`));
  });

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

  if (!isCartDrawerOpen) return null;

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

  const selectedCart = cart.filter((item) =>
    selectedKeys.has(`${item.product?.id}-${item.selectedColor}-${item.selectedSize}`)
  );

  const selectedSubtotal = selectedCart.reduce(
    (sum, item) =>
      sum + getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity,
    0
  );

  const selectedDiscountAmount = appliedCoupon
    ? Math.min(
        appliedCoupon.discountType === 'percentage'
          ? Math.round((selectedSubtotal * appliedCoupon.discountValue) / 100)
          : appliedCoupon.discountValue,
        selectedSubtotal
      )
    : 0;

  // Zone charge for the currently selected delivery area — same source of truth
  // the checkout uses (the old 120 here silently disagreed with admin zone rates).
  const drawerZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const drawerSubArea = drawerZone?.subAreas?.find((s) => s.id === selectedSubAreaId);
  const zoneBaseFee = drawerSubArea?.charge ?? drawerZone?.charge ?? 60;

  const hasFreeThreshold =
    typeof freeShippingThreshold === 'number' &&
    freeShippingThreshold > 0 &&
    freeShippingThreshold < Infinity;

  const isFreeByThreshold = hasFreeThreshold && selectedSubtotal >= freeShippingThreshold;
  const isFreeDeliveryUnlocked = isFreeByThreshold || quantityFreeDelivery?.unlocked === true;

  const selectedShippingFee = selectedSubtotal === 0 || isFreeDeliveryUnlocked ? 0 : zoneBaseFee;
  const selectedTotalAmount = Math.max(0, selectedSubtotal - selectedDiscountAmount + selectedShippingFee);

  const remainingForFreeShipping = hasFreeThreshold ? Math.max(0, freeShippingThreshold - selectedSubtotal) : 0;
  const drawerProgress = isFreeDeliveryUnlocked
    ? 100
    : quantityFreeDelivery && quantityFreeDelivery.requiredQty > 0
    ? Math.min(100, (quantityFreeDelivery.currentQty / quantityFreeDelivery.requiredQty) * 100)
    : hasFreeThreshold && selectedSubtotal > 0
    ? Math.min(100, (selectedSubtotal / freeShippingThreshold) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-900 text-stone-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-serif font-bold text-lg text-amber-400">Shopping Cart</h2>
            <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
              {selectedCart.reduce((a, b) => a + b.quantity, 0)} of {cart.reduce((a, b) => a + b.quantity, 0)} selected
            </span>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        {(hasFreeThreshold || quantityFreeDelivery) && (
          <div className="bg-amber-50 dark:bg-stone-800/60 p-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {isFreeDeliveryUnlocked ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {quantityFreeDelivery?.unlocked
                      ? quantityFreeDelivery.isAnnouncementOffer
                        ? `🎉 Free Delivery unlocked for buying ${quantityFreeDelivery.requiredQty}+ ${quantityFreeDelivery.categoryName || 'Hijab'}s! 🚚`
                        : `🎉 Free Delivery unlocked via "${quantityFreeDelivery.productName}" Qty! 🚚`
                      : '🎉 You unlocked FREE Express Shipping!'}
                  </span>
                ) : (
                  <span>
                    {quantityFreeDelivery ? (
                      quantityFreeDelivery.isAnnouncementOffer ? (
                        <span>
                          Buy <strong className="text-[#A80C14] dark:text-[#F87171]">{Math.max(1, quantityFreeDelivery.requiredQty - quantityFreeDelivery.currentQty)}</strong> more {quantityFreeDelivery.categoryName || 'Hijab'}s for <strong className="text-emerald-600 dark:text-emerald-400 font-bold">FREE Delivery!</strong>
                        </span>
                      ) : (
                        <span>
                          Buy <strong className="text-[#A80C14]">{quantityFreeDelivery.requiredQty - quantityFreeDelivery.currentQty}</strong> more of <strong className="text-stone-900 dark:text-stone-100">"{quantityFreeDelivery.productName}"</strong> for FREE Delivery!
                        </span>
                      )
                    ) : (
                      <span>
                        Add <strong className="text-amber-700 dark:text-amber-400">{formatCurrency(remainingForFreeShipping)}</strong> more for FREE Shipping
                      </span>
                    )}
                  </span>
                )}
              </span>
              {(hasFreeThreshold || quantityFreeDelivery) && (
                <span className="text-[11px] text-stone-500 font-mono font-bold">
                  {isFreeDeliveryUnlocked ? '100%' : `${Math.round(drawerProgress)}%`}
                </span>
              )}
            </div>
            {(hasFreeThreshold || quantityFreeDelivery) && (
              <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${isFreeDeliveryUnlocked ? 100 : drawerProgress}%`
                  }}
                />
              </div>
            )}
            {selectedShippingFee > 0 && (
              <p className="text-[10px] text-stone-500 mt-1 font-sans">
                Delivery to {selectedZoneName}: ৳{selectedShippingFee} (final fee set at checkout)
              </p>
            )}
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-semibold text-stone-800 dark:text-stone-200">Your cart is empty</p>
                <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                  Explore our luxury abayas, silk hijabs, and modesty collections to add items to your cart.
                </p>
              </div>
              <Link
                href="/shop"
                onClick={() => setIsCartDrawerOpen(false)}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-amber-600 dark:hover:bg-amber-400 transition-colors shadow-md"
              >
                Browse Shop
              </Link>
            </div>
          ) : (
            cart.map((item, idx) => {
              const itemKey = `${item.product?.id}-${item.selectedColor}-${item.selectedSize}`;
              const isSelected = selectedKeys.has(itemKey);

              return (
                <div
                  key={`${itemKey}-${idx}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-stone-50 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-800'
                      : 'bg-stone-100/50 dark:bg-stone-900/50 border-stone-200/30 opacity-70'
                  }`}
                >
                  {/* Item Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectKey(itemKey)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer flex-shrink-0"
                    title="Select item"
                  />

                  {/* Product Thumbnail */}
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-stone-200">
                    <SmartImage
                      src={getProductVariationImage(item.product, item.selectedColor)}
                      alt={item.product?.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/product/${item.product?.slug}`}
                          onClick={() => setIsCartDrawerOpen(false)}
                          className="text-xs font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 line-clamp-1"
                        >
                          {item.product?.name}
                        </Link>
                        <button
                          onClick={() =>
                            removeFromCart(item.product?.id, item.selectedColor, item.selectedSize)
                          }
                          className="text-stone-400 hover:text-red-500 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Color: <strong className="text-stone-700 dark:text-stone-300">{item.selectedColor}</strong> | Size: <strong className="text-stone-700 dark:text-stone-300">{item.selectedSize}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200/40 dark:border-stone-700/40">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-md overflow-hidden bg-white dark:bg-stone-900">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product?.id,
                              item.selectedColor,
                              item.selectedSize,
                              item.quantity - 1
                            )
                          }
                          className="p-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-stone-900 dark:text-stone-100 min-w-[20px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product?.id,
                              item.selectedColor,
                              item.selectedSize,
                              item.quantity + 1
                            )
                          }
                          className="p-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(
                            getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Summary & Actions */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/80 space-y-3">
            {appliedCoupon && (
              <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-2 rounded-lg border border-emerald-200/50">
                <span className="flex items-center gap-1.5 font-bold uppercase">
                  🎟 {appliedCoupon.code} — −{formatCurrency(selectedDiscountAmount)}
                </span>
                <button
                  onClick={removePromoCode}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
              <div className="flex justify-between">
                <span>Subtotal ({selectedCart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">
                  {formatCurrency(selectedSubtotal)}
                </span>
              </div>
              {selectedDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span className="font-mono font-semibold">-{formatCurrency(selectedDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">
                  {selectedShippingFee === 0 ? <strong className="text-emerald-600 font-bold uppercase">Free</strong> : formatCurrency(selectedShippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-800">
                <span>Total</span>
                <span className="font-mono text-amber-700 dark:text-amber-400 text-base">
                  {formatCurrency(selectedTotalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/cart"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                View Full Cart
              </Link>
              {selectedCart.length > 0 ? (
                <Link
                  href="/checkout"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  <span>Checkout ({selectedCart.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full py-3 text-center text-[11px] font-bold text-stone-400 bg-stone-200 dark:bg-stone-800 rounded-xl cursor-not-allowed"
                >
                  Select Items
                </button>
              )}
            </div>

            <p className="text-[10px] text-stone-500 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> গেস্ট চেকআউট · একাউন্ট ছাড়াই সরাসরি অর্ডার করুন
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
