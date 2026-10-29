'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Star, Truck, Gift } from 'lucide-react';
import { Product, ProductColor } from '@/data/products';
import { formatCurrency, toBengaliNumber } from '@/lib/utils';

interface ProductSummarySidebarProps {
  product: Product;
  colorsList?: ProductColor[];
  ratingValue?: number;
  reviewsCount?: number;
  onJumpToReviews?: () => void;
}

// Fallback color hex mapping for common modest fashion color names
const COLOR_HEX_MAP: Record<string, string> = {
  'parrot green': '#4CAF50',
  'creamy golden': '#E6C280',
  'burnt terracotta': '#C85A32',
  'burnt orange': '#E65100',
  'white': '#FFFFFF',
  'pistachio': '#93C572',
  'yellow': '#FFEB3B',
  'cosmic orange': '#FF6F00',
  'powder blue': '#B0E0E6',
  'mint': '#98FF98',
  'black': '#1A1A1A',
  'butter scotch': '#E3A857',
  'red': '#E53935',
  'golden': '#FFD700',
  'pink': '#FF80AB',
  'dusty mint': '#80B3A0',
  'ash': '#B0BEC5',
  'dusty pink': '#D8A7B1',
  'denim blue': '#1565C0',
  'baby pink': '#F4C2C2',
  'mauve lavender': '#E1BEE7',
  'vanilla white': '#FDFBF7',
  'soft grey': '#D6D6D6',
  'blush mauve': '#C8A2C8',
  'cinnamon': '#D2691E',
  'skin': '#F5CBA7',
  'nude peach': '#FADBD8',
  'orchid': '#DA70D6',
  'french vanilla': '#F3E5AB',
  'mustard': '#E65100',
  'cool ash': '#90A4AE',
  'pearl white': '#F8F9FA',
  'smokey ash': '#607D8B',
  'off white': '#FAF9F6',
  'blush peach': '#FFDAB9',
  'mayonnaise': '#FEF9E7',
  'blue ash': '#78909C',
  'coral pink': '#FF6F61',
  'nude golden': '#E5C158',
  'candy pink': '#FF69B4',
};

function getColorBadgeStyles(hex?: string, name?: string) {
  let finalHex = hex;

  if ((!finalHex || finalHex === '#000000' || finalHex === '#000') && name) {
    const lower = name.toLowerCase().trim();
    if (COLOR_HEX_MAP[lower]) {
      finalHex = COLOR_HEX_MAP[lower];
    }
  }

  if (!finalHex || finalHex === '#000000' || finalHex === '#000') {
    finalHex = '#E5E7EB';
  }

  const cleanHex = finalHex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = brightness > 180;

  return {
    hex: finalHex,
    bg: finalHex,
    color: isLight ? '#1c1917' : '#ffffff',
    border: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
    dotBg: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.7)',
  };
}

export function ProductSummarySidebar({
  product,
  colorsList: customColors,
  ratingValue,
  reviewsCount,
  onJumpToReviews,
}: ProductSummarySidebarProps) {
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);

  // Derive color list from props or product with hex information
  const colors = useMemo(() => {
    if (customColors && customColors.length > 0) return customColors;
    if (product.colors && product.colors.length > 0) return product.colors;
    if (product.variations && product.variations.length > 0) {
      const map = new Map<string, string>();
      product.variations.forEach((v) => {
        if (!v.isHidden && !map.has(v.colorName)) {
          const hexFromColors = product.colors?.find(
            (c) => c.name.toLowerCase() === v.colorName.toLowerCase()
          )?.hex;
          map.set(v.colorName, v.colorHex || hexFromColors || COLOR_HEX_MAP[v.colorName.toLowerCase()] || '#000000');
        }
      });
      return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
    }
    return [{ name: 'Standard', hex: '#000000' }];
  }, [customColors, product]);

  const visibleColors = isColorsExpanded ? colors : colors.slice(0, 12);
  const hasMoreColors = colors.length > 12;

  // Derive size options list
  const sizes = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return ['Free Size'];
  }, [product]);

  // Derive usage / occasion list
  const usages = useMemo(() => {
    const list: string[] = [];
    if (product.occasion) list.push(product.occasion);
    if (product.workType && !list.includes(product.workType)) list.push(product.workType);
    if (list.length === 0) list.push('Regular Wear', 'Casual Wear');
    return list;
  }, [product]);

  const rating = ratingValue ?? product.rating ?? 5.0;
  const count = reviewsCount ?? product.reviewCount ?? 0;
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div className="space-y-2">
      {/* Header: PRODUCT DETAILS eyebrow & Code Badge */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm font-bold tracking-wider text-red-600 uppercase">
          PRODUCT DETAILS
        </span>
        {product.code && (
          <span className="bg-stone-200/90 text-stone-700 font-semibold px-3 py-1 text-xs sm:text-sm rounded-full shadow-2xs font-mono">
            Code: {product.code}
          </span>
        )}
      </div>

      {/* Product Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
        {product.name}
      </h1>

      {/* Rating & Reviews Row */}
      <button
        onClick={onJumpToReviews}
        className="flex items-center gap-2 cursor-pointer group/rating text-left"
      >
        <div className="flex text-amber-400 gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFull = star <= Math.floor(rating);
            const isHalf = !isFull && star - 0.5 <= rating;
            return (
              <Star
                key={star}
                className={`w-4 h-4 ${isFull
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-stone-300'
                  }`}
              />
            );
          })}
        </div>
        <span className="text-xs font-bold text-stone-800 font-mono">
          {rating.toFixed(1)} / 5.0
        </span>
        <span className="text-xs text-stone-500 font-medium group-hover/rating:text-pink-600 underline-offset-2 group-hover/rating:underline transition-colors">
          ({count} review{count === 1 ? '' : 's'})
        </span>
      </button>

      {/* Price & Discount */}
      <div className="flex flex-wrap items-baseline gap-3 pt-1">
        <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-sans tracking-tight">
          {formatCurrency(product.price)}
        </span>
        {product.originalPrice && product.originalPrice > product.price && (
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg text-stone-400 line-through font-medium">
              {formatCurrency(product.originalPrice)}
            </span>
            <span className="bg-[#A80C14]/10 text-[#A80C14] text-xs font-black px-2.5 py-0.5 rounded-md">
              SAVE {discountPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Free Delivery Offer Tag */}
      {product.freeDeliveryQuantity && product.freeDeliveryQuantity > 0 ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs">
          <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {product.freeDeliveryQuantity === 1
              ? '১টি কিনলেই ডেলিভারি ফ্রি!'
              : `যেকোনো ${toBengaliNumber(product.freeDeliveryQuantity)}টি কিনলেই ডেলিভারি সম্পূর্ণ ফ্রি!`}
          </span>
        </div>
      ) : null}

      {/* Combo Tier Discounts Offer Tag */}
      {product.tierDiscounts && product.tierDiscounts.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {product.tierDiscounts
            .filter((t) => t.minQuantity > 0 && t.discountAmount > 0)
            .sort((a, b) => a.minQuantity - b.minQuantity)
            .map((tier, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] text-xs font-bold shadow-2xs"
              >
                <Gift className="w-3.5 h-3.5 text-[#A80C14] shrink-0" />
                <span>{toBengaliNumber(tier.minQuantity)}টি কিনলে {toBengaliNumber(tier.discountAmount)}৳ ছাড়!</span>
              </div>
            ))}
        </div>
      )}

      {/* SUMMARY Section */}
      <div className="pt-4 border-t border-stone-200/80 space-y-5">
        <h2 className="text-xs sm:text-sm font-bold tracking-widest text-stone-500 uppercase">
          SUMMARY
        </h2>

        {/* Colors Row with Dynamic Color Badges */}
        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-semibold text-stone-600 w-24 shrink-0 pt-1">
            Colors
          </span>
          <div className="flex flex-wrap gap-2 flex-1 items-center">
            {visibleColors.map((col) => {
              const badge = getColorBadgeStyles(col.hex, col.name);
              return (
                <span
                  key={col.name}
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    borderColor: badge.border,
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border shadow-2xs transition-transform hover:scale-105 cursor-default"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: badge.dotBg }}
                  />
                  <span>{col.name}</span>
                </span>
              );
            })}

            {hasMoreColors && (
              <button
                type="button"
                onClick={() => setIsColorsExpanded((prev) => !prev)}
                className="bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] hover:bg-[#A80C14] hover:text-white px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                {isColorsExpanded ? 'Show less' : `Show more (+${colors.length - 12})`}
              </button>
            )}
          </div>
        </div>

        {/* Material Row */}
        {product.material && (
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm font-semibold text-stone-600 w-24 shrink-0 pt-1">
              Material
            </span>
            <div className="flex flex-wrap gap-2 flex-1">
              <span className="bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] px-3.5 py-1 rounded-full text-xs font-bold cursor-default shadow-2xs">
                {product.material}
              </span>
            </div>
          </div>
        )}

        {/* Size Row */}
        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-semibold text-stone-600 w-24 shrink-0 pt-1">
            Size
          </span>
          <div className="flex flex-wrap gap-2 flex-1">
            {sizes.map((sz) => (
              <span
                key={sz}
                className="bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] px-3.5 py-1 rounded-full text-xs font-bold cursor-default shadow-2xs"
              >
                {sz}
              </span>
            ))}
          </div>
        </div>

        {/* Usages Row */}
        {usages.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm font-semibold text-stone-600 w-24 shrink-0 pt-1">
              Usages
            </span>
            <div className="flex flex-wrap gap-2 flex-1">
              {usages.map((u) => (
                <span
                  key={u}
                  className="bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] px-3.5 py-1 rounded-full text-xs font-bold cursor-default shadow-2xs"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
