'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SmartImage } from '@/components/ui/SmartImage';
import { Heart, ShoppingBag, Zap, Star, X } from 'lucide-react';
import { Product, type ProductColor } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useToast } from '@/components/ui/Toast';

interface ProductCardProps {
  product: Product;
  /** Pre-select a color (e.g. deep-linking from search results). */
  selectedColor?: string;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80';

/** Map a color onto the flat image list: explicit index first, then its own gallery. */
function resolveImageIndex(color: ProductColor | null, images: string[]): number {
  if (!color) return 0;
  if (typeof color.imageIndex === 'number' && images[color.imageIndex]) {
    return color.imageIndex;
  }
  if (color.images?.length && images.includes(color.images[0])) {
    return images.indexOf(color.images[0]);
  }
  return 0;
}

export function ProductCard({ product, selectedColor }: ProductCardProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist, isAuthenticated } = useCart();
  const { trackEvent } = useAnalytics();
  const { showToast } = useToast();
  const isWishlisted = isInWishlist(product?.id);

  const sizesList = product?.sizes && product.sizes.length > 0 ? product.sizes : ['Free Size'];

  // Find color object if matched or selected
  const initialColorObj = React.useMemo(() => {
    if (!product?.colors || product.colors.length === 0) return null;
    if (selectedColor) {
      const match = product.colors.find(
        (c) => c.name.toLowerCase() === selectedColor.toLowerCase()
      );
      if (match) return match;
    }
    return product.colors[0];
  }, [product, selectedColor]);

  const [activeColor, setActiveColor] = React.useState(initialColorObj);
  const [activeImageIndex, setActiveImageIndex] = React.useState<number>(() =>
    resolveImageIndex(initialColorObj, product?.images ?? [])
  );

  // Derived-state adjustment during render (no effect → no cascading renders):
  // when the incoming color changes — new product object or a deep-linked
  // selectedColor — re-sync the local selections from it.
  const [lastInitialColor, setLastInitialColor] = React.useState(initialColorObj);
  if (initialColorObj && lastInitialColor !== initialColorObj) {
    setLastInitialColor(initialColorObj);
    setActiveColor(initialColorObj);
    setActiveImageIndex(resolveImageIndex(initialColorObj, product?.images ?? []));
  }

  const currentImage = product?.images[activeImageIndex] || product?.images[0] || FALLBACK_IMAGE;

  const productUrl = activeColor
    ? `/product/${product?.slug}?color=${encodeURIComponent(activeColor.name)}`
    : `/product/${product?.slug}`;

  // Stock for the active color: variation matrix first (excluding hidden), then the flat product stock.
  const activeColorStock = activeColor && product?.variations?.length
    ? product.variations
      .filter((v) => !v.isHidden && v.colorName === activeColor.name)
      .reduce((sum, v) => sum + (v.stock ?? 0), 0)
    : (product?.stock ?? 10);
  const isSoldOut = activeColorStock <= 0;

  // Active variation resolution (first non-hidden variation for active color)
  const activeVariation = React.useMemo(() => {
    if (!product) return null;
    const visibleVars = (product.variations || []).filter((v) => !v.isHidden);
    if (visibleVars.length === 0) return null;

    if (activeColor) {
      const match = visibleVars.find(
        (v) => v.colorName.toLowerCase() === activeColor.name.toLowerCase()
      );
      if (match) return match;
    }
    return visibleVars[0];
  }, [product, activeColor]);

  // Derived price, original price, and discount percentage based on active variation
  const { currentPrice, currentOriginalPrice, discountPct } = React.useMemo(() => {
    if (!product) return { currentPrice: 0, currentOriginalPrice: 0, discountPct: 0 };

    const basePrice = product.price || 0;
    const baseOriginalPrice = product.originalPrice || 0;

    const price = activeVariation
      ? (activeVariation.price ?? activeVariation.priceOverride ?? basePrice)
      : basePrice;

    const originalPrice = activeVariation
      ? (activeVariation.originalPrice ?? baseOriginalPrice)
      : baseOriginalPrice;

    const pct =
      originalPrice > price && price > 0
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    return {
      currentPrice: price,
      currentOriginalPrice: originalPrice,
      discountPct: pct,
    };
  }, [product, activeVariation]);

  // Local state for Wishlist Toast, Auth Modal, and login forms
  const [showWishlistToast, setShowWishlistToast] = React.useState(false);
  const [wishlistToastText, setWishlistToastText] = React.useState('');
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = React.useState(false);
  const [authError, setAuthError] = React.useState('');

  // Auto-hide toast timer
  React.useEffect(() => {
    if (!showWishlistToast) return;
    const timer = setTimeout(() => {
      setShowWishlistToast(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showWishlistToast]);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Toggle wishlist item
    toggleWishlist(product);
    const nextState = !isWishlisted;
    setWishlistToastText(nextState ? 'Added to Wishlist' : 'Removed from Wishlist');
    setShowWishlistToast(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setIsSubmittingAuth(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Sign-in failed. Please check credentials.');
        return;
      }

      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');

      // Auto-add to wishlist now that we are signed in
      toggleWishlist(product);
      setWishlistToastText('Added to Wishlist');
      setShowWishlistToast(true);

      // Notify other parts of the app
      window.dispatchEvent(new Event('falak:auth-changed'));
    } catch {
      setAuthError('Connection issue. Please try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) {
      showToast({
        type: 'info',
        title: 'Sold Out',
        subtitle: 'This variation is sold out.'
      });
      return;
    }

    const defaultSize = activeVariation?.size || sizesList[0] || 'Free Size';
    addToCart(product, activeColor?.name || activeVariation?.colorName || '', defaultSize, 1);

    trackEvent('add_to_cart', {
      content_ids: [product.id],
      content_name: product.name,
      value: currentPrice,
      currency: 'BDT'
    });

    showToast({
      type: 'cart',
      title: 'Added to Cart',
      subtitle: `${product.name} (${activeColor?.name || 'Standard'})`,
      image: currentImage,
      price: currentPrice,
      actionLink: "/checkout",
      actionText: "Order Now"
    });
  };

  /** Buy Now — skips the cart, goes straight to checkout with only this item. */
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) {
      showToast({ type: 'info', title: 'Sold Out', subtitle: 'This variation is sold out.' });
      return;
    }

    const color = activeColor?.name || activeVariation?.colorName || '';
    const size = activeVariation?.size || sizesList[0] || 'Free Size';
    const params = new URLSearchParams({
      buyNow: product.id,
      color,
      size,
      qty: '1',
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <>
      <div className="group relative bg-white rounded-3xl border border-stone-200/60 p-2.5 sm:p-3 shadow-xs hover:shadow-md hover:border-[#F8D2D5] transition-all h-full duration-300 flex flex-col overflow-hidden active:scale-[0.98]">
        {/* Top Image Container */}
        <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full rounded-2xl overflow-hidden bg-stone-100">
          <Link href={productUrl} className="block relative w-full h-full" aria-label={product?.name}>
            <SmartImage
              src={currentImage}
              alt={product?.name}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          {/* Floating Favorite (Wishlist) Icon — Top Left */}
          <button
            type="button"
            onClick={handleWishlistClick}
            className="absolute top-2.5 left-2.5 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-stone-700 hover:text-[#A80C14] shadow-sm backdrop-blur-xs transition-all duration-300 cursor-pointer active:scale-90"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 transition-transform duration-200 ${isWishlisted ? 'fill-[#A80C14] text-[#A80C14] scale-110' : 'text-stone-600'}`} />
          </button>

          {/* Status badges — top right */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10 pointer-events-none">
            {isSoldOut ? (
              <span className="px-2 py-0.5 bg-stone-900/85 text-white text-[9px] font-black uppercase tracking-wider rounded-md backdrop-blur-xs">
                Sold Out
              </span>
            ) : discountPct > 0 ? (
              <span className="px-2 py-0.5 bg-[#A80C14] text-white text-[9px] font-black uppercase tracking-wider rounded-md backdrop-blur-xs shadow-xs">
                {discountPct}% OFF
              </span>
            ) : product?.isBestSeller ? (
              <span className="px-2 py-0.5 bg-stone-900/85 text-white text-[9px] font-black uppercase tracking-wider rounded-md backdrop-blur-xs shadow-xs">
                HOT ITEM
              </span>
            ) : null}
          </div>
        </div>

        {/* Product Information Below Image */}
        <div className="pt-2.5 px-1 pb-0.5 flex flex-col gap-1.5 flex-1">
          <Link href={productUrl} className="block">
            <h3 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1 group-hover:text-[#A80C14] transition-colors leading-snug">
              {product?.name}
            </h3>
          </Link>

          {/* Interactive Color Swatches Row (fixed height keeps grids aligned) */}
          {product?.colors && product.colors.length > 1 ? (
            <div className="px-2 flex items-center flex-nowrap gap-2.5 h-7 py-1 overflow-x-auto no-scrollbar w-full px-0.5" role="group" aria-label="Available colors">
              {product.colors.map((color) => {
                const isSelected = activeColor?.name === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setActiveColor(color);
                      const images = product.images ?? [];
                      if (typeof color.imageIndex === 'number' && images[color.imageIndex]) {
                        setActiveImageIndex(color.imageIndex);
                      } else if (color.images?.length && images.includes(color.images[0])) {
                        setActiveImageIndex(images.indexOf(color.images[0]));
                      }
                    }}
                    aria-label={`Color: ${color.name}`}
                    aria-pressed={isSelected}
                    className={`relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 after:content-[''] after:absolute after:-inset-1.5 after:rounded-full border border-stone-200/50 hover:scale-110 active:scale-95
                      ${isSelected
                        ? 'ring-2 ring-[#0D153A] ring-offset-2 scale-110 shadow-xs z-10 bg-white'
                        : 'hover:border-stone-400'
                      }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                );
              })}
            </div>
          ) : (
            /* Placeholder spacer to align card heights perfectly when there are no swatches */
            <div className="h-7" aria-hidden="true" />
          )}

          {/* Price Row */}
          <div className="flex items-center gap-2 mt-auto pt-0.5 flex-wrap">
            <span className="font-extrabold text-stone-900 text-sm sm:text-base font-mono">
              ৳ {currentPrice}
            </span>
            {currentOriginalPrice > currentPrice && (
              <span className="px-2 py-0.5 bg-[#FDF2F3] text-[#A80C14] text-[10px] font-bold rounded-full line-through font-mono">
                ৳ {currentOriginalPrice}
              </span>
            )}
          </div>

          {/* Bottom: Bag + Buy Now (inline sm+) + Color dot | Buy Now full-width on mobile */}
          <div className="flex  flex-col pt-2.5 mt-2 border-t border-stone-100 gap-2">
            {/* Row 1: Bag icon — Buy Now pill (sm+ only) — color dot */}
            <div className="flex justify-around items-center gap-[1.2px]">
              {/* Add to Cart bag */}
              <button
                type="button"
                onClick={handleAddToCartClick}
                disabled={isSoldOut}
                className={`p-2 rounded-full transition-all duration-300 shadow-xs cursor-pointer active:scale-95 flex-shrink-0
                  ${isSoldOut
                    ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    : 'bg-[#FDF2F3] border border-[#F8D2D5] hover:bg-[#A80C14] text-[#A80C14] hover:text-white'
                  }`}
                aria-label="Add to cart"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>

              {/* Buy Now — inline pill, visible on sm+ only */}
              {!isSoldOut && (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex justify-center w-[70%] sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#A80C14] hover:bg-[#8C0A10] text-white text-[10px] font-bold shadow-xs transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0"
                  aria-label="Buy Now"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  Buy Now
                </button>
              )}
            </div>

            {/* Row 2: Buy Now full-width — mobile only */}
            {/* {!isSoldOut && (
              <button
                type="button"
                onClick={handleBuyNow}
                className="sm:hidden w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#A80C14] hover:bg-[#8C0A10] text-white text-[11px] font-bold shadow-xs transition-all duration-200 active:scale-95 cursor-pointer"
                aria-label="Buy Now"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                Buy Now
              </button>
            )} */}
          </div>
        </div>
      </div>

      {/* Glass Apple Toast Feedback */}
      {showWishlistToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xs bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-[0_10px_35px_rgba(168,12,20,0.15)] flex items-center gap-3.5 animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#A80C14] shrink-0 border border-[#F8D2D5]/60 shadow-xs">
            <Heart className={`w-4 h-4 ${wishlistToastText.includes('Added') ? 'fill-[#A80C14]' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-stone-800 font-extrabold text-xs">{wishlistToastText}</p>
            <p className="text-stone-500 text-[10px] truncate">{product?.name}</p>
          </div>
        </div>
      )}

      {/* Auth Modal Sign In (Apple Glass Style) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0D153A]/25 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-6 shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200 text-center overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowAuthModal(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors cursor-pointer z-10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-[#FDF2F3] text-[#A80C14] flex items-center justify-center mx-auto mb-4 border border-[#F8D2D5]">
                <Heart className="w-6 h-6 fill-current" />
              </div>

              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-1">
                Add to Wishlist
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-5">
                Please sign in to save your favorite abayas, hijabs, and couture collections to your wishlist.
              </p>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A80C14]/20 focus:border-[#A80C14]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A80C14]/20 focus:border-[#A80C14]"
                  />
                </div>

                {authError && (
                  <p className="text-[11px] font-bold text-red-500 mt-1">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-2.5 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {isSubmittingAuth ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/account?type=register"
                  onClick={() => setShowAuthModal(false)}
                  className="text-[11px] font-bold text-[#A80C14] hover:underline"
                >
                  Don&apos;t have an account? Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
