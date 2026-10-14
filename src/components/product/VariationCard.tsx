'use client';

import React from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import { ShoppingBag, Zap, Maximize2, XCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { Product } from '@/data/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export interface VariationDisplayItem {
  id: string;
  code: string;
  colorName: string;
  colorHex?: string;
  shortDetails?: string;
  size: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl: string;
}

interface VariationCardProps {
  item: VariationDisplayItem;
  product: Product;
  isSelected?: boolean;
  onSelect?: (item: VariationDisplayItem) => void;
  onAddToCart: (item: VariationDisplayItem) => void;
  onBuyNow: (item: VariationDisplayItem) => void;
  onOpenZoom: (item: VariationDisplayItem) => void;
}

export function VariationCard({
  item,
  product,
  isSelected,
  onSelect,
  onAddToCart,
  onBuyNow,
  onOpenZoom,
}: VariationCardProps) {
  const { cart, updateQuantity, removeFromCart } = useCart();

  const isOut = item.stock <= 0;

  // Find if this variation is already in the user's cart
  const cartItem = cart?.find(
    (c) =>
      c.product?.id === product.id &&
      c.selectedColor?.toLowerCase() === item.colorName.toLowerCase() &&
      (c.selectedSize || 'Free Size').toLowerCase() === (item.size || 'Free Size').toLowerCase()
  );

  const cartQuantity = cartItem ? cartItem.quantity : 0;

  return (
    <div
      onClick={() => onSelect?.(item)}
      className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer ${
        isSelected
          ? 'border-[#A80C14] ring-2 ring-[#A80C14]/25 shadow-md -translate-y-0.5'
          : 'border-stone-200/90 shadow-sm hover:shadow-xl hover:border-pink-300'
      }`}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
        <SmartImage
          src={item.imageUrl}
          alt={`${product.name} - ${item.colorName}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Selected or Select Indicator Badge */}
        {isSelected ? (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-[#A80C14] text-white text-[10px] font-bold shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Selected
          </span>
        ) : (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Select
          </span>
        )}

        {/* Zoom Modal Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenZoom(item);
          }}
          className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-90 opacity-90 group-hover:opacity-100 cursor-pointer z-10"
          title="Zoom variation image"
          aria-label="Zoom variation image"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Title & Color Swatch */}
          <div className="flex items-center gap-1.5 mb-1">
            {item.colorHex && (
              <span
                className="w-3 h-3 rounded-full border border-stone-300 shrink-0 shadow-2xs"
                style={{ backgroundColor: item.colorHex }}
                title={item.colorName}
              />
            )}
            <h3 className={`font-semibold text-xs sm:text-sm line-clamp-1 transition-colors ${
              isSelected ? 'text-[#A80C14]' : 'text-stone-900 group-hover:text-[#A80C14]'
            }`}>
              {item.colorName}
              {item.size && item.size !== 'Free Size' ? ` (${item.size})` : ''}
            </h3>
          </div>

          {/* Variation Short Details if present */}
          {item.shortDetails && (
            <p className="text-[11px] text-stone-500 line-clamp-1 mb-1 font-normal">
              {item.shortDetails}
            </p>
          )}

          {/* Stock Status & Price Row */}
          <div className="flex items-center justify-between gap-1 mt-1">
            {!isOut ? (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                Out of Stock
              </span>
            )}

            <span className="font-bold text-stone-900 text-xs sm:text-sm shrink-0">
              {formatCurrency(item.price)}
            </span>
          </div>
        </div>

        {/* Action Buttons & Quantity Controller */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between gap-1.5"
        >
          {cartQuantity > 0 ? (
            /* Full-width Quantity Controller (when item is in cart — hides Buy Now) */
            <div className="w-full flex items-center justify-between bg-[#FDF2F3] border border-[#F8D2D5] rounded-full px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  if (cartQuantity <= 1) {
                    removeFromCart(product.id, item.colorName, item.size);
                  } else {
                    updateQuantity(product.id, item.colorName, item.size, cartQuantity - 1);
                  }
                }}
                className="w-6 h-6 rounded-full bg-white text-[#A80C14] hover:bg-[#A80C14] hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
                title={cartQuantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                aria-label="Decrease quantity"
              >
                {cartQuantity === 1 ? (
                  <Trash2 className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
              </button>

              <span className="px-2 text-xs font-extrabold text-[#A80C14] font-mono min-w-[20px] text-center">
                {cartQuantity}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (cartQuantity < item.stock) {
                    updateQuantity(product.id, item.colorName, item.size, cartQuantity + 1);
                  }
                }}
                disabled={cartQuantity >= item.stock}
                className="w-6 h-6 rounded-full bg-white text-[#A80C14] hover:bg-[#A80C14] hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#A80C14] flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
                title="Increase quantity"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            /* Standard Add to Cart + Buy Now buttons (when item is NOT in cart) */
            <>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                disabled={isOut}
                className={`p-2 rounded-full transition-all duration-300 shadow-xs cursor-pointer active:scale-95 flex-shrink-0 ${isOut
                    ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    : 'bg-[#FDF2F3] border border-[#F8D2D5] hover:bg-[#A80C14] text-[#A80C14] hover:text-white'
                  }`}
                aria-label="Add to cart"
                title="Add to cart"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onBuyNow(item)}
                disabled={isOut}
                className={`flex-1 flex justify-center items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-xs transition-all duration-200 active:scale-95 cursor-pointer ${isOut
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-[#A80C14] hover:bg-[#8C0A10] text-white'
                  }`}
                aria-label="Buy Now"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Buy Now</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
