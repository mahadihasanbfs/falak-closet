'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  Heart,
  ShoppingBag,
  Zap,
  ChevronRight,
  Maximize2,
  Sparkles,
  Plus,
  Minus,
  ZoomIn,
  Truck,
  Check,
  X,
  Share2,
  Banknote,
  RefreshCcw,
  Shirt,
  Droplets,
  PhoneCall,
  AlertCircle,
  MapPin,
  Tag,
  PackageCheck,
  Info
} from 'lucide-react';
import { Product, ProductColor } from '@/data/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useToast } from '@/components/ui/Toast';
import { getProductSchema, getBreadcrumbSchema } from '@/lib/schema';
import { ProductZoomModal } from '@/components/product/ProductZoomModal';
import { ProductVariationsGrid } from '@/components/product/ProductVariationsGrid';
import { ProductSummarySidebar } from '@/components/product/ProductSummarySidebar';
import { ProductGallery } from '@/components/product/ProductGallery';
import { MobileProductBottomBar } from '@/components/product/MobileProductBottomBar';



export default function ProductDetailClient({ initialProduct }: { initialProduct: Product }) {
  const searchParams = useSearchParams();
  const colorQueryParam = searchParams.get('color');
  const sizeQueryParam = searchParams.get('size');
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist, products, user } = useCart();
  const { trackEvent } = useAnalytics();
  const { showToast } = useToast();

  // The server resolved this product (and 404'd if it did not exist), so it is
  // always the FULL document — description, features, reviews. Context copies
  // come from the slim card list (see serializeProductCard) and would lose the
  // Merge client context updates (e.g. admin toggling hidden/prices in real time) with initial product
  const product: Product = useMemo(() => {
    const found = products?.find((p) => p.id === initialProduct?.id || p.slug === initialProduct?.slug);
    return found ? { ...initialProduct, ...found } : initialProduct;
  }, [products, initialProduct]);

  // Selectable colors must come from VALID variations — storefront-visible,
  // with BOTH a color and a size — deduplicated (case/whitespace-insensitive).
  // A color that exists only in product.colors (no sellable variation) is never
  // selectable, otherwise size/price lookups and add-to-cart silently break.
  const colorsList = useMemo(() => {
    const validVars = (product?.variations || []).filter(
      (v) => !v.isHidden && (v.colorName || '').trim() !== '' && (v.size || '').trim() !== ''
    );

    if (validVars.length > 0) {
      const seen = new Set<string>();
      const list: ProductColor[] = [];
      for (const v of validVars) {
        const name = (v.colorName || '').trim();
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        // Carry gallery info over from product.colors when the name matches.
        const match = product?.colors?.find((c) => c.name.toLowerCase() === key);
        list.push({
          name,
          hex: match?.hex || v.colorHex || '#000000',
          ...(typeof match?.imageIndex === 'number' ? { imageIndex: match.imageIndex } : {}),
          ...(match?.images && match.images.length > 0 ? { images: match.images } : {}),
        });
      }
      return list;
    }

    // No valid variations — fall back to the declared colors (legacy behavior).
    if (!product?.colors || product.colors.length === 0) {
      return [{ name: 'Standard', hex: '#000000' }];
    }
    return product.colors;
  }, [product?.colors, product?.variations]);

  const imagesList = product?.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80'];

  const [selectedColor, setSelectedColor] = useState(() => {
    if (colorQueryParam && colorsList) {
      const colorObj = colorsList.find((c) => c.name.toLowerCase() === colorQueryParam.toLowerCase());
      if (colorObj) return colorObj.name;
      const matchedVar = product?.variations?.find((v) => !v.isHidden && v.colorName.toLowerCase() === colorQueryParam.toLowerCase());
      if (matchedVar) return matchedVar.colorName;
    }
    return colorsList[0]?.name || 'Standard';
  });

  const sizesList = useMemo(() => {
    if (product?.variations && product.variations.length > 0) {
      const varSizes = product.variations
        .filter((v) => !v.isHidden && v.colorName.toLowerCase() === selectedColor.toLowerCase())
        .map((v) => v.size)
        .filter(Boolean);
      return Array.from(new Set(varSizes));
    }
    return product?.sizes && product.sizes.length > 0 ? product.sizes : ['Free Size'];
  }, [product?.variations, product?.sizes, selectedColor]);

  const [selectedSize, setSelectedSize] = useState(() => {
    if (sizeQueryParam && sizesList.includes(sizeQueryParam)) {
      return sizeQueryParam;
    }
    return sizesList[0] || 'Free Size';
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Mouse Hover Image Zoom Lens State
  const [isHovering, setIsHovering] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  // Active Variation Price & Stock Lookup
  const activeVariation = product?.variations?.find(
    (v) => !v.isHidden && v.colorName.toLowerCase() === selectedColor.toLowerCase() && v.size === selectedSize
  ) || product?.variations?.find(
    (v) => v.colorName.toLowerCase() === selectedColor.toLowerCase() && v.size === selectedSize
  );

  const currentPrice = activeVariation?.price ?? activeVariation?.priceOverride ?? product?.price ?? 0;
  const currentStock = activeVariation?.stock ?? product?.stock ?? 10;
  const isOutOfStock = currentStock <= 0;

  // Per-size stock for the selected color (only when a variation matrix exists)
  const stockForSize = (colorName: string, size: string): number | undefined =>
    product?.variations?.find(
      (v) => !v.isHidden && v.colorName.toLowerCase() === colorName.toLowerCase() && v.size === size
    )?.stock;

  // Per-size price for the selected color
  const priceForSize = (colorName: string, size: string): number => {
    const v = product?.variations?.find(
      (varObj) => !varObj.isHidden && varObj.colorName.toLowerCase() === colorName.toLowerCase() && varObj.size === size
    );
    return v?.price ?? v?.priceOverride ?? product?.price ?? 0;
  };

  const ratingValue = product?.rating || 0;

  // 1. When user selects a color -> auto select corresponding product image
  const handleSelectColor = (colorName: string) => {
    setSelectedColor(colorName);

    let matchedImgIdx = -1;

    // A. Check variations matrix first for imageUrl match
    const matchedVar = product?.variations?.find(
      (v) => v.colorName.toLowerCase() === colorName.toLowerCase() && v.imageUrl
    );
    if (matchedVar && matchedVar.imageUrl) {
      matchedImgIdx = imagesList.findIndex((img) => img === matchedVar.imageUrl);
    }

    // B. Check colors list for imageIndex or images array
    if (matchedImgIdx === -1) {
      const colorObj = colorsList.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
      if (colorObj) {
        if (typeof colorObj.imageIndex === 'number' && imagesList[colorObj.imageIndex]) {
          matchedImgIdx = colorObj.imageIndex;
        } else if ((colorObj as { images?: string[] }).images && ((colorObj as { images?: string[] }).images?.length ?? 0) > 0) {
          const firstColorImg = (colorObj as { images?: string[] }).images?.[0];
          matchedImgIdx = imagesList.findIndex((img) => img === firstColorImg);
        }
      }
    }

    // C. Fallback: match by index order
    if (matchedImgIdx === -1) {
      const colorIdx = colorsList.findIndex((c) => c.name.toLowerCase() === colorName.toLowerCase());
      if (colorIdx !== -1 && imagesList[colorIdx]) {
        matchedImgIdx = colorIdx;
      }
    }

    if (matchedImgIdx !== -1) {
      setSelectedImageIndex(matchedImgIdx);
    }

    // Compute available sizes for the new color synchronously
    const newColorSizes = product?.variations && product.variations.length > 0
      ? Array.from(new Set(product.variations.filter((v) => !v.isHidden && v.colorName.toLowerCase() === colorName.toLowerCase()).map((v) => v.size).filter(Boolean)))
      : (product?.sizes && product.sizes.length > 0 ? product.sizes : ['Free Size']);

    let nextSize = selectedSize;
    if (newColorSizes.length > 0 && !newColorSizes.includes(selectedSize)) {
      nextSize = newColorSizes[0];
      setSelectedSize(nextSize);
    } else if (product?.variations?.length) {
      const selStock = stockForSize(colorName, selectedSize);
      if (selStock !== undefined && selStock <= 0) {
        const fallback = newColorSizes.find((s) => {
          const st = stockForSize(colorName, s);
          return st === undefined || st > 0;
        });
        if (fallback) {
          nextSize = fallback;
          setSelectedSize(fallback);
        }
      }
    }

    // Update URL parameter dynamically without full page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('color', colorName);
      if (nextSize) url.searchParams.set('size', nextSize);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSelectSize = (sz: string) => {
    setSelectedSize(sz);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('color', selectedColor);
      url.searchParams.set('size', sz);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // 2. When user selects/opens a different thumbnail image -> auto select corresponding color
  const handleSelectImageIndex = (imgIdx: number) => {
    setSelectedImageIndex(imgIdx);
    const targetImgUrl = imagesList[imgIdx];

    let matchedColorName: string | null = null;

    // A. Check variations matrix for matching imageUrl
    if (targetImgUrl && product?.variations) {
      const matchedVar = product.variations.find((v) => v.imageUrl === targetImgUrl);
      if (matchedVar && matchedVar.colorName) {
        matchedColorName = matchedVar.colorName;
      }
    }

    // B. Check colors list for matching imageIndex or images array
    if (!matchedColorName && colorsList) {
      const colorObj = colorsList.find((c) => {
        if (typeof c.imageIndex === 'number' && c.imageIndex === imgIdx) return true;
        if ((c as { images?: string[] }).images && Array.isArray((c as { images?: string[] }).images) && (c as { images?: string[] }).images?.includes(targetImgUrl)) return true;
        return false;
      });
      if (colorObj) {
        matchedColorName = colorObj.name;
      }
    }

    // C. Fallback: match by index if colorsList has an item at this index
    if (!matchedColorName && colorsList && colorsList[imgIdx]) {
      matchedColorName = colorsList[imgIdx].name;
    }

    if (matchedColorName) {
      setSelectedColor(matchedColorName);

      // Update URL parameter dynamically without full page reload
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('color', matchedColorName);
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  // Modals & UI States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);

  // Review Form State
  const [newReview, setNewReview] = useState({ author: '', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  // Storefront shows approved reviews only — pending ones wait in the admin queue.
  const [reviewsList, setReviewsList] = useState(
    (product?.reviewsList || []).filter((r) => (r.status ?? 'approved') === 'approved')
  );

  // Sync review author name when user profile is loaded from session
  useEffect(() => {
    if (user?.name) {
      Promise.resolve().then(() => {
        setNewReview((prev) => ({ ...prev, author: user.name }));
      });
    }
  }, [user]);

  // Lock body scroll while any owned modal is open
  useEffect(() => {
    const anyOpen = isWriteReviewOpen || isLightboxOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isWriteReviewOpen, isLightboxOpen]);

  // Escape closes owned modals (zoom modal handles its own)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWriteReviewOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReview) return;

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/products/${product?.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReview,
          email: user?.email || '',
          phone: user?.phone || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewError(data.error || 'Could not submit the review.');
        return;
      }
      setReviewSubmitted(true);
      setNewReview({ author: '', rating: 5, comment: '' });
      setTimeout(() => {
        setReviewSubmitted(false);
        setIsWriteReviewOpen(false);
      }, 2500);
    } catch {
      setReviewError('Network error — please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'specs' | 'care' | 'shipping' | 'reviews'>('specs');
  const tabsRef = useRef<HTMLDivElement>(null);

  const jumpToReviews = () => {
    setActiveTab('reviews');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Trigger Write Review Modal if query param is set
  const writeReviewParam = searchParams.get('writeReview');
  useEffect(() => {
    if (writeReviewParam === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('reviews');
      setIsWriteReviewOpen(true);
    }
  }, [writeReviewParam]);

  const isWishlisted = isInWishlist(product?.id || '');

  useEffect(() => {
    if (product) {
      trackEvent('view_item', {
        productId: product.id,
        productName: product.name,
        price: product.price,
        category: product.category
      });
    }
  }, [product, trackEvent]);

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, selectedColor, selectedSize, quantity);
    trackEvent('add_to_cart', {
      productId: product.id,
      productName: product.name,
      price: currentPrice,
      color: selectedColor,
      size: selectedSize,
      quantity
    });

    showToast({
      type: 'cart',
      title: 'Added to Cart',
      subtitle: `${product.name} (Code: ${product.code})`,
      image: imagesList[selectedImageIndex] || imagesList[0],
      price: currentPrice * quantity,
      actionLink: '/cart',
      actionText: 'Checkout'
    });
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;
    trackEvent('begin_checkout', {
      source: 'buy_now_button',
      productId: product.id,
      price: currentPrice * quantity
    });
    // Navigate with buyNow params — checkout uses ONLY this item, cart untouched.
    const params = new URLSearchParams({
      buyNow: product.id,
      color: selectedColor,
      size: selectedSize,
      qty: String(quantity),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined' || !product) return;
    const url = window.location.href;
    trackEvent('view_item', { source: 'share', productId: product.id, productName: product.name });

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `${product.name} — Falak Closet`, url });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast({
          type: 'info',
          title: 'Link Copied',
          subtitle: 'Share this design with your friends',
        });
      } catch {
        /* clipboard unavailable */
      }
    }
  };

  const productSchema = getProductSchema(product);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Shop', url: '/shop' },
    { name: product?.category || 'Category', url: `/shop?category=${encodeURIComponent(product?.category || '')}` },
    { name: product?.name || 'Product', url: `/product/${product?.slug || ''}` }
  ]);

  const isOneSize = sizesList.length === 1 && /free/i.test(String(sizesList[0]));

  const TABS: { id: typeof activeTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'specs', label: 'Specifications', icon: Sparkles },
    { id: 'care', label: 'Garment Care', icon: Droplets },
    { id: 'shipping', label: 'Shipping & Returns', icon: Truck },
    { id: 'reviews', label: `Reviews (${reviewsList.length})`, icon: Star }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8 sm:space-y-12 pb-44 lg:pb-12 text-stone-900">
      {/* Dynamic SEO Schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] sm:text-xs text-stone-500">
        <Link href="/" className="hover:text-[#A80C14] transition-colors shrink-0">Home</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link href="/shop" className="hover:text-[#A80C14] transition-colors shrink-0">Shop</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link
          href={`/shop?category=${encodeURIComponent(product?.category || '')}`}
          className="hover:text-[#A80C14] transition-colors truncate max-w-[100px] sm:max-w-none"
        >
          {product?.category}
        </Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-stone-900 font-semibold truncate max-w-[120px] sm:max-w-[200px]">
          {product?.name}
        </span>
      </nav>

      {/* Product Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
        {/* Left: Product Gallery */}
        <div className="lg:col-span-7">
          <ProductGallery
            product={product}
            imagesList={imagesList}
            colorsList={colorsList}
            selectedIndex={selectedImageIndex}
            onSelectImageIndex={handleSelectImageIndex}
          />
        </div>

        {/* Right: Summary Details Sidebar */}
        <div className="lg:col-span-5">
          <ProductSummarySidebar
            product={product}
            colorsList={colorsList}
            ratingValue={ratingValue}
            reviewsCount={reviewsList.length}
            onJumpToReviews={jumpToReviews}
          />
        </div>
      </div>


      {/* Product Variations Options Grid */}
      <ProductVariationsGrid product={product} />

      {/* Specification & Review Tabs */}
      <div ref={tabsRef} className="pt-6 sm:pt-8 border-t border-[#F8D2D5] space-y-5 sm:space-y-6 scroll-mt-20">
        <div
          className="flex gap-1 overflow-x-auto no-scrollbar flex-nowrap w-full border-b border-[#F8D2D5]"
          role="tablist"
          aria-label="Product information"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 pb-3 pt-1.5 px-3 sm:px-4 text-[11px] sm:text-sm font-bold border-b-2 -mb-px transition-all cursor-pointer ${isActive
                  ? 'border-[#A80C14] text-[#A80C14]'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'specs' && (
          <div role="tabpanel" className="p-4 sm:p-6 bg-white rounded-3xl border border-[#F8D2D5] space-y-4 text-xs sm:text-sm leading-relaxed">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#A80C14]" />
              <h3 className="font-bold text-base sm:text-lg text-[#A80C14]">Fabric &amp; Craftsmanship</h3>
            </div>
            <p className="text-stone-600">{product?.description || 'Luxury modest fashion item.'}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-stone-600 pt-1">
              {(product?.features || ['Premium tailoring', 'Soft luxury fabric']).map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* Quick attribute chips */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
              {[
                { label: 'Material', value: product?.material },
                { label: 'Work', value: product?.workType },
                { label: 'Occasion', value: product?.occasion },
                { label: 'Weather', value: product?.weather }
              ].filter((a) => a.value).map((attr) => (
                <span key={attr.label} className="px-3 py-1.5 rounded-full bg-[#FFF0F6] border border-[#F8D2D5] text-[10px] font-bold text-stone-600">
                  <span className="text-stone-400 uppercase tracking-wide mr-1">{attr.label}:</span> {attr.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'care' && (
          <div role="tabpanel" className="p-4 sm:p-6 bg-white rounded-3xl border border-[#F8D2D5] space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#A80C14]" />
              <h3 className="font-bold text-base sm:text-lg text-[#A80C14]">Garment Care Instructions</h3>
            </div>
            <ul className="space-y-2 text-stone-600">
              {(product?.careInstructions || ['Dry clean recommended', 'Steam iron low heat']).map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div role="tabpanel" className="p-4 sm:p-6 bg-white rounded-3xl border border-[#F8D2D5] space-y-6 text-xs sm:text-sm text-stone-700">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[#F8D2D5] pb-3">
              <Truck className="w-5 h-5 text-[#A80C14]" />
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#A80C14]">শিপিং ও ডেলিভারি পলিসি (Shipping & Delivery Terms)</h3>
                <p className="text-[11px] text-stone-500">আপনার অর্ডারটি নিরাপদে পৌঁছানোর জন্য অনুগ্রহ করে নিয়মগুলো একনজরে দেখে নিন</p>
              </div>
            </div>

            {/* Delivery Rates Grid */}
            <div>
              <h4 className="font-bold text-stone-900 mb-2.5 flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-[#A80C14]" />
                <span>ডেলিভারি চার্জ (Delivery Charges)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FFF0F6] border border-[#F8D2D5] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-800 text-xs sm:text-sm">ঢাকা শহর</p>
                    <p className="text-[11px] text-stone-500">সময়: ২-৩ দিন</p>
                  </div>
                  <span className="font-extrabold text-[#A80C14] text-base font-mono bg-white px-2.5 py-1 rounded-xl border border-[#F8D2D5]">৳৮০</span>
                </div>
                <div className="bg-[#FFF0F6] border border-[#F8D2D5] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-800 text-xs sm:text-sm">ঢাকার পার্শ্ববর্তী এলাকা</p>
                    <p className="text-[11px] text-stone-500">সময়: ২-৩ দিন</p>
                  </div>
                  <span className="font-extrabold text-[#A80C14] text-base font-mono bg-white px-2.5 py-1 rounded-xl border border-[#F8D2D5]">৳১০০</span>
                </div>
                <div className="bg-[#FFF0F6] border border-[#F8D2D5] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-800 text-xs sm:text-sm">ঢাকার বাহিরে</p>
                    <p className="text-[11px] text-stone-500">সময়: ২-৩ দিন</p>
                  </div>
                  <span className="font-extrabold text-[#A80C14] text-base font-mono bg-white px-2.5 py-1 rounded-xl border border-[#F8D2D5]">৳১৫০</span>
                </div>
              </div>
            </div>

            {/* Policy Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order & Confirmation */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs sm:text-sm">
                  <PhoneCall className="w-4 h-4 text-[#A80C14]" />
                  <span>অর্ডার কনফার্মেশন প্রক্রিয়া</span>
                </div>
                <ul className="space-y-2 text-stone-600 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>নাম, ফোন নম্বর ও পূর্ণাঙ্গ ঠিকানা দিয়ে অর্ডার কনফার্ম করুন।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>পেইজ থেকে কনফার্মেশন কল পাওয়ার পর পার্সেলটি পাঠানো হবে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>কল দিয়ে কনফার্ম করার পর অর্ডার বাতিল (Cancel) বা পরিবর্তন (Change) করা যাবে না।</span>
                  </li>
                </ul>
              </div>

              {/* COD Policy */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs sm:text-sm">
                  <Banknote className="w-4 h-4 text-[#A80C14]" />
                  <span>ক্যাশ অন ডেলিভারি শর্তাবলী</span>
                </div>
                <ul className="space-y-2 text-stone-600 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>পূর্ববর্তী ৮০% সফল ডেলিভারির রেকর্ড থাকলে ক্যাশ অন ডেলিভারি (COD) সুবিধা পাবেন।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>৮০% সফল ডেলিভারি রেকর্ড না থাকলে ডেলিভারি চার্জ অগ্রিম (Advance) প্রদান করতে হবে।</span>
                  </li>
                </ul>
              </div>

              {/* Delivery Inspection & Return */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs sm:text-sm">
                  <PackageCheck className="w-4 h-4 text-[#A80C14]" />
                  <span>পার্সেল চেক ও রিটার্ন নিয়মাবলী</span>
                </div>
                <ul className="space-y-2 text-stone-600 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>ডেলিভারি ম্যানের সামনে অবশ্যই পার্সেলটি চেক করে গ্রহণ করবেন।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCcw className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>রিটার্ন করতে চাইলে ডেলিভারি খরচ প্রদান করে সম্পূর্ণ পার্সেল রিটার্ন করতে হবে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>আমাদের পেইজ থেকে কোনো পার্শিয়াল (আংশিক) ডেলিভারি দেওয়া হয় না।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-3.5 h-3.5 text-[#A80C14] shrink-0 mt-0.5" />
                    <span>পার্সেল রিসিভ করার পর তা পুনরায় ফেরত (Return) নেওয়া হয় না।</span>
                  </li>
                </ul>
              </div>

              {/* Pricing & Display Notes */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <span>গুরুত্বপূর্ণ তথ্য (Important Notes)</span>
                </div>
                <ul className="space-y-2 text-amber-900/80 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 font-bold text-amber-800">🍂</span>
                    <span className="font-semibold text-amber-950">আমাদের সব পণ্যের দাম ফিক্সড (Fixed Price)।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>ক্যামেরা এবং মোবাইল/কম্পিউটার ডিসপ্লের ভিন্নতার কারণে মূল প্রোডাক্টের কালার সামান্য লাইট বা ডিপ দেখা যেতে পারে।</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (() => {
          const totalReviewsCount = reviewsList.length;
          const avgRatingVal = totalReviewsCount > 0
            ? Math.round((reviewsList.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount) * 10) / 10
            : 0;

          const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          reviewsList.forEach((r) => {
            const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 5 | 4 | 3 | 2 | 1;
            ratingCounts[rounded]++;
          });

          return (
            <div role="tabpanel" className="space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-base sm:text-lg text-stone-900">
                  Customer Ratings &amp; Feedback
                </h3>
                <button
                  onClick={() => setIsWriteReviewOpen(true)}
                  className="px-4 py-2.5 min-h-[40px] bg-[#A80C14] text-white font-bold text-xs rounded-full hover:bg-[#8C0A10] active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  Write a Review
                </button>
              </div>

              {/* Reviews Statistics Widget */}
              {totalReviewsCount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 sm:p-6 bg-stone-50 rounded-3xl border border-[#F8D2D5]/50">
                  {/* Left: Overall Rating */}
                  <div className="md:col-span-4 flex md:flex-col items-center justify-center text-center p-2 md:p-4 border-b md:border-b-0 md:border-r border-stone-200/60 gap-3 md:gap-0">
                    <div className="text-4xl sm:text-5xl font-black text-stone-900 font-mono">
                      {avgRatingVal.toFixed(1)}
                    </div>
                    <div className="flex text-amber-400 gap-0.5 md:mt-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFull = star <= Math.floor(avgRatingVal);
                        const isHalf = !isFull && star - 0.5 <= avgRatingVal;
                        return (
                          <Star
                            key={star}
                            className={`w-4 h-4 sm:w-5 sm:h-5 ${isFull
                              ? 'fill-amber-400 text-amber-400'
                              : isHalf
                                ? 'fill-amber-400/50 text-amber-400'
                                : 'text-stone-300'
                              }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-stone-500 font-medium md:mt-3">
                      Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'}
                    </p>
                    <p className="text-[11px] text-[#A80C14] font-bold md:mt-1">
                      100% Verified Purchases
                    </p>
                  </div>

                  {/* Right: Breakdown Progress Bars */}
                  <div className="md:col-span-8 flex flex-col justify-center space-y-2.5 px-0 md:px-4">
                    {([5, 4, 3, 2, 1] as const).map((stars) => {
                      const count = ratingCounts[stars];
                      const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 sm:gap-3 text-xs font-semibold text-stone-700">
                          <span className="w-10 text-right shrink-0">{stars} star</span>
                          <div className="flex-1 h-2.5 sm:h-3 bg-stone-200/70 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#A80C14] rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-14 text-left text-stone-500 font-mono text-[11px] shrink-0">
                            {Math.round(percentage)}% ({count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewsList.length === 0 && (
                <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-[#F8D2D5] text-center space-y-1.5">
                  <Star className="w-6 h-6 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-900">No reviews yet</p>
                  <p className="text-[11px] text-stone-500">Be the first to share your experience with this piece.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {reviewsList.map((rev) => (
                  <div key={rev.id} className="p-4 sm:p-5 bg-white rounded-2xl border border-[#F8D2D5] space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#FFF0F6] border border-[#F8D2D5] text-[#A80C14] font-black text-[11px] flex items-center justify-center shrink-0">
                          {rev.author.trim().charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className="font-bold text-stone-900 truncate">{rev.author}</span>
                        {rev.verifiedPurchase && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded shrink-0">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">{rev.date}</span>
                    </div>
                    <div className="flex text-amber-400 gap-0.5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-stone-600 italic leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>


      {/* Write a Review Modal — bottom sheet on mobile, centered dialog on desktop */}
      {isWriteReviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Write a review"
          onClick={(e) => e.target === e.currentTarget && setIsWriteReviewOpen(false)}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in mb-[calc(66px+env(safe-area-inset-bottom))] sm:mb-0">
            <div className="shrink-0 bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900">Write a Review</h3>
              <button
                onClick={() => setIsWriteReviewOpen(false)}
                className="p-2 -mr-2 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer active:scale-90"
                aria-label="Close review form"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {!user ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-[#FDF2F3] text-[#A80C14] rounded-full flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 fill-current" />
                  </div>
                  <h4 className="font-bold text-base text-stone-900 font-sans">Sign In Required</h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Only customers who have purchased and received delivery of this product can write a review. Please sign in to verify your purchase.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWriteReviewOpen(false)}
                      className="flex-1 py-3 min-h-[44px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Link
                      href="/account"
                      className="flex-1 py-3 min-h-[44px] bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-xl text-center transition-colors shadow-sm flex items-center justify-center"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="p-5 sm:p-6 space-y-4">
                  {reviewSubmitted ? (
                    <div className="py-8 text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-bold text-stone-900">Thank you for your review!</p>
                      <p className="text-xs text-stone-500">It will appear on this page after our team approves it.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="review-author" className="text-xs font-bold text-stone-700">Your Name *</label>
                        <input
                          id="review-author"
                          type="text"
                          required
                          maxLength={60}
                          value={newReview.author}
                          onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
                          placeholder="e.g. Ayesha R."
                          className="w-full px-4 py-3 min-h-[44px] bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-700">Your Rating *</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReview({ ...newReview, rating: star })}
                              aria-label={`${star} star${star > 1 ? 's' : ''}`}
                              className="p-1.5 -m-0.5 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${star <= newReview.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-300'
                                  }`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-xs font-bold text-stone-600 font-mono">{newReview.rating}/5</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="review-comment" className="text-xs font-bold text-stone-700">Your Review *</label>
                        <textarea
                          id="review-comment"
                          required
                          rows={4}
                          maxLength={1000}
                          value={newReview.comment}
                          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                          placeholder="How was the fabric, fit, and delivery experience?"
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14]"
                        />
                        <p className="text-[10px] text-stone-400 text-right">{newReview.comment.length}/1000</p>
                      </div>

                      {reviewError && (
                        <p className="text-[11px] font-bold text-rose-600" role="alert">{reviewError}</p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsWriteReviewOpen(false)}
                          className="px-4 py-3 min-h-[44px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="px-5 py-3 min-h-[44px] bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Zoom Modal */}
      <ProductZoomModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={imagesList[selectedImageIndex] || imagesList[0]}
        title={product?.name}
      />

      {/* Sticky Bottom Purchase Bar for Mobile */}
      <MobileProductBottomBar
        product={product}
        colorsList={colorsList}
        selectedColor={selectedColor}
        onSelectColor={handleSelectColor}
        sizesList={sizesList}
        selectedSize={selectedSize}
        onSelectSize={handleSelectSize}
        quantity={quantity}
        onQuantityChange={setQuantity}
        currentPrice={currentPrice}
        currentStock={currentStock}
        isOutOfStock={isOutOfStock}
        activeImage={imagesList[selectedImageIndex] || imagesList[0]}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        stockForSize={stockForSize}
      />
    </div>
  );
}
