'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Product } from '@/data/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useRouter } from 'next/navigation';
import { ProductZoomModal } from '@/components/product/ProductZoomModal';

interface ProductVariationsGridProps {
  product: Product;
}

import { VariationCard, VariationDisplayItem } from '@/components/product/VariationCard';

export type { VariationDisplayItem };

export function ProductVariationsGrid({ product }: ProductVariationsGridProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { trackEvent } = useAnalytics();

  const [searchQuery, setSearchQuery] = useState('');
  const [zoomModalState, setZoomModalState] = useState<{ isOpen: boolean; imageUrl: string; title: string }>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  const defaultImage = product.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80';

  // Extract all available variation items (strictly filtering hidden and removing duplicates)
  const variationItems = useMemo<VariationDisplayItem[]>(() => {
    // A. Use explicit variations if present
    if (product.variations && product.variations.length > 0) {
      const seenKeys = new Set<string>();
      const items: VariationDisplayItem[] = [];

      product?.variations?.forEach((v, idx) => {
        // Only storefront-visible variations (admin Eye toggle = isHidden !== true)
        if (v.isHidden) return;

        // Must have BOTH a color and a size (non-empty after trimming) —
        // incomplete variations are never shown in the grid.
        const colorNorm = (v.colorName || '').trim().toLowerCase();
        const sizeNorm = (v.size || '').trim().toLowerCase();
        if (!colorNorm || !sizeNorm) return;

        // Deduplicate by color+size (case/whitespace-insensitive, keep first)
        const uniqueKey = `${colorNorm}_${sizeNorm}`;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);

        // Find fallback image from product colors gallery or images list
        let img = v.imageUrl;
        const matchedColor = product.colors?.find(
          (c) => c.name.toLowerCase() === colorNorm
        );

        if (!img && matchedColor) {
          if (matchedColor.images && matchedColor.images.length > 0) {
            img = matchedColor.images[0];
          } else if (typeof matchedColor.imageIndex === 'number' && product.images?.[matchedColor.imageIndex]) {
            img = product.images[matchedColor.imageIndex];
          }
        }
        if (!img) {
          img = product.images?.[idx % (product.images.length || 1)] || defaultImage;
        }

        items.push({
          id: v.id || `${product.id}-${colorNorm}-${sizeNorm}`,
          code: '',
          colorName: v.colorName,
          colorHex: v.colorHex || matchedColor?.hex,
          shortDetails: v.shortDetails,
          size: v.size,
          price: v.price ?? v.priceOverride ?? product.price ?? 0,
          originalPrice: v.originalPrice ?? product.originalPrice,
          stock: v.stock ?? 0,
          imageUrl: img,
        });
      });

      if (items.length > 0) {
        return items;
      }
    }

    // B. Build virtual options from product.colors if no variations array (deduplicated)
    if (product.colors && product.colors.length > 0) {
      const defaultSize = product.sizes?.[0] || 'Free Size';
      const seenColors = new Set<string>();
      const items: VariationDisplayItem[] = [];

      product.colors.forEach((c, idx) => {
        const colorNorm = c.name.trim().toLowerCase();
        if (seenColors.has(colorNorm)) return;
        seenColors.add(colorNorm);

        let img = '';
        if (c.images && c.images.length > 0) {
          img = c.images[0];
        } else if (typeof c.imageIndex === 'number' && product.images?.[c.imageIndex]) {
          img = product.images[c.imageIndex];
        } else {
          img = product.images?.[idx % (product.images.length || 1)] || defaultImage;
        }

        const codeTag = `${product.code || 'VAR'}-C${idx + 1}`;

        items.push({
          id: `${product.id}-${c.name}`,
          code: codeTag,
          colorName: c.name,
          colorHex: c.hex,
          size: defaultSize,
          price: product.price ?? 0,
          originalPrice: product.originalPrice,
          stock: product.stock ?? 10,
          imageUrl: img,
        });
      });

      if (items.length > 0) {
        return items;
      }
    }

    // C. Single default variation fallback
    return [
      {
        id: product.id,
        code: product.code || 'STD',
        colorName: 'Standard',
        size: product.sizes?.[0] || 'Free Size',
        price: product.price ?? 0,
        originalPrice: product.originalPrice,
        stock: product.stock ?? 10,
        imageUrl: defaultImage,
      },
    ];
  }, [product, defaultImage]);

  // Filter variations by search query
  const filteredVariations = useMemo(() => {
    if (!searchQuery.trim()) return variationItems;
    const q = searchQuery.toLowerCase().trim();
    return variationItems.filter(
      (item) =>
        item.colorName.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        formatCurrency(item.price).toLowerCase().includes(q)
    );
  }, [variationItems, searchQuery]);

  const handleAddToCart = (item: VariationDisplayItem) => {
    if (item.stock <= 0) return;
    addToCart(product, item.colorName, item.size, 1);
    trackEvent('add_to_cart', {
      productId: product.id,
      productName: product.name,
      price: item.price,
      color: item.colorName,
      size: item.size,
      quantity: 1,
    });

    showToast({
      type: 'cart',
      title: 'Added to Cart',
      subtitle: `${product.name} - ${item.colorName} (${item.code})`,
      image: item.imageUrl,
      price: item.price,
      actionLink: '/cart',
      actionText: 'Checkout',
    });
  };

  const handleBuyNow = (item: VariationDisplayItem) => {
    if (item.stock <= 0) return;
    trackEvent('begin_checkout', {
      source: 'variation_buy_now',
      productId: product.id,
      price: item.price,
      color: item.colorName,
      size: item.size,
    });
    const params = new URLSearchParams({
      buyNow: product.id,
      color: item.colorName,
      size: item.size,
      qty: '1',
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const handleOpenZoom = (item: VariationDisplayItem) => {
    setZoomModalState({
      isOpen: true,
      imageUrl: item.imageUrl,
      title: `${product.name} - ${item.colorName} (${item.code})`,
    });
  };

  return (
    <section className="w-full max-w-7xl mx-auto  py-10 sm:py-14 border-t border-stone-200/80">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-pink-600">
            {filteredVariations.length}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Available Options
          </h2>
        </div>

        {/* Search filter input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search option or color..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all text-stone-800 placeholder-stone-400 shadow-sm"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Grid of variation cards */}
      {filteredVariations.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl p-10 text-center border border-dashed border-stone-200">
          <p className="text-stone-500 text-sm">No options match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-semibold text-pink-600 hover:underline"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {filteredVariations.map((item) => (
            <VariationCard
              key={item.id}
              item={item}
              product={product}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onOpenZoom={handleOpenZoom}
            />
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      <ProductZoomModal
        isOpen={zoomModalState.isOpen}
        onClose={() => setZoomModalState((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={zoomModalState.imageUrl}
        title={zoomModalState.title}
      />
    </section>
  );
}
