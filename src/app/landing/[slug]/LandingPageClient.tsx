'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star,
  ShoppingBag,
  Truck,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Crown,
  Feather,
  Gem,
  PhoneCall,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Flame,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MapPin,
  User,
  Phone,
  MessageCircle,
  HelpCircle,
  PackageCheck,
  Award,
  Lock,
  CheckCircle,
  ShieldAlert,
  Clock,
  Layers,
  HeartHandshake,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  X,
  KeyRound,
  Mail,
  Sparkles,
  Info,
  FileText,
  Palette,
} from 'lucide-react';
import { Product, ProductColor } from '@/data/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useToast } from '@/components/ui/Toast';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '@/lib/videoUtils';
import {
  parseAddressLocation,
  calculateShippingFee,
  checkIsFreeDelivery,
} from '@/lib/shipping/locationBilingual';

/** Shared 44px-touch-target text field matching checkout style. */
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = true,
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  className = '',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'numeric' | 'email';
  pattern?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={`lp-${name}`} className="text-[11px] sm:text-xs font-bold text-stone-700">
        {label} {required && <span className="text-[#A80C14]">*</span>}
      </label>
      <input
        id={`lp-${name}`}
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        className="w-full min-h-[44px] px-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A80C14] focus:border-transparent transition-shadow"
      />
    </div>
  );
}

interface LandingPageClientProps {
  initialProduct: Product;
}

export default function LandingPageClient({ initialProduct }: LandingPageClientProps) {
  const router = useRouter();
  const { placeOrder, deliveryZones, products, freeShippingThreshold } = useCart();
  const { trackEvent } = useAnalytics();
  const { showToast } = useToast();

  const product = useMemo(() => {
    return products.find((p) => p.id === initialProduct.id || p.slug === initialProduct.slug) || initialProduct;
  }, [products, initialProduct]);

  // ─── Preset Color Definitions & Database Match ─────────────────────────────
  // High-converting curated shades as requested, backed by authentic Cloudinary images
  const presetColors = useMemo(
    () => [
      {
        name: 'Olive / Mint Green',
        hex: '#8A9E8A',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791361471/falak-closet/products/zyxn5eamdeq6przkkivo.png',
      },
      {
        name: 'Jet Black',
        hex: '#1E1E22',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791360999/falak-closet/products/ozxlbtshjyhebuglqvc8.jpg',
      },
      {
        name: 'Deep Maroon',
        hex: '#7A1C2E',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791361363/falak-closet/products/o96oauotyp6csupdiylb.jpg',
      },
      {
        name: 'Navy Blue',
        hex: '#1E355B',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791361413/falak-closet/products/amxqgsslvurh85nbh7gi.jpg',
      },
      {
        name: 'Pastel Pink',
        hex: '#E29FB6',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791361879/falak-closet/products/bjeu9cwfg01ebmm3sama.jpg',
      },
      {
        name: 'Nude Beige',
        hex: '#D7BAA6',
        image:
          'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791362044/falak-closet/products/l1oxik5lqsb2crkefjx2.jpg',
      },
    ],
    []
  );

  const colorsList = useMemo(() => {
    if (Array.isArray(product.colors) && product.colors.length >= 4) {
      return product.colors.map((c, i) => ({
        name: c.name,
        hex: c.hex || presetColors[i % presetColors.length].hex,
        image:
          c.images?.[0] ||
          product.images?.[i] ||
          presetColors[i % presetColors.length].image,
      }));
    }
    return presetColors;
  }, [product.colors, product.images, presetColors]);

  const [selectedColor, setSelectedColor] = useState<string>(colorsList[0]?.name || 'Olive / Mint Green');
  const [activeImage, setActiveImage] = useState<string>(
    colorsList[0]?.image ||
    product.images?.[0] ||
    'https://res.cloudinary.com/t9sxkcr3/image/upload/v1791361471/falak-closet/products/zyxn5eamdeq6przkkivo.png'
  );

  // 6 colors per slide page
  const [colorPage, setColorPage] = useState<number>(0);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);
  const thumbnailItemRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  const colorPages = useMemo(() => {
    const pages: (typeof colorsList)[] = [];
    for (let i = 0; i < colorsList.length; i += 6) {
      pages.push(colorsList.slice(i, i + 6));
    }
    return pages;
  }, [colorsList]);

  const totalColorPages = colorPages.length;

  const handleColorSelect = (colorName: string, explicitIndex?: number) => {
    const targetIndex =
      typeof explicitIndex === 'number'
        ? explicitIndex
        : colorsList.findIndex((c) => c.name.toLowerCase() === colorName.toLowerCase());

    if (targetIndex >= 0) {
      const col = colorsList[targetIndex];
      setSelectedColor(col.name);
      if (col.image) {
        setActiveImage(col.image);
      }
      // Auto-slide color selection carousel to the page containing this variant
      const newPage = Math.floor(targetIndex / 6);
      setColorPage(newPage);

      // Smoothly center the active thumbnail in the variants scroll track
      if (thumbnailItemRefs.current[targetIndex]) {
        thumbnailItemRefs.current[targetIndex]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  };

  const handleNextColorPage = () => {
    setColorPage((prev) => Math.min(totalColorPages - 1, prev + 1));
  };

  const handlePrevColorPage = () => {
    setColorPage((prev) => Math.max(0, prev - 1));
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbnailScrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      thumbnailScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // ─── Dynamic Pricing Calculation ───────────────────────────────────────────
  const regularPrice = useMemo(() => {
    return (product.originalPrice && product.originalPrice > 0)
      ? product.originalPrice
      : (product.price && product.price > 0 ? product.price : 850);
  }, [product.originalPrice, product.price]);

  const discountPercent = useMemo(() => {
    if (typeof product.landingDiscountPercentage === 'number') {
      return Math.max(0, Math.round(product.landingDiscountPercentage));
    }
    if (typeof product.discountPercentage === 'number' && product.discountPercentage > 0) {
      return Math.round(product.discountPercentage);
    }
    if (regularPrice > product.price && product.price > 0) {
      return Math.round(((regularPrice - product.price) / regularPrice) * 100);
    }
    return 0; // Default fallback discount: 0%
  }, [product.landingDiscountPercentage, product.discountPercentage, product.price, regularPrice]);

  const offerPrice = useMemo(() => {
    if (discountPercent <= 0) return product.price || regularPrice;
    return Math.max(1, Math.round(regularPrice * (1 - discountPercent / 100)));
  }, [regularPrice, discountPercent, product.price]);

  const discountBadge = `${discountPercent}% OFF`;

  // ─── Dynamic Product Reviews & Realistic Ratings ───────────────────────────
  const approvedReviews = useMemo(() => {
    return (product.reviewsList || []).filter((r) => (r.status ?? 'approved') === 'approved');
  }, [product.reviewsList]);

  const totalReviewsCount = approvedReviews.length;

  const avgRatingNum = useMemo(() => {
    if (totalReviewsCount === 0) return 0;
    const sum = approvedReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return Math.round((sum / totalReviewsCount) * 10) / 10;
  }, [approvedReviews, totalReviewsCount]);

  const avgRating = useMemo(() => {
    return avgRatingNum > 0 ? avgRatingNum.toFixed(1) : '0.0';
  }, [avgRatingNum]);

  const [quantity, setQuantity] = useState<number>(1);
  const subtotal = offerPrice * quantity;

  // ─── Video Control State & YouTube Detection ──────────────────────────────
  const isYouTube = useMemo(() => isYouTubeUrl(product.videoUrl), [product.videoUrl]);
  const youTubeEmbedUrl = useMemo(() => {
    return isYouTube
      ? getYouTubeEmbedUrl(product.videoUrl, {
        autoplay: true,
        mute: true,
        loop: true,
        controls: true,
      })
      : null;
  }, [product.videoUrl, isYouTube]);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => { });
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  // ─── Scroll Spy for Sticky Mobile Bar ─────────────────────────────────────
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('hero-section');
      const checkout = document.getElementById('checkout-form');
      if (!hero || !checkout) return;

      const heroBottom = hero.getBoundingClientRect().bottom;
      const checkoutTop = checkout.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      // Show after scrolling past hero, hide when reaching checkout form
      const isPastHero = heroBottom < 100;
      const isBeforeCheckout = checkoutTop > windowHeight - 100;

      setShowStickyBar(isPastHero && isBeforeCheckout);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCheckout = () => {
    const el = document.getElementById('checkout-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ─── Order Form Submission & Account Authentication ─────────────────────
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // ── Smart Bilingual Address Parsing with Zero Mismatch Guarantee ─────────────
  const parsedAddress = useMemo(() => {
    return parseAddressLocation(address);
  }, [address]);

  const activeTier = parsedAddress.tier;

  const isFreeDeliveryUnlocked = useMemo(() => {
    return checkIsFreeDelivery(
      [{ product, quantity }],
      subtotal,
      Number(freeShippingThreshold)
    );
  }, [product, quantity, subtotal, freeShippingThreshold]);

  const effectiveShippingFee = isFreeDeliveryUnlocked ? 0 : parsedAddress.rate;
  const deliveryFee = effectiveShippingFee;
  const totalPayable = subtotal + deliveryFee;

  // Close policy modal on Escape key
  useEffect(() => {
    if (!isPolicyModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPolicyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPolicyModalOpen]);

  // Authentication & session state
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authExistingUser, setAuthExistingUser] = useState<{ name?: string; phone?: string; email?: string } | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authModalError, setAuthModalError] = useState('');
  const [isSubmittingAuthModal, setIsSubmittingAuthModal] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Fetch session on load and prefill shipping details if available
  useEffect(() => {
    let isMounted = true;
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setSessionUser(data.user);
            setFullName((prev) => prev || data.user.name || '');
            setPhone((prev) => prev || data.user.phone || '');
            setAddress((prev) => prev || data.user.fullAddress || '');
          }
        }
      } catch {
        // guest / offline mode
      }
    };

    fetchSession();

    const handleAuthChange = () => {
      fetchSession();
    };
    window.addEventListener('falak:auth-changed', handleAuthChange);
    return () => {
      isMounted = false;
      window.removeEventListener('falak:auth-changed', handleAuthChange);
    };
  }, []);

  const handleSwitchAccount = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { }
    setSessionUser(null);
    window.dispatchEvent(new Event('falak:auth-changed'));
    showToast({
      type: 'info',
      title: 'Logged Out',
      subtitle: 'You can now sign in with a different account or order as new user.',
    });
  };

  // ─── Execute Order Placement ──────────────────────────────────────────────
  const executeOrderSubmission = async (targetUser?: any) => {
    setIsSubmitting(true);
    setFormError('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '').replace(/^88/, '');
    const cleanAddress = address.trim();

    try {
      const activeUser = targetUser || sessionUser;
      const effectiveEmail = activeUser?.email || `${digitsOnly}@falakcloset.com`;

      const orderPayload = {
        items: [
          {
            product,
            selectedColor,
            selectedSize: 'Free Size',
            quantity,
          },
        ],
        subtotal,
        discount: (regularPrice - offerPrice) * quantity,
        shippingFee: deliveryFee,
        total: totalPayable,
        shippingAddress: {
          fullName: cleanName,
          phone: digitsOnly,
          fullAddress: cleanAddress,
          district: parsedAddress.districtNameEn || (activeTier === 'dhaka_core' ? 'Dhaka' : 'Outside Dhaka'),
          division: parsedAddress.divisionNameEn || (activeTier === 'dhaka_core' ? 'Dhaka' : 'Outside Dhaka'),
          city: parsedAddress.districtNameEn || (activeTier === 'dhaka_core' ? 'Dhaka' : 'Outside Dhaka'),
        },
        deliveryMethod: activeTier === 'dhaka_core'
          ? 'Inside Dhaka (৳80)'
          : activeTier === 'dhaka_subarea'
          ? 'Sub-area Dhaka (৳100)'
          : `Outside Dhaka (৳150)${parsedAddress.districtNameEn ? ` - ${parsedAddress.districtNameEn}` : ''}`,
        paymentMethod: 'Cash on Delivery',
        deliveryZone: parsedAddress.divisionNameEn || activeTier,
        deliverySubArea: parsedAddress.thanaNameEn || parsedAddress.districtNameEn || undefined,
        paymentStatus: 'Pending',
        userEmail: effectiveEmail,
        userId: activeUser?.id,
      };

      const placed = await placeOrder(orderPayload as any);

      trackEvent('purchase', {
        orderId: placed.id,
        itemCount: quantity,
        totalValue: totalPayable,
        paymentMethod: 'Cash on Delivery',
      });

      showToast({
        type: 'info',
        title: 'Order Placed Successfully! 🎉',
        subtitle: `Order ID: ${placed.id}. Cash on delivery confirmed.`,
      });

      setOrderSuccess(placed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Order error:', err);
      setFormError('An error occurred while placing your order. Please try again or call our hotline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Main Order Submit Button Handler ─────────────────────────────────────
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }

    // Normalise BD mobile number (11 digits, starts with 01)
    const digitsOnly = cleanPhone.replace(/\D/g, '').replace(/^88/, '');
    if (digitsOnly.length !== 11 || !digitsOnly.startsWith('01')) {
      setFormError('Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      setFormError('Please enter your complete address (House No, Area, Thana, District).');
      return;
    }

    // 1. If already logged in, place the order under this authenticated account immediately
    if (sessionUser) {
      await executeOrderSubmission(sessionUser);
      return;
    }

    // 2. Not logged in: check if account exists in database for this phone number
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digitsOnly }),
      });
      const data = await res.json();

      if (data.isLoggedIn && data.user) {
        setSessionUser(data.user);
        await executeOrderSubmission(data.user);
        return;
      }

      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthModalError('');
      setAuthEmail('');

      if (data.accountExists && data.hasPassword) {
        // Account exists with password -> prompt login
        setAuthExistingUser(data.user || { phone: digitsOnly });
        setAuthMode('signin');
        setShowAuthModal(true);
      } else {
        // Account does not exist or has no password -> prompt user to create account
        setAuthExistingUser(null);
        setAuthMode('signup');
        setShowAuthModal(true);
      }
    } catch (err) {
      console.error('Account check error:', err);
      setFormError('Connection issue while verifying account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Modal Form Submit Handlers ───────────────────────────────────────────
  const handleModalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) {
      setAuthModalError('Please enter your password.');
      return;
    }

    setIsSubmittingAuthModal(true);
    setAuthModalError('');

    try {
      const digitsOnly = phone.trim().replace(/\D/g, '').replace(/^88/, '');
      const loginIdentifier = authExistingUser?.email || digitsOnly;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthModalError(data.error || 'Incorrect password. Please try again.');
        return;
      }

      setSessionUser(data.user);
      setShowAuthModal(false);
      window.dispatchEvent(new Event('falak:auth-changed'));

      showToast({
        type: 'info',
        title: `Welcome back, ${data.user.name || 'Customer'}! 👋`,
        subtitle: 'Placing your order now...',
      });

      await executeOrderSubmission(data.user);
    } catch {
      setAuthModalError('Unable to connect. Please check your internet connection.');
    } finally {
      setIsSubmittingAuthModal(false);
    }
  };

  const handleModalSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword || authPassword.length < 6) {
      setAuthModalError('Password must be at least 6 characters.');
      return;
    }

    if (authConfirmPassword && authPassword !== authConfirmPassword) {
      setAuthModalError('Passwords do not match.');
      return;
    }

    setIsSubmittingAuthModal(true);
    setAuthModalError('');

    try {
      const cleanName = fullName.trim();
      const digitsOnly = phone.trim().replace(/\D/g, '').replace(/^88/, '');
      const cleanAddress = address.trim();

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: digitsOnly,
          email: authEmail.trim() || undefined,
          password: authPassword,
          district: parsedAddress.districtNameEn || (activeTier === 'dhaka_core' ? 'Dhaka' : 'Outside Dhaka'),
          fullAddress: cleanAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthModalError(data.error || 'Account creation failed. Please try again.');
        return;
      }

      setSessionUser(data.user);
      setShowAuthModal(false);
      window.dispatchEvent(new Event('falak:auth-changed'));

      showToast({
        type: 'info',
        title: 'Account Created! 🎉',
        subtitle: 'Welcome to Falak Closet. Placing your order now...',
      });

      await executeOrderSubmission(data.user);
    } catch {
      setAuthModalError('Unable to connect. Please check your internet connection.');
    } finally {
      setIsSubmittingAuthModal(false);
    }
  };

  // ─── Celebration / Order Success Screen ───────────────────────────────────
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#FDF9F7] py-12 px-4 sm:px-6 flex items-center justify-center font-sans">
        <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-[#F8D2D5] text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-[#FDF2F3] text-[#800020] rounded-full flex items-center justify-center mx-auto border-2 border-[#F8D2D5] shadow-inner">
            <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Order Confirmed (Cash on Delivery)
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
              Thank You, {fullName}! 🎉
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Your Cash on Delivery order for <strong>Premium Shiny Shade Jersey Branded Stone Hijab</strong> has been successfully placed. Our team will call you shortly to confirm shipment.
            </p>
          </div>

          <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <span className="text-stone-500 font-medium">Order ID:</span>
              <span className="font-mono font-extrabold text-stone-900 text-sm">{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Item & Color:</span>
              <span className="font-bold text-stone-900">{selectedColor} (Qty: {quantity})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Delivery Zone:</span>
              <span className="font-bold text-stone-800">
                {activeTier === 'dhaka_core'
                  ? 'Inside Dhaka (৳80)'
                  : activeTier === 'dhaka_subarea'
                  ? 'Sub-area Dhaka (৳100)'
                  : 'Outside Dhaka (৳150)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Contact Phone:</span>
              <span className="font-bold text-stone-800">{phone}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-sm">
              <span className="font-bold text-stone-900">Total Payable:</span>
              <span className="font-mono font-extrabold text-[#800020] text-base">{formatCurrency(totalPayable)}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              Back to Home
            </Link>
            <a
              href={`https://wa.me/8801799775487?text=${encodeURIComponent(
                `Hello, I have placed an order. Order ID: ${orderSuccess.id} (Premium Shiny Shade Jersey Branded Stone Hijab)`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF9F7] text-[#1C1917] font-sans selection:bg-[#F8D2D5] selection:text-[#800020]">
      {/* ─── Topmost Sticky Promo Bar ────────────────────────────────────── */}
      <div className="bg-[#800020] text-white py-2.5 px-4 sm:px-6 lg:px-8 text-[11px] sm:text-xs font-bold tracking-wider uppercase sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
            <span>LIMITED TIME OFFER: GET FREE NATIONWIDE DELIVERY & SPECIAL DISCOUNT TODAY!</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <a href="tel:01799775487" className="text-amber-200 hover:text-white flex items-center gap-1 font-mono text-xs">
              <PhoneCall className="w-3.5 h-3.5" /> 01799-775487
            </a>
            <button
              onClick={scrollToCheckout}
              className="px-3 py-1 bg-white hover:bg-stone-100 text-[#800020] rounded-full text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {/* ─── Trust Feature Strip ─────────────────────────────────────────── */}
      <div className="bg-[#FCFAF8] border-b border-stone-200/60 py-2.5 px-4 sm:px-6 lg:px-8 text-[11px] text-stone-600 font-medium">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2 text-center">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#800020]" /> Nationwide Delivery
          </span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-[#800020]" /> 24/7 Helpline Support
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#800020]" /> Cash On Delivery
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <RotateCcw className="w-3.5 h-3.5 text-[#800020]" /> 7-Day Easy Exchange
          </span>
        </div>
      </div>

      {/* ─── SECTION 1: HERO SECTION (Offer + Video + Instant CTA) ──────── */}
      <section id="hero-section" className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Category Tag */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#FDF2F3] border border-[#F8D2D5] text-[#800020] font-extrabold text-[11px] uppercase tracking-wider mb-3">
            <Crown className="w-3.5 h-3.5 text-[#800020]" />
            <span>PREMIUM MODEST COLLECTION</span>
          </div>

          {/* H1 Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#7A0C14] leading-tight tracking-tight max-w-4xl mx-auto uppercase">
            PREMIUM SHINY SHADE JERSEY BRANDED STONE HIJAB
          </h1>

          {/* Sub-headline */}
          <p className="text-stone-600 text-xs sm:text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
            Experience sheer elegance with soft, breathable jersey fabric and exquisite branded stone work — perfect for every modest occasion.
          </p>

          {/* Feature Highlights (3 items with icons) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-4 text-xs font-semibold text-stone-700">
            <span className="flex items-center gap-1.5 text-[#800020]">
              <Feather className="w-3.5 h-3.5 text-[#800020]" /> Premium Shiny Jersey Fabric
            </span>
            <span className="flex items-center gap-1.5 text-[#800020]">
              <Award className="w-3.5 h-3.5 text-[#800020]" /> Durable, High-Quality Branded Stone Work
            </span>
            <span className="flex items-center gap-1.5 text-[#800020]">
              <CheckCircle className="w-3.5 h-3.5 text-[#800020]" /> Comfortable, Non-Slip, & Easy to Style
            </span>
          </div>

          {/* Price Display */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4">
            {discountPercent > 0 && regularPrice > offerPrice && (
              <span className="text-stone-400 line-through text-lg sm:text-xl font-mono">
                REGULAR: ৳{regularPrice}
              </span>
            )}
            <span className="font-mono font-black text-3xl sm:text-4xl text-[#800020]">
              OFFER PRICE: ৳{offerPrice}
            </span>
            {discountPercent > 0 && (
              <span className="px-2.5 py-0.5 bg-[#800020] text-white font-extrabold text-xs rounded-lg uppercase shadow-xs">
                {discountBadge}
              </span>
            )}
          </div>

          {/* Media Showcase: Video if configured, otherwise Product Image */}
          <div className="mt-6 relative rounded-3xl overflow-hidden bg-stone-900 border border-stone-200/80 shadow-2xl w-full mx-auto aspect-video sm:aspect-[16/9]">
            {product.videoUrl && product.videoUrl.trim() ? (
              isYouTube && youTubeEmbedUrl ? (
                <div className="relative w-full h-full bg-black">
                  <iframe
                    src={youTubeEmbedUrl}
                    title={product.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={product.videoUrl}
                    poster={activeImage}
                    playsInline
                    loop
                    muted={isMuted}
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Top Video Overlay Badge */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold border border-white/20">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>PRODUCT PREVIEW VIDEO</span>
                    </div>
                    {totalReviewsCount > 0 ? (
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-white/20">
                        <Star className="w-3.5 h-3.5 fill-amber-300" />
                        <span>{avgRating} / 5.0</span>
                      </div>
                    ) : (
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-200 text-[11px] font-bold flex items-center gap-1 border border-white/20">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Featured</span>
                      </div>
                    )}
                  </div>

                  {/* Central Play Button Overlay */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all cursor-pointer group"
                      aria-label="Play product video"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#800020]/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-white" />
                      </div>
                    </button>
                  )}

                  {/* Bottom Video Controls Bar */}
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 border border-white/10 text-white">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                      <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <button
                      onClick={scrollToCheckout}
                      className="px-4 py-1.5 bg-[#800020] hover:bg-[#660019] text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Instant Order</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )
            ) : (
              <div className="relative w-full h-full group">
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>FEATURED PRODUCT SHOWCASE</span>
                  </div>
                  {totalReviewsCount > 0 ? (
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-white/20">
                      <Star className="w-3.5 h-3.5 fill-amber-300" />
                      <span>{avgRating} / 5.0</span>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-amber-200 text-[11px] font-bold flex items-center gap-1 border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Featured</span>
                    </div>
                  )}
                </div>

                {/* Bottom Overlay Controls */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 text-white">
                  <div className="text-xs font-bold text-stone-200 truncate">
                    <span>Selected Shade: </span>
                    <span className="text-amber-200 font-extrabold">{selectedColor}</span>
                  </div>
                  <button
                    onClick={scrollToCheckout}
                    className="px-4 py-1.5 bg-[#800020] hover:bg-[#660019] text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Instant Order</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA Button */}
          <div className="mt-8">
            <button
              onClick={scrollToCheckout}
              className="w-full sm:w-auto px-10 py-4 bg-[#800020] hover:bg-[#660019] text-white font-extrabold text-base sm:text-lg rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 group tracking-wide uppercase"
            >
              <span>ORDER NOW — CASH ON DELIVERY</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-stone-500 text-xs mt-2 flex items-center justify-center gap-1 font-medium">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>100% Cash on Delivery · Inspect product upon arrival before payment</span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: PRODUCT USP (Why This Hijab?) ───────────────────── */}
      <section className="py-12 sm:py-16 bg-white border-y border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            <p className="text-[11px] font-bold text-[#800020] uppercase tracking-widest">
              UNIQUE SELLING POINTS
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#7A0C14] uppercase">
              WHY THIS HIJAB IS PERFECT FOR YOU?
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
              Premium craft, imported fabric, and attention to every modest detail.
            </p>
          </div>

          {/* 6-Card Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 mb-3 shadow-xs">
                <Feather className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Premium Quality Fabric</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Soft, breathable jersey fabric for all-day wear without feeling heavy.
                </p>
              </div>
            </div>

            {/* 2 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 mb-3 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Non-Slip Grip</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Stays firmly in place on your head without excessive pinning or constant adjusting.
                </p>
              </div>
            </div>

            {/* 3 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 mb-3 shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">No Stone Shedding</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  High-grade branded stone setting that won't fall off during wash or wear.
                </p>
              </div>
            </div>

            {/* 4 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 mb-3 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">12+ Elegant Shades</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Rich, shining colors curated to match any modest outfit and celebration.
                </p>
              </div>
            </div>

            {/* 5 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 mb-3 shadow-xs">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Cash On Delivery</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Inspect your parcel in front of the delivery agent before paying.
                </p>
              </div>
            </div>

            {/* 6 */}
            <div className="bg-[#FAF6F4] rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-[#F8D2D5] transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 mb-3 shadow-xs">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Hassle-Free Return</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  7-day easy return and replacement support if any issue arises.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: PRODUCT COLOR VARIATIONS (Interactive Selector) ── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            <p className="text-[11px] font-bold text-[#800020] uppercase tracking-widest">
              COLOR SELECTION SECTION
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#7A0C14] uppercase">
              CHOOSE YOUR FAVORITE COLOR
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
              Click a shade to preview the hijab styling
            </p>
          </div>

          {/* 2-Column Responsive Container */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
            {/* Left: Dynamic Main Image Preview */}
            <div className="aspect-[4/5] relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shrink-0 shadow-inner">
              <Image
                src={activeImage}
                alt={`Selected Color: ${selectedColor}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-top transition-all duration-300"
                priority
              />
              <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
                Active: {selectedColor}
              </span>
            </div>

            {/* Right: Interactive Swatch Chips & Thumbnails */}
            <div className="space-y-5">
              {/* Header with Title and Page Indicator */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    COLOR SELECTION
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
                    Premium Shiny Shade Jersey
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Selected Shade: <strong className="text-[#800020]">{selectedColor}</strong>
                  </p>
                </div>

                {/* Page Controls for 6-color view */}
                {totalColorPages > 1 && (
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                    <div className="flex items-center gap-1.5 bg-stone-100/90 px-2 py-1 rounded-xl border border-stone-200 shadow-xs">
                      <button
                        type="button"
                        disabled={colorPage === 0}
                        onClick={handlePrevColorPage}
                        className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Previous 6 colors"
                        aria-label="Previous 6 colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-stone-700 font-mono px-1">
                        {colorPage + 1}/{totalColorPages}
                      </span>
                      <button
                        type="button"
                        disabled={colorPage === totalColorPages - 1}
                        onClick={handleNextColorPage}
                        className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Next 6 colors"
                        aria-label="Next 6 colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400">
                      Showing {colorPage * 6 + 1}–{Math.min((colorPage + 1) * 6, colorsList.length)} of {colorsList.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Sliding Carousel of 6-Color Pages */}
              <div className="relative overflow-hidden rounded-2xl p-1 -m-1">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${colorPage * 100}%)` }}
                >
                  {colorPages.map((pageItems, pageIdx) => {
                    const emptySlotsCount = Math.max(0, 6 - pageItems.length);

                    return (
                      <div
                        key={pageIdx}
                        className="w-full shrink-0 grid grid-cols-2 gap-2 sm:gap-2.5 content-start min-h-[152px]"
                      >
                        {pageItems.map((col, itemIdx) => {
                          const globalIndex = pageIdx * 6 + itemIdx;
                          const isSelected = selectedColor.toLowerCase() === col.name.toLowerCase();

                          return (
                            <button
                              key={col.name}
                              type="button"
                              onClick={() => handleColorSelect(col.name, globalIndex)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 group ${isSelected
                                ? 'border-[#800020] bg-[#FFF5F6] shadow-xs'
                                : 'border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300'
                                }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-md shrink-0 border border-black/20 shadow-inner transition-transform ${isSelected ? 'ring-1 ring-[#800020]/40 scale-105' : 'group-hover:scale-105'
                                  }`}
                                style={{ backgroundColor: col.hex }}
                              />
                              <span
                                className={`text-xs truncate transition-colors ${isSelected ? 'font-black text-[#800020]' : 'font-semibold text-stone-700'
                                  }`}
                              >
                                {col.name}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-[#800020] ml-auto shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}

                        {/* Maintain exact 6-slot geometric pattern on pages with fewer items */}
                        {emptySlotsCount > 0 &&
                          Array.from({ length: emptySlotsCount }).map((_, emptyIdx) => (
                            <div
                              key={`empty-${emptyIdx}`}
                              aria-hidden="true"
                              className="p-2.5 rounded-xl border border-transparent opacity-0 pointer-events-none select-none invisible"
                            >
                              <span className="w-4 h-4" />
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Page Dots Indicator */}
              {totalColorPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-1.5">
                  {colorPages.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => setColorPage(dotIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${colorPage === dotIdx
                        ? 'w-6 bg-[#800020]'
                        : 'w-2 bg-stone-300 hover:bg-stone-400'
                        }`}
                      title={`Go to page ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Thumbnail Gallery (VARIANTS) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Variants:</span>
                    <span className="text-[10px] font-semibold text-stone-400 normal-case">
                      ({colorsList.length} shades available)
                    </span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('left')}
                      className="p-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 cursor-pointer transition-colors"
                      title="Scroll left"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('right')}
                      className="p-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 cursor-pointer transition-colors"
                      title="Scroll right"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Thumbnails Row with Horizontal Scroll & Synced Centering */}
                <div
                  ref={thumbnailScrollRef}
                  className="flex items-center gap-2.5 overflow-x-auto py-2.5 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-stone-200"
                >
                  {colorsList.map((col, index) => {
                    const isSelected = selectedColor.toLowerCase() === col.name.toLowerCase();

                    return (
                      <button
                        key={col.name}
                        ref={(el) => {
                          thumbnailItemRefs.current[index] = el;
                        }}
                        type="button"
                        onClick={() => handleColorSelect(col.name, index)}
                        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl relative shrink-0 p-0.5 border transition-all cursor-pointer ${isSelected
                          ? 'border-[#800020] bg-white shadow-md'
                          : 'border-stone-200 bg-white opacity-70 hover:opacity-100 hover:border-stone-400'
                          }`}
                        title={`Variant #${index + 1}: ${col.name}`}
                      >
                        <div className="w-full h-full rounded-[9px] overflow-hidden relative">
                          <Image src={col.image} alt={col.name} fill className="object-cover" />
                          <span
                            className={`absolute bottom-0 inset-x-0 text-[9px] font-bold py-0.5 text-center leading-none ${isSelected ? 'bg-[#800020] text-white' : 'bg-black/60 text-white'
                              }`}
                          >
                            #{index + 1}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={scrollToCheckout}
                className="w-full py-3.5 bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Order This Color ({selectedColor})</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: CUSTOMER REVIEWS & SOCIAL PROOF ─────────────────── */}
      <section className="py-12 sm:py-16 bg-white border-y border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            <p className="text-[11px] font-bold text-[#800020] uppercase tracking-widest">
              REVIEWS SECTION
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#7A0C14] uppercase">
              CUSTOMER REVIEWS & RATINGS
            </h2>
            {totalReviewsCount > 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-amber-500 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(avgRatingNum)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-300 fill-stone-100'
                      }`}
                  />
                ))}
                <span className="font-bold text-stone-900 text-xs ml-1 font-mono">
                  {avgRating}/5.0 ({totalReviewsCount} VERIFIED {totalReviewsCount === 1 ? 'CUSTOMER' : 'CUSTOMERS'})
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 pt-1 text-stone-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-stone-300 fill-stone-100" />
                ))}
                <span className="text-stone-500 text-xs font-semibold ml-1">
                  (0 Reviews · No ratings yet)
                </span>
              </div>
            )}
          </div>

          {/* Testimonial Cards (Dynamic from product.reviewsList) */}
          {approvedReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {approvedReviews.map((rev, index) => {
                const reviewImage =
                  colorsList[index % colorsList.length]?.image ||
                  product.images?.[index % product.images.length] ||
                  activeImage;

                return (
                  <div
                    key={rev.id || `rev-${index}`}
                    className="bg-[#FAF6F4] rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs flex flex-col justify-between group"
                  >
                    <div className="aspect-[4/5] relative bg-stone-100 overflow-hidden">
                      <Image
                        src={reviewImage}
                        alt={`${rev.author} review for ${product.name}`}
                        fill
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-stone-900">{rev.author}</p>
                          <p className="text-[10px] text-stone-500">
                            {rev.verifiedPurchase ? 'Verified Buyer' : 'Customer Review'}
                          </p>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(Math.min(5, Math.max(1, Math.round(rev.rating || 5))))].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed italic">
                        “{rev.comment}”
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-[#FAF6F4] rounded-3xl border border-stone-200/80 max-w-xl mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto border border-stone-200">
                <Star className="w-6 h-6 text-stone-300 fill-stone-100" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                No Reviews Yet for this Product
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Customer reviews submitted for {product.name} will automatically appear here with verified feedback.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 5: CHECKOUT ORDER FORM (id="checkout-form") ────────── */}
      <section id="checkout-form" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 scroll-mt-14">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-1.5 pb-8 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1 px-3.5 py-1 bg-[#FDF2F3] text-[#800020] font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              <Flame className="w-3 h-3 fill-[#800020]" /> CHECK-OUT FORM
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#7A0C14] uppercase">
              FILL IN THE FORM BELOW TO CONFIRM YOUR ORDER
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              No advance payment required. 100% Cash on delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Product & Pricing Summary (col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-stone-600">Order Summary</span>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  Cash on Delivery
                </span>
              </div>

              {/* Product preview */}
              <div className="flex gap-4 items-center">
                <div className="w-20 h-24 rounded-2xl overflow-hidden relative shrink-0 border border-stone-200 bg-stone-50 shadow-inner">
                  <Image src={activeImage} alt={product.name} fill className="object-cover object-top" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Color: <strong className="text-[#800020]">{selectedColor}</strong>
                  </p>
                  <p className="font-mono text-sm font-black text-[#800020]">৳{offerPrice}</p>
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between p-3 bg-[#FAF6F4] rounded-2xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">Quantity:</span>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-stone-200 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-xs px-2 text-stone-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="bg-[#FAF6F4] rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-600">
                  <span className="uppercase font-semibold text-[11px]">Subtotal:</span>
                  <span className="font-mono font-bold text-stone-900">৳{subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span className="uppercase font-semibold text-[11px]">Delivery Fee:</span>
                  <span className="font-mono font-bold text-stone-900">৳{deliveryFee}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-sm font-extrabold text-stone-900">
                  <span className="uppercase text-[11px] font-black">Total Payable:</span>
                  <span className="font-mono text-[#800020] text-xl font-black">
                    ৳{totalPayable}
                  </span>
                </div>
              </div>

              {/* Delivery & Security Guarantees */}
              <div className="space-y-2 pt-2 text-[11px] text-stone-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Cash on delivery — inspect before paying</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#800020] shrink-0" />
                  <span>Nationwide express delivery (Dhaka & outside)</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#800020] shrink-0" />
                  <span>7-Day easy return & replacement support</span>
                </div>
              </div>
            </div>

            {/* Right: Checkout Form Fields (col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-5">
              <form onSubmit={handleOrderSubmit} className="space-y-5">
                {/* Account Status / Fast Sign-in Badge */}
                {sessionUser ? (
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="font-bold text-emerald-950">
                          Signed In as {sessionUser.name || 'Member'}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          Order will be placed and linked to your account ({sessionUser.phone || sessionUser.email}).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer pl-2"
                    >
                      Switch Account
                    </button>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 bg-[#FAF6F4] border border-stone-200/90 rounded-2xl flex items-center justify-between text-xs text-stone-600">
                    <span className="text-[11px]">Already have a Falak Closet account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setAuthExistingUser(phone ? { phone } : null);
                        setAuthPassword('');
                        setAuthModalError('');
                        setShowAuthModal(true);
                      }}
                      className="font-bold text-[#800020] hover:text-[#5B060B] hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Sign In Here
                    </button>
                  </div>
                )}

                {/* Shipping & Contact Details */}
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#F8D2D5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#A80C14]/10 text-[#A80C14] text-xs font-black flex items-center justify-center shrink-0">
                        2
                      </span>
                      Shipping &amp; Contact Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field
                      label="Full Name"
                      name="fullName"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (formError) setFormError('');
                      }}
                      placeholder="e.g. Sarah Ahmed"
                      autoComplete="name"
                    />

                    <Field
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formError) setFormError('');
                      }}
                      placeholder="e.g. 01700000000"
                      autoComplete="tel-national"
                      inputMode="tel"
                      pattern="01[0-9]{9}"
                      maxLength={11}
                    />

                    {/* Unified Single Full Address Field (Division, District, Full Address combined) */}
                    <div className="sm:col-span-2 space-y-2">
                      <Field
                        label="Full Address / সম্পূর্ণ ঠিকানা (District, Thana/Area, Road/House)"
                        name="street"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder="e.g. বাড়ি ১২, রোড ৪, ধানমন্ডি, ঢাকা অথবা গ্রাম, থানা, জেলা (যেমন: পাবনা / সাভার / চট্টগ্রাম)"
                        autoComplete="street-address"
                        required
                        className="w-full"
                      />

                      {/* Real-time Location Detection & Rate Status Badge */}
                      {parsedAddress.isRecognized ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 transition-all shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="font-semibold truncate">{parsedAddress.badgeLabelBn}</span>
                          </div>
                          <span className="font-bold text-[#A80C14] bg-white px-2.5 py-0.5 rounded-lg border border-rose-100 shadow-xs shrink-0 ml-2">
                            {effectiveShippingFee === 0 ? 'ফ্রি ডেলিভারি' : `৳ ${effectiveShippingFee}`}
                          </span>
                        </div>
                      ) : address.trim() ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 px-1">
                          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>ঠিকানায় জেলা বা এলাকার নাম লিখলে ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে নির্ধারিত হবে (যেমন: পাবনা, সাভার, মিরপুর)।</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Delivery Fee Info Banner with Active Tier Highlight */}
                  <div className="p-3.5 bg-rose-50/60 border border-[#F8D2D5] rounded-2xl text-xs text-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-900 flex-wrap gap-1">
                      <span className="flex items-center gap-1.5 text-[#A80C14]">
                        <Truck className="w-4 h-4" /> Standard Delivery Rates
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPolicyModalOpen(true)}
                          className="text-[11px] text-[#A80C14] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" /> শর্তাবলী দেখুন
                        </button>
                        <span className="font-mono font-bold text-xs text-[#A80C14]">
                          {effectiveShippingFee === 0 ? 'Free Shipping' : `৳ ${effectiveShippingFee}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          parsedAddress.tier === 'dhaka_core' && parsedAddress.isRecognized
                            ? 'bg-[#A80C14] text-white font-bold shadow-xs'
                            : 'text-stone-600 bg-white/70 border border-[#F8D2D5]'
                        }`}
                      >
                        Inside Dhaka: <strong>৳80</strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          parsedAddress.tier === 'dhaka_subarea' && parsedAddress.isRecognized
                            ? 'bg-[#A80C14] text-white font-bold shadow-xs'
                            : 'text-stone-600 bg-white/70 border border-[#F8D2D5]'
                        }`}
                      >
                        Sub-area Dhaka: <strong>৳100</strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          (parsedAddress.tier === 'outside_dhaka' || !parsedAddress.isRecognized) && effectiveShippingFee === 150
                            ? 'bg-[#A80C14] text-white font-bold shadow-xs'
                            : 'text-stone-600 bg-white/70 border border-[#F8D2D5]'
                        }`}
                      >
                        Outside Dhaka: <strong>৳150</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                    {formError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#800020] hover:bg-[#660019] disabled:opacity-60 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide animate-pulse"
                >
                  {isSubmitting ? (
                    <span>PROCESSING ORDER...</span>
                  ) : (
                    <span>CONFIRM ORDER (CASH ON DELIVERY) — ৳{totalPayable}</span>
                  )}
                </button>

                <div className="text-center text-[11px] text-stone-400">
                  <span>🔒 100% Cash On Delivery · Inspect product upon arrival before payment</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: TRUST BADGES, FOOTER & FLOATING SUPPORT ─────────── */}
      {/* 1. Trust Bar (3 items flex row) */}
      <section className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-center gap-3">
            <Truck className="w-5 h-5 text-[#800020]" />
            <span className="text-xs font-bold text-stone-800">Fast Delivery</span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#800020]" />
            <span className="text-xs font-bold text-stone-800">Cash On Delivery</span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-center gap-3">
            <RotateCcw className="w-5 h-5 text-[#800020]" />
            <span className="text-xs font-bold text-stone-800">7-Day Return Policy</span>
          </div>
        </div>
      </section>

      {/* 2. Footer Columns */}
      <footer className="bg-[#1C1917] text-stone-300 text-xs pt-12 pb-8 px-4 sm:px-6 lg:px-8 mt-8 border-t border-stone-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8 pb-10 border-b border-stone-800 text-left">
          {/* Brand Column (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="group inline-flex items-center cursor-pointer">
              <div className="relative inline-flex items-center shrink-0">
                <Image
                  src="/Logo.jpg"
                  alt="Falak Closet Logo"
                  width={48}
                  height={48}
                  className="h-10 sm:h-12 max-w-[180px] rounded-md w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="mx-2 font-bold text-white text-base tracking-wide group-hover:text-[#E29FB6] transition-colors">
                Falak Closet
              </span>
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Falak Closet is your destination for handcrafted luxury abayas, silk hijabs, kaftans, dresses, and modest couture collections.
            </p>

            {/* Value Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] text-[10px] font-bold shadow-xs">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>Fast Delivery</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] text-[10px] font-bold shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>All Active</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] text-[10px] font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Modest style</span>
              </span>
            </div>

            {/* Social Links */}
            <div className="pt-2 flex items-center gap-2">
              <a
                href="https://instagram.com/falak_closet"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="group p-2.5 bg-[#FDF2F3] hover:bg-[#A80C14] text-[#A80C14] hover:text-white rounded-full transition-colors border border-[#F8D2D5]/80 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/falak.closet"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="group p-2.5 bg-[#FDF2F3] hover:bg-[#A80C14] text-[#A80C14] hover:text-white rounded-full transition-colors border border-[#F8D2D5]/80 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://wa.me/01889020503"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
                className="group p-2.5 bg-[#FDF2F3] hover:bg-[#A80C14] text-[#A80C14] hover:text-white rounded-full transition-colors border border-[#F8D2D5]/80 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current transition-colors" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Contact Info Col */}
          <div className="space-y-3">
            <p className="font-bold text-[#E29FB6] text-xs uppercase tracking-wider">Contact</p>
            <div className="space-y-2.5 text-[11px] text-stone-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#E29FB6] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white uppercase block text-[9px] tracking-wider">Dhaka</strong>
                  <span>Mirpur Dhaka</span>
                </div>
              </div>
              <a href="tel:01889020503" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-[#E29FB6] shrink-0" />
                <span>01889020503</span>
              </a>
              <a href="mailto:info@falakcloset.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-[#E29FB6] shrink-0" />
                <span>info@falakcloset.com</span>
              </a>
            </div>
          </div>

          {/* Account Links */}
          <div className="space-y-3">
            <p className="font-bold text-[#E29FB6] text-xs uppercase tracking-wider">Account</p>
            <ul className="space-y-2 text-[11px] text-stone-400">
              <li><Link href="/account" className="hover:text-white transition-colors">My profile</Link></li>
              <li><Link href="/account" className="hover:text-white transition-colors">Order history</Link></li>
              <li><Link href="/track" className="hover:text-white transition-colors">Track order</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
            </ul>
          </div>

          {/* Help Links */}
          <div className="space-y-3">
            <p className="font-bold text-[#E29FB6] text-xs uppercase tracking-wider">Help</p>
            <ul className="space-y-2 text-[11px] text-stone-400">
              <li><Link href="/shipping" className="hover:text-white transition-colors">Delivery charge</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Refunds &amp; exchange</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} <strong className="font-semibold text-stone-300">FALAK CLOSET</strong>. All Rights Reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Design &amp; Development by</span>
            <a
              href="https://brightfuturesoft.com/?ref=falakcloset"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E29FB6] font-bold hover:underline transition-colors cursor-pointer"
            >
              Bright Future Soft
            </a>
          </p>
        </div>
      </footer>

      {/* 3. Floating Sticky Elements */}

      {/* Sticky Mobile Bottom Bar: visible past hero, hidden when reaching checkout form */}
      {showStickyBar && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F8D2D5] px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <div>
            <p className="text-[10px] text-stone-400 line-through font-mono">৳{regularPrice}</p>
            <p className="font-mono font-black text-lg text-[#800020] leading-tight">
              ৳{offerPrice}
            </p>
          </div>
          <button
            onClick={scrollToCheckout}
            className="flex-1 py-3 bg-[#800020] hover:bg-[#660019] text-white font-extrabold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order Now</span>
          </button>
        </div>
      )}

      {/* ─── Modal: Account Sign In / Sign Up Before Order ──────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#800020] to-[#5B060B] text-white p-6 relative">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthModalError('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3 text-white">
                {authMode === 'signin' ? (
                  <LogIn className="w-6 h-6" />
                ) : (
                  <UserPlus className="w-6 h-6" />
                )}
              </div>

              <h3 className="font-serif font-extrabold text-xl text-white">
                {authMode === 'signin'
                  ? 'Sign In to Confirm Order'
                  : 'Create Account to Confirm Order'}
              </h3>
              <p className="text-xs text-rose-100/90 mt-1 leading-relaxed">
                {authMode === 'signin'
                  ? 'Welcome back! Please enter your password to place this order under your account.'
                  : 'Set a password to create your Falak Closet account and complete your order.'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer summary card */}
              <div className="p-3 bg-[#FAF6F4] rounded-2xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Name:</span>
                  <span className="font-bold text-stone-900">{fullName || 'Customer'}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span>Phone Number:</span>
                  <span className="font-mono font-bold text-stone-900">{phone}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600 pt-1 border-t border-stone-200/80">
                  <span>Order Total:</span>
                  <span className="font-mono font-black text-[#800020]">৳{totalPayable}</span>
                </div>
              </div>

              {/* Error Message */}
              {authModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 animate-in fade-in">
                  {authModalError}
                </div>
              )}

              {/* Form depending on authMode */}
              {authMode === 'signin' ? (
                <form onSubmit={handleModalSignIn} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Account Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        autoFocus
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full text-xs sm:text-sm px-4 py-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPasswordText ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <Link
                      href="/account?type=forgot"
                      target="_blank"
                      className="text-[#800020] font-bold hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuthModal}
                    className="w-full py-3.5 bg-[#800020] hover:bg-[#660019] disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    {isSubmittingAuthModal ? (
                      <span>Verifying &amp; Placing Order...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In &amp; Confirm Order — ৳{totalPayable}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthPassword('');
                        setAuthConfirmPassword('');
                        setAuthModalError('');
                      }}
                      className="text-xs text-stone-600 hover:text-[#800020] font-semibold cursor-pointer"
                    >
                      Don&apos;t have an account yet?{' '}
                      <span className="text-[#800020] font-bold underline">Create New Account</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleModalSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Email Address <span className="text-stone-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com (optional)"
                      className="w-full text-xs sm:text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Create Password <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        autoFocus
                        minLength={6}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Set password (min 6 characters)"
                        className="w-full text-xs sm:text-sm px-4 py-2.5 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPasswordText ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Confirm Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full text-xs sm:text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                    />
                    {authConfirmPassword && (
                      <p
                        className={`text-[10px] font-bold mt-1 ${authPassword === authConfirmPassword
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                          }`}
                      >
                        {authPassword === authConfirmPassword
                          ? '✓ Passwords match'
                          : '✕ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuthModal}
                    className="w-full py-3.5 bg-[#800020] hover:bg-[#660019] disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide mt-2"
                  >
                    {isSubmittingAuthModal ? (
                      <span>Creating Account &amp; Placing Order...</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account &amp; Confirm Order — ৳{totalPayable}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setAuthPassword('');
                        setAuthConfirmPassword('');
                        setAuthModalError('');
                      }}
                      className="text-xs text-stone-600 hover:text-[#800020] font-semibold cursor-pointer"
                    >
                      Already have an account?{' '}
                      <span className="text-[#800020] font-bold underline">Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delivery & Order Policy Modal */}
      {isPolicyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Delivery and Order Policy"
          onClick={(e) => e.target === e.currentTarget && setIsPolicyModalOpen(false)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 max-w-xl w-full shadow-2xl overflow-hidden text-stone-900 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#A80C14] to-[#8C0A10] text-white p-4 sm:p-5 text-left relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                aria-label="Close policy modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                    ডেলিভারি ও অর্ডার নিয়মাবলী
                  </h3>
                  <p className="text-[11px] text-rose-100/90 font-medium">
                    Falak Closet — Order &amp; Delivery Policy
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable Organized Sections */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-grow text-xs leading-relaxed divide-y divide-stone-100">
              {/* 1. Cash on Delivery Condition */}
              <div className="space-y-2 pt-1 first:pt-0">
                <div className="flex items-center gap-2 font-extrabold text-stone-900 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                  <span>ক্যাশ অন ডেলিভারি (Cash on Delivery)</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-900 font-semibold leading-relaxed">
                  ৮০% সফলভাবে ডেলিভারী নেওয়ার রেকর্ড থাকলে ক্যাশ অন ডেলিভারী পাবেন, না থাকলে ডেলিভারী চার্জ এডভান্স করে প্রোডাক্ট নিতে হবে।
                </div>
              </div>

              {/* 2. Delivery Fee Rates */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 font-extrabold text-stone-900 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-[#A80C14] text-xs flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </span>
                  <span>ডেলিভারি চার্জ (Delivery Charges)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-center space-y-0.5">
                    <span className="block text-[10px] text-stone-500 font-semibold">ঢাকার মধ্যে</span>
                    <span className="block font-black text-sm text-[#A80C14]">৳ ৮০</span>
                  </div>
                  <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-center space-y-0.5">
                    <span className="block text-[10px] text-stone-500 font-semibold">ঢাকার পাশ্ববর্তী এরিয়া</span>
                    <span className="block font-black text-sm text-[#A80C14]">৳ ১০০</span>
                  </div>
                  <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-center space-y-0.5">
                    <span className="block text-[10px] text-stone-500 font-semibold">ঢাকার বাহিরে</span>
                    <span className="block font-black text-sm text-[#A80C14]">৳ ১৫০</span>
                  </div>
                </div>
              </div>

              {/* 3. Order Confirmation & Delivery Process */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 font-extrabold text-stone-900 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs flex items-center justify-center shrink-0">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </span>
                  <span>অর্ডার প্রসেসিং ও কনফার্মেশন</span>
                </div>
                <ul className="space-y-2 text-stone-700 font-medium pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>নাম, ফোন নম্বর ও ঠিকানা দিয়ে অর্ডার কনফার্ম করুন।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">🍂</span>
                    <span>আমাদের সব পণ্যের দাম ফিক্সড।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>পেইজ থেকে কনফার্মেশন কল দেওয়া হবে। কনফার্মেশন কলটি রিসিভ করার পর পার্সেলটি পাঠানো হবে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>কলে কনফার্ম করার পর অর্ডার ক্যান্সেল বা চেঞ্জ করা হয় না।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>কনফার্মেশন কল পাওয়ার পর ২-৩ দিনে পার্সেল পাবেন।</span>
                  </li>
                </ul>
              </div>

              {/* 4. Color & Display Disclaimer */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 font-extrabold text-stone-900 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 text-xs flex items-center justify-center shrink-0">
                    <Palette className="w-3.5 h-3.5" />
                  </span>
                  <span>কালার সংক্রান্ত নোটিশ (Color Disclaimer)</span>
                </div>
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-purple-900 font-medium">
                  ক্যামেরা এবং ফোনের ডিসপ্লে এর ভিন্নতার জন্যে কালার লাইট কিংবা ডিপ দেখা যেতে পারে।
                </div>
              </div>

              {/* 5. Return & Parcel Checking Policy */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 font-extrabold text-stone-900 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 text-xs flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </span>
                  <span>পার্সেল চেক ও রিটার্ন পলিসি</span>
                </div>
                <ul className="space-y-2 text-stone-700 font-medium pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>ডেলিভারী ম্যানের সামনে পার্সেল চেক করে নিবেন।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>আমাদের পার্সেল রিটার্ন করতে হলে সম্পূর্ণ পার্সেল রিটার্ন করে দিবেন ডেলিভারী খরচ দিয়ে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>আমাদের পেইজ থেকে কোনো পার্সিয়াল ডেলিভারী দেওয়া হয় না।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#A80C14] shrink-0 font-bold">•</span>
                    <span>পার্সেলটি রিসিভ করার পর আমাদের পেইজ থেকে রিটার্ন নেওয়া হয় না।</span>
                  </li>
                </ul>
              </div>

              {/* Accordion showing verbatim full prompt message text */}
              <div className="pt-4">
                <details className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden group">
                  <summary className="p-3 font-bold text-stone-700 text-[11px] cursor-pointer flex items-center justify-between group-open:border-b group-open:border-stone-200">
                    <span>মূল নোটিশের সম্পূর্ণ টেক্সট (Full Policy Text)</span>
                    <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3.5 text-[11px] text-stone-600 leading-relaxed font-sans bg-white border-t border-stone-100">
                    &quot;৮০% সফলভাবে ডেলিভারী নেওয়ার রেকর্ড থাকলে ক্যাশ অন ডেলিভারী পাবেন, না থাকলে ডেলিভারী চার্জ এডভান্স করে প্রোডাক্ট নিতে হবে। ঢাকা মধ্যে ডেলিভারি চার্জ ৮০ টাকা, ঢাকার পাশ্ববর্তী এরিয়া ১০০ টাকা এবং ঢাকার বাহিরে ১৫০ টাকা। নাম ফোন নম্বার ঠিকানা দিয়ে অর্ডার কনফার্ম করুন। ক্যামেরা এবং ফোনের ডিস্প্লে এর ভিন্যতার জন্যে কালার লাইট কিংবা ডিপ দেখা যেতে পারে। 🍂আমাদের সব পণ্যের দাম ফিক্সড পেইজ থেকে কনফার্মেশন কল দেওয়া হবে।কনফার্মেশন কলটি রিসিভ করার পর পার্সেলটি পাঠানো হবে। কলে কানফার্ম করার পর অর্ডার ক্যান্সেল বা চেন্জ করা হয় না। কনফার্মেশন কল পাওয়ার পর ২-৩ দিনে পার্সেল পাবেন। ডেলিভারী ম্যানের সামনে পার্সেল চেক করে নিবেন। আমাদের পার্সেল রিটার্ন করতে হলে সম্পূর্ণ পার্সেল রিটার্ন করে দিবেন ডেলিভারী  খরচ দিয়ে। আমাদের পেইজ থেকে কোনো পার্সিয়াল ডেলিভারী দেওয়া হয় না। পার্সেলটি রিসিভ করার পর আমাদের পেইজ থেকে রিটার্ন নেওয়া হয় না।&quot;
                  </div>
                </details>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-full sm:w-auto min-h-[44px] px-6 bg-[#A80C14] hover:bg-[#8C0A10] active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>বুঝেছি, অর্ডার সম্পন্ন করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
