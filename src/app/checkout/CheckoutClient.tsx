'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Lock,
  ArrowRight,
  ArrowLeft,
  X,
  Banknote,
  Smartphone,
  ChevronDown,
  ShoppingBag,
  Ticket,
  FileText,
  Info,
  PhoneCall,
  Palette,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';
import { useCart, OrderRecord, DeliverySubArea } from '@/context/CartContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import {
  isDhakaCity,
  isDhakaSubArea,
  getSearchableTerms,
  matchZoneFromText,
  calculateShippingFee,
  checkIsFreeDelivery,
  parseAddressLocation,
} from '@/lib/shipping/locationBilingual';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
  getDistrictsByDivision,
  findDistrict,
} from '@/lib/shipping/bangladeshLocations';
import { getProductVariationImage, getProductVariationPrice, getProductVariationColorHex } from '@/lib/utils';

/** Shared 44px-touch-target text field. */
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
      <label htmlFor={`co-${name}`} className="text-[11px] sm:text-xs font-bold text-stone-700">
        {label} {required && <span className="text-[#A80C14]">*</span>}
      </label>
      <input
        id={`co-${name}`}
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

/** Interactive searchable select dropdown for Division, City, District, Zone, Area */
function SearchableSelect<T extends string | number = string | number>({
  label,
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  loading = false,
  className = '',
}: {
  label: string;
  id: string;
  options: Array<{ value: T; label: string; subLabel?: string }>;
  value: T | null;
  onChange: (val: T | null) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((o) => {
      const terms = getSearchableTerms(o.label);
      return (
        terms.some((t) => t.toLowerCase().includes(q)) ||
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q))
      );
    });
  }, [options, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${className}`}>
      <label htmlFor={id} className="text-[11px] sm:text-xs font-bold text-stone-700 flex items-center justify-between">
        <span>{label} {required && <span className="text-[#A80C14]">*</span>}</span>
        {selectedOption && <span className="text-[10px] text-emerald-600 font-semibold">✓ Selected</span>}
      </label>

      {/* Hidden input for standard HTML form validation */}
      <input
        type="text"
        id={id}
        tabIndex={-1}
        required={required}
        value={value ? String(value) : ''}
        onChange={() => { }}
        className="sr-only"
        aria-hidden="true"
      />

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchQuery('');
        }}
        className={`w-full min-h-[44px] px-4 bg-stone-50 border rounded-2xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all ${isOpen
          ? 'border-[#A80C14] ring-2 ring-[#A80C14]/20 bg-white shadow-sm'
          : 'border-stone-200 hover:border-stone-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${selectedOption ? 'font-bold text-stone-900' : 'text-stone-400'}`}>
          {loading ? 'Loading options…' : selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#A80C14]' : ''}`} />
      </button>

      {/* Floating Search Dropdown Overlay */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                placeholder={`Search ${label.toLowerCase()}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-3 pr-8 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#A80C14]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-stone-50 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-[11px] font-medium">
                No matching {label.toLowerCase()} found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${isSelected
                      ? 'bg-[#FDF2F3] text-[#A80C14] font-bold'
                      : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-stone-400 font-normal truncate">{opt.subLabel}</span>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#A80C14] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const {
    cart,
    subtotal: cartSubtotal,
    discountAmount,
    shippingFee: cartShippingFee,
    placeOrder,
    deliveryZones,
    selectedZoneId,
    selectedSubAreaId,
    setSelectedZone,
    selectedZoneName,
    selectedSubAreaName,
    appliedCoupon,
    applyPromoCode,
    removePromoCode,
    promoNotice,
    totalAmount: cartTotalAmount,
    user,
    getProductBySlug,
    products,
    freeShippingThreshold,
    quantityFreeDelivery,
    updateQuantity,
  } = useCart();
  const { trackEvent } = useAnalytics();

  // ── Buy Now Mode ─────────────────────────────────────────────────────────────
  // When the user clicks "Buy Now" on a product card, we encode the item into
  // the URL. The checkout then shows ONLY that item — the cart is untouched.
  const buyNowProductId = searchParams.get('buyNow');
  const buyNowColor = searchParams.get('color') ?? '';
  const buyNowSize = searchParams.get('size') ?? '';
  const initialBuyNowQty = Math.max(1, parseInt(searchParams.get('qty') ?? '1', 10));
  const [buyNowQtyOverride, setBuyNowQtyOverride] = useState<number | null>(null);

  const buyNowQty = buyNowQtyOverride ?? initialBuyNowQty;

  const buyNowProduct = useMemo(() => {
    if (!buyNowProductId) return null;
    return products.find((p) => p.id === buyNowProductId) ??
      getProductBySlug(buyNowProductId) ??
      null;
  }, [buyNowProductId, products, getProductBySlug]);

  const buyNowItems = useMemo(() => {
    if (!buyNowProduct) return null;
    return [{
      product: buyNowProduct,
      selectedColor: buyNowColor || buyNowProduct.colors?.[0]?.name || '',
      selectedSize: buyNowSize || buyNowProduct.sizes?.[0] || 'Free Size',
      quantity: buyNowQty,
    }];
  }, [buyNowProduct, buyNowColor, buyNowSize, buyNowQty]);

  // Handler to adjust item quantity directly from Checkout Page order summary
  const handleUpdateQty = (
    item: { product: any; selectedColor: string; selectedSize: string; quantity: number },
    delta: number
  ) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    if (buyNowProductId) {
      setBuyNowQtyOverride(newQty);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('qty', String(newQty));
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      updateQuantity(item.product.id, item.selectedColor, item.selectedSize, newQty);
    }
  };

  // Use buyNow items when in that mode, otherwise fall back to cart
  const activeItems = buyNowItems ?? cart;

  // Recompute totals when in buyNow mode (ignore promo/shipping for simplicity;
  // shipping logic mirrors CartContext)
  const subtotal = useMemo(() => {
    if (!buyNowItems) return cartSubtotal;
    return buyNowItems.reduce(
      (s, i) => s + getProductVariationPrice(i.product, i.selectedColor, i.selectedSize) * i.quantity,
      0
    );
  }, [buyNowItems, cartSubtotal]);

  const shippingFee = useMemo(() => {
    if (!buyNowItems) return cartShippingFee;
    const hasFreeThreshold =
      typeof freeShippingThreshold === 'number' &&
      freeShippingThreshold > 0 &&
      freeShippingThreshold < Infinity;
    return hasFreeThreshold && subtotal >= freeShippingThreshold ? 0 : cartShippingFee;
  }, [buyNowItems, cartShippingFee, subtotal, freeShippingThreshold]);


  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    division: '',
    district: '',
    street: '',
    city: '',
    country: 'Bangladesh',
    postalCode: '',
  });

  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  // ── Smart Bilingual Address Parsing with Zero Mismatch Guarantee ─────────────
  const parsedAddress = useMemo(() => {
    return parseAddressLocation(formData.street);
  }, [formData.street]);

  // Keep division, district, and Pathao city strictly synced with parsedAddress
  useEffect(() => {
    if (parsedAddress.isRecognized) {
      if (parsedAddress.district?.id) {
        setSelectedDistrictId(parsedAddress.district.id);
      }
      if (parsedAddress.division?.id) {
        setSelectedDivisionId(parsedAddress.division.id);
        if (parsedAddress.division.pathaoCityId) {
          setSelectedPathaoCityId(parsedAddress.division.pathaoCityId);
        }
      }
    }
  }, [parsedAddress]);

  // ── Pathao Dynamic Shipping State ──────────────────────────────────────────
  const [pathaoCities, setPathaoCities] = useState<Array<{ city_id: number; city_name: string }>>([]);
  const [pathaoZones, setPathaoZones] = useState<Array<{ zone_id: number; zone_name: string }>>([]);
  const [pathaoAreas, setPathaoAreas] = useState<Array<{ area_id: number; area_name: string }>>([]);

  const [selectedPathaoCityId, setSelectedPathaoCityId] = useState<number | null>(null);
  const [selectedPathaoZoneId, setSelectedPathaoZoneId] = useState<number | null>(null);
  const [selectedPathaoAreaId, setSelectedPathaoAreaId] = useState<number | null>(null);

  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [pathaoShippingError, setPathaoShippingError] = useState<string | null>(null);

  const [pathaoCourierFee, setPathaoCourierFee] = useState<number | null>(null);
  const [pathaoCustomerFee, setPathaoCustomerFee] = useState<number | null>(null);
  const [isPathaoFreeShipping, setIsPathaoFreeShipping] = useState<boolean>(false);

  // Load Pathao Cities on Mount
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        const res = await fetch('/api/shipping/pathao/cities');
        const data = await res.json();
        if (data.success && Array.isArray(data.cities)) {
          setPathaoCities(data.cities);
        }
      } catch (err) {
        console.error('Failed to fetch Pathao cities:', err);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Auto-match Pathao City ID if formData.city exists
  useEffect(() => {
    if (pathaoCities.length > 0 && formData.city && !selectedPathaoCityId) {
      const cleanCity = formData.city.toLowerCase().trim();
      const matched = pathaoCities.find(
        (c) => c.city_name.toLowerCase().trim() === cleanCity || cleanCity.includes(c.city_name.toLowerCase().trim())
      );
      if (matched) {
        setSelectedPathaoCityId(matched.city_id);
      }
    }
  }, [pathaoCities, formData.city, selectedPathaoCityId]);

  // Auto-fill Postal Code based on selected Pathao City & Zone
  useEffect(() => {
    if (!selectedPathaoCityId) return;

    const ZONE_POSTAL_MAP: Record<number, string> = {
      101: '1205', // Dhanmondi
      102: '1230', // Uttara
      103: '1212', // Gulshan
      104: '1216', // Mirpur
      105: '1207', // Mohammadpur
      106: '1229', // Bashundhara
      201: '4100', // Agrabad
      202: '4000', // GEC
      301: '3100', // Zindabazar
    };

    const CITY_POSTAL_MAP: Record<number, string> = {
      1: '1200', // Dhaka
      2: '4000', // Chattogram
      3: '3100', // Sylhet
      4: '9000', // Khulna
      5: '6000', // Rajshahi
      6: '8200', // Barishal
      7: '5400', // Rangpur
      8: '2200', // Mymensingh
    };

    const autoPostcode =
      (selectedPathaoZoneId && ZONE_POSTAL_MAP[selectedPathaoZoneId]) ||
      CITY_POSTAL_MAP[selectedPathaoCityId] ||
      '1000';

    setFormData((prev) => ({ ...prev, postalCode: autoPostcode }));
  }, [selectedPathaoCityId, selectedPathaoZoneId]);

  // Load Pathao Zones when City is selected
  useEffect(() => {
    if (!selectedPathaoCityId) {
      setPathaoZones([]);
      setSelectedPathaoZoneId(null);
      setPathaoAreas([]);
      setSelectedPathaoAreaId(null);
      setPathaoCourierFee(null);
      setPathaoCustomerFee(null);
      return;
    }

    const fetchZones = async () => {
      setIsLoadingZones(true);
      setPathaoZones([]);
      setSelectedPathaoZoneId(null);
      setPathaoAreas([]);
      setSelectedPathaoAreaId(null);
      setPathaoCourierFee(null);
      setPathaoCustomerFee(null);
      try {
        const res = await fetch(`/api/shipping/pathao/zones?cityId=${selectedPathaoCityId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.zones)) {
          setPathaoZones(data.zones);
        }
      } catch (err) {
        console.error('Failed to fetch Pathao zones:', err);
      } finally {
        setIsLoadingZones(false);
      }
    };
    fetchZones();
  }, [selectedPathaoCityId]);

  // Auto-detect Pathao Zone from Full Address (supports Bengali & English text)
  useEffect(() => {
    if (!pathaoZones || pathaoZones.length === 0) return;
    const cleanStreet = (formData?.street || '').trim();

    const matchedZoneId = matchZoneFromText(cleanStreet, pathaoZones);

    if (matchedZoneId) {
      setSelectedPathaoZoneId(matchedZoneId);
    } else {
      // If user cleared sub-area or address text doesn't match a sub-area, default to primary city zone
      const defaultZone = pathaoZones.find((z) => !isDhakaSubArea(z.zone_name)) || pathaoZones[0];
      if (defaultZone && selectedPathaoZoneId !== defaultZone.zone_id) {
        setSelectedPathaoZoneId(defaultZone.zone_id);
      }
    }
  }, [pathaoZones, formData?.street]);

  // Load Pathao Areas and auto-detect Area from Full Address
  useEffect(() => {
    if (!selectedPathaoCityId || !selectedPathaoZoneId) {
      setPathaoAreas([]);
      setSelectedPathaoAreaId(null);
      setPathaoCourierFee(null);
      setPathaoCustomerFee(null);
      return;
    }

    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      setPathaoAreas([]);
      setSelectedPathaoAreaId(null);
      try {
        const res = await fetch(`/api/shipping/pathao/areas?zoneId=${selectedPathaoZoneId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.areas)) {
          setPathaoAreas(data.areas);
          const cleanStreet = (formData?.street || '').toLowerCase().trim();
          const matchedArea = data.areas.find((a: { area_name: string }) => {
            const aName = a.area_name.toLowerCase();
            return cleanStreet.includes(aName);
          });
          if (matchedArea) {
            setSelectedPathaoAreaId(matchedArea.area_id);
          } else if (data.areas.length > 0) {
            setSelectedPathaoAreaId(data.areas[0].area_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Pathao areas:', err);
      } finally {
        setIsLoadingAreas(false);
      }
    };
    fetchAreas();
  }, [selectedPathaoCityId, selectedPathaoZoneId]);

  const isFreeDeliveryUnlocked = useMemo(() => {
    return checkIsFreeDelivery(
      activeItems,
      subtotal,
      Number(freeShippingThreshold)
    );
  }, [activeItems, subtotal, freeShippingThreshold]);

  const calculatedDeliveryFee = useMemo(() => {
    const selectedZoneObj = pathaoZones.find((z) => z.zone_id === selectedPathaoZoneId);
    const result = calculateShippingFee({
      district: parsedAddress.districtNameEn || formData.district || formData.city,
      city: parsedAddress.districtNameEn || formData.city,
      division: parsedAddress.divisionNameEn || formData.division,
      address: formData.street,
      zoneName: selectedZoneObj?.zone_name,
      subtotal,
      freeShippingThreshold: Number(freeShippingThreshold),
      isFreeDelivery: isFreeDeliveryUnlocked,
      items: activeItems,
    });
    return result.fee;
  }, [parsedAddress, formData.district, formData.city, formData.division, formData.street, subtotal, freeShippingThreshold, pathaoZones, selectedPathaoZoneId, isFreeDeliveryUnlocked, activeItems]);

  const effectiveShippingFee = isFreeDeliveryUnlocked ? 0 : calculatedDeliveryFee;

  const effectiveTotalAmount = useMemo(() => {
    return Math.max(0, subtotal - (buyNowItems ? 0 : discountAmount) + effectiveShippingFee);
  }, [subtotal, buyNowItems, discountAmount, effectiveShippingFee]);

  const totalAmount = effectiveTotalAmount;

  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isIpBlocked, setIsIpBlocked] = useState(false);
  const [userIp] = useState<string>('103.24.12.89');

  // Mobile summary disclosure + sticky CTA
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  // bKash manual payment settings state
  const [bkashSettings, setBkashSettings] = useState<{
    bkashNumber?: string;
    bkashAccountType?: string;
    instructions?: string[];
  } | null>(null);
  const [isBkashModalOpen, setIsBkashModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [bkashSenderNumber, setBkashSenderNumber] = useState('');
  const [bkashTrxId, setBkashTrxId] = useState('');
  const [bkashError, setBkashError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyNumber = () => {
    if (bkashSettings?.bkashNumber) {
      navigator.clipboard.writeText(bkashSettings.bkashNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Auto-select zone based on user's district
  React.useEffect(() => {
    const targetCity = (formData.district || formData.city || '').toLowerCase().trim();
    if (!targetCity || deliveryZones.length === 0) return;
    if (targetCity.includes('dhaka') && !isDhakaSubArea(formData.street)) {
      const dhakaZone = deliveryZones.find(z => z.name.toLowerCase().includes('inside dhaka'));
      if (dhakaZone && selectedZoneId !== dhakaZone.id) {
        setSelectedZone(dhakaZone.id, null);
      }
    } else {
      const outsideZone = deliveryZones.find(z => z.name.toLowerCase().includes('outside dhaka'));
      if (outsideZone && selectedZoneId !== outsideZone.id) {
        setSelectedZone(outsideZone.id, null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.district, formData.city, formData.street, deliveryZones]);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings?key=payment');
        const data = await res.json();
        if (data.success && data.setting) {
          setBkashSettings(data.setting.value);
        }
      } catch {
        console.error('Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  // Auto fill shipping address
  React.useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        if (user.email) setUserEmail(user.email);
        const userDistName = user.district || '';
        const matchedDist = userDistName ? findDistrict(userDistName) : undefined;
        if (matchedDist) {
          setSelectedDistrictId(matchedDist.id);
          setSelectedDivisionId(matchedDist.divisionId);
          const divObj = BANGLADESH_DIVISIONS.find((d) => d.id === matchedDist.divisionId);
          if (divObj) {
            setSelectedPathaoCityId(divObj.pathaoCityId);
          }
        }
        setFormData((prev) => ({
          ...prev,
          fullName: user.name || prev.fullName,
          phone: user.phone || prev.phone,
          city: matchedDist?.nameEn || user.district || prev.city,
          district: matchedDist?.nameEn || user.district || prev.district,
          division: matchedDist?.divisionNameEn || prev.division,
          street: user.fullAddress || prev.street,
        }));
      });
    }
  }, [user]);

  // Check IP blocking status
  React.useEffect(() => {
    const checkBlockedIp = async () => {
      try {
        const res = await fetch('/api/security/block-ip');
        const data = await res.json();
        const localBlocked = JSON.parse(localStorage.getItem('falak_blocked_ips') || '[]');
        const allBlocked = [...(data.blockedIps || []), ...localBlocked];
        const isBlocked = allBlocked.some((b: { ip: string }) => b.ip === userIp);
        if (isBlocked) setIsIpBlocked(true);
      } catch {
        const localBlocked = JSON.parse(localStorage.getItem('falak_blocked_ips') || '[]');
        if (localBlocked.some((b: { ip: string }) => b.ip === userIp)) setIsIpBlocked(true);
      }
    };
    if (userIp) {
      checkBlockedIp();
    }
  }, [userIp]);

  // Lock background scroll, close on Escape for bKash & Policy modals
  useEffect(() => {
    if (!isBkashModalOpen && !isPolicyModalOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBkashModalOpen(false);
        setIsPolicyModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isBkashModalOpen, isPolicyModalOpen]);

  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoFeedback(null);

    const res = await applyPromoCode(promoCodeInput.trim());
    if (res.success) {
      setPromoFeedback({ type: 'success', message: res.message });
      setPromoCodeInput('');
    } else {
      setPromoFeedback({ type: 'error', message: res.message });
    }
    setIsValidatingPromo(false);
  };
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'street') {
        const parsed = parseAddressLocation(value);
        if (parsed.isRecognized) {
          next.district = parsed.districtNameEn;
          next.division = parsed.divisionNameEn;
          next.city = parsed.districtNameEn;
          if (parsed.division?.pathaoCityId) {
            setSelectedPathaoCityId(parsed.division.pathaoCityId);
          }
        }
      }
      return next;
    });
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeItems.length === 0 || isIpBlocked) return;

    if (paymentMethod === 'bKash Send Money (Manual)' && !isBkashModalOpen) {
      // Intercept to display the gateway-style bKash payment portal first
      setIsBkashModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setBkashError(null);

    try {
      const parsed = parseAddressLocation(formData.street);
      const currentDist = parsed.district || BANGLADESH_DISTRICTS.find((d) => d.id === selectedDistrictId);
      const currentDiv = parsed.division || BANGLADESH_DIVISIONS.find((d) => d.id === selectedDivisionId);

      const districtName =
        parsed.districtNameEn ||
        currentDist?.nameEn ||
        formData.district ||
        formData.city ||
        (parsed.tier === 'dhaka_core' || parsed.tier === 'dhaka_subarea' ? 'Dhaka' : '');

      const divisionName =
        parsed.divisionNameEn ||
        currentDiv?.nameEn ||
        formData.division ||
        (parsed.tier === 'dhaka_core' || parsed.tier === 'dhaka_subarea' ? 'Dhaka' : '');

      const selectedCityObj = pathaoCities.find((c) => c.city_id === selectedPathaoCityId);
      const selectedZoneObj = pathaoZones.find((z) => z.zone_id === selectedPathaoZoneId);
      const selectedAreaObj = pathaoAreas.find((a) => a.area_id === selectedPathaoAreaId);

      const pathaoCityIdToUse = parsed.division?.pathaoCityId || currentDiv?.pathaoCityId || selectedPathaoCityId || undefined;

      const updatedShippingAddress = {
        ...formData,
        division: divisionName,
        district: districtName,
        city: districtName,
        street: formData.street,
        fullAddress: formData.street,
        pathaoCityId: pathaoCityIdToUse,
        pathaoZoneId: selectedPathaoZoneId || undefined,
        pathaoAreaId: selectedPathaoAreaId || undefined,
        pathaoCityName: divisionName || selectedCityObj?.city_name || undefined,
        pathaoZoneName: selectedZoneObj?.zone_name || undefined,
        pathaoAreaName: selectedAreaObj?.area_name || undefined,
      };

      const orderPayload: Record<string, unknown> = {
        items: activeItems,
        subtotal,
        discount: buyNowItems ? 0 : discountAmount,
        shippingFee: effectiveShippingFee,
        courierDeliveryFee: pathaoCourierFee || undefined,
        total: totalAmount,
        shippingAddress: updatedShippingAddress,
        deliveryMethod: districtName
          ? `Standard Delivery (${parsed.thanaNameEn ? `${parsed.thanaNameEn}, ` : ''}${districtName}${divisionName ? `, ${divisionName}` : ''})`
          : selectedZoneName + (selectedSubAreaName ? ` - ${selectedSubAreaName}` : ''),
        paymentMethod,
        userEmail,
        userIp,
        deliveryZone: divisionName || selectedZoneObj?.zone_name || selectedZoneName,
        deliverySubArea: parsed.thanaNameEn || districtName || selectedAreaObj?.area_name || selectedSubAreaName || undefined,
        promoCode: appliedCoupon?.code || undefined,
      };

      if (paymentMethod === 'bKash Send Money (Manual)') {
        if (!/^01\d{9}$/.test(bkashSenderNumber.trim())) {
          setBkashError('Please enter a valid 11-digit bKash number.');
          setIsSubmitting(false);
          return;
        }
        if (!bkashTrxId.trim() || bkashTrxId.trim().length < 6) {
          setBkashError('Please enter a valid Transaction ID.');
          setIsSubmitting(false);
          return;
        }
        orderPayload.paymentSenderNumber = bkashSenderNumber.trim();
        orderPayload.paymentTrxId = bkashTrxId.trim().toUpperCase();
        orderPayload.paymentStatus = 'Pending';
      }

      const order = await placeOrder(orderPayload as any);

      trackEvent('purchase', {
        orderId: order.id,
        itemCount: order.items.length,
        totalValue: order.total,
        paymentMethod: order.paymentMethod
      });

      setCreatedOrder(order);
      setIsBkashModalOpen(false);
    } catch (err) {
      console.error('Order placement error:', err);
      setBkashError('An error occurred while placing the order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isIpBlocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider">
            Access Restricted
          </span>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-stone-900">
            IP Address Blocked
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            Your IP address (<strong className="font-mono">{userIp}</strong>) has been restricted by system administration due to security policies.
          </p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 text-left space-y-1">
          <p className="font-bold">What can you do?</p>
          <p>• If you believe this is an error, please contact Falak Closet Support.</p>
          <p>• Admin team can lift the IP restriction from Security Settings.</p>
        </div>
      </div>
    );
  }

  if (createdOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center space-y-6 pb-32 lg:pb-16">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
            Order Confirmed &amp; Placed
          </span>
          <h1 className="font-sans text-2xl sm:text-4xl font-extrabold text-stone-900">
            Thank You for Your Order!
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            Your order has been recorded and synced live to our Admin Fulfillment Dashboard.
          </p>
        </div>

        {/* Order Receipt Box */}
        <div className="p-4 sm:p-6 bg-white rounded-3xl border border-[#F8D2D5] text-left space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#F8D2D5] pb-3 gap-2">
            <div>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">Order Reference ID</span>
              <div className="font-mono font-bold text-lg sm:text-xl text-[#A80C14] break-all">
                {createdOrder.id}
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">Tracking Number</span>
              <div className="font-mono text-xs font-bold text-stone-700">
                {createdOrder.trackingNumber}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-stone-900">Shipping Address:</p>
              <p className="text-stone-500">{createdOrder.shippingAddress.fullName}</p>
              <p className="text-stone-500">{createdOrder.shippingAddress.street}</p>
              <p className="text-stone-500">
                {createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.country} ({createdOrder.shippingAddress.postalCode})
              </p>
              <p className="text-stone-500">Phone: {createdOrder.shippingAddress.phone}</p>
            </div>

            <div>
              <p className="font-bold text-stone-900">Delivery &amp; Payment:</p>
              <p className="text-stone-500">{createdOrder.deliveryMethod}</p>
              <p className="text-stone-500">{createdOrder.paymentMethod}</p>
              <p className="font-bold text-[#A80C14] mt-2 font-mono text-sm">
                Total Paid: ৳ {createdOrder.total}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/track?id=${createdOrder.id}`}
            className="w-full sm:w-auto min-h-[48px] px-8 inline-flex items-center justify-center bg-[#A80C14] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#8C0A10] active:scale-95 transition-all shadow-md gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Track Order Status</span>
          </Link>
          <Link
            href="/shop"
            className="w-full sm:w-auto min-h-[48px] px-8 inline-flex items-center justify-center bg-stone-900 text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-stone-700 active:scale-95 transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Friendly empty-cart state — nothing to check out.
  if (activeItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 text-center space-y-5 pb-28 lg:pb-12">
        <div className="w-20 h-20 bg-[#FDF2F3] text-[#A80C14] rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-stone-900">
            Your cart is empty
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
            Add a few pieces to your cart before heading to checkout.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/shop"
            className="w-full sm:w-auto min-h-[48px] px-8 inline-flex items-center justify-center bg-[#A80C14] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#8C0A10] active:scale-95 transition-all shadow-md gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Start Shopping</span>
          </Link>
          <Link
            href="/cart"
            className="w-full sm:w-auto min-h-[48px] px-8 inline-flex items-center justify-center bg-white border border-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-full hover:bg-stone-50 active:scale-95 transition-all"
          >
            View Cart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-6 lg:space-y-8 pb-44 lg:pb-12">
      <div className="flex items-center justify-between border-b border-[#F8D2D5] pb-3 sm:pb-4">
        <Link
          href="/cart"
          className="flex items-center gap-1.5 min-h-[40px] text-xs font-semibold text-stone-500 hover:text-[#A80C14] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Cart
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-stone-400">
          <Lock className="w-3.5 h-3.5 text-emerald-600" /> Secure SSL Checkout
        </div>
      </div>

      <form id="checkout-form" onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Order Summary — FIRST on mobile (collapsed by default), right rail on desktop.
            One markup source, reordered via grid placement. */}
        <aside className="lg:col-span-5 lg:order-2">
          <div className="lg:sticky lg:top-24 bg-white rounded-3xl border border-[#F8D2D5] shadow-xs overflow-hidden">
            {/* Summary header — doubles as the mobile disclosure toggle */}
            <button
              type="button"
              onClick={() => setIsSummaryOpen((v) => !v)}
              aria-expanded={isSummaryOpen}
              className="lg:cursor-default lg:pointer-events-none w-full flex items-center justify-between gap-3 p-4 sm:p-6 text-left"
            >
              <div className="min-w-0">
                <h2 className="font-bold text-xs sm:text-lg text-stone-900 flex items-center gap-2">
                  {buyNowItems ? 'Quick Order' : 'Order Summary'}
                  <span className="px-2 text-xs py-0.5 bg-[#FDF2F3] border border-[#F8D2D5] rounded-full text-[10px] font-bold text-[#A80C14]">
                    {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
                  </span>
                  {buyNowItems && (
                    <span className="px-2 text-xs py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700 flex items-center tex-xs gap-1">
                      ⚡ Buy Now
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="block text-[9px] text-stone-400 uppercase tracking-wider leading-none">Total</span>
                  <span className="font-extrabold text-[#A80C14] font-mono text-base sm:text-lg leading-tight">
                    ৳ {totalAmount}
                  </span>
                </div>
                <ChevronDown className={`lg:hidden w-5 h-5 text-stone-400 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Collapsible body: always open on lg, toggled on mobile */}
            <div className={`${isSummaryOpen ? 'block' : 'hidden'} lg:block border-t border-[#F8D2D5] p-4 sm:p-6 space-y-4`}>
              <div className="divide-y divide-[#FDF2F3] max-h-72 overflow-y-auto overscroll-contain pr-1 -mr-1">
                {activeItems.map((item, idx) => {
                  const itemImg = getProductVariationImage(item.product, item.selectedColor);
                  const itemPrice = getProductVariationPrice(item.product, item.selectedColor, item.selectedSize);
                  const maxStock = item.product?.stock ?? 99;

                  return (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative w-11 h-13 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                          <Image src={itemImg} alt={item.product?.name || 'Product'} fill sizes="44px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-stone-900 line-clamp-1 text-xs">{item.product?.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 truncate mt-0.5 font-medium">
                            {item.selectedColor && (
                              <span className="inline-flex items-center gap-1">
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
                              <>
                                <span className="text-stone-300">•</span>
                                <span>{item.selectedSize}</span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] font-mono font-semibold text-[#A80C14] mt-0.5">
                            ৳ {itemPrice}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quantity Stepper Controller */}
                        <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50/80 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item, -1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200/80 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-extrabold text-xs text-stone-900 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item, 1)}
                            disabled={item.quantity >= maxStock}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200/80 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-extrabold text-stone-900 font-mono text-xs sm:text-sm min-w-[55px] text-right">
                          ৳ {itemPrice * item.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Voucher Input */}
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800">
                    <span className="flex items-center gap-1.5 font-bold uppercase min-w-0">
                      <Ticket className="w-4 h-4 shrink-0" />
                      <span className="truncate">{appliedCoupon.code} — −৳{discountAmount}</span>
                    </span>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      aria-label="Remove promo code"
                      className="w-8 h-8 -my-1 -mr-1 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label="Promo code"
                      placeholder="Enter Promo Code (e.g. EID2026)"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 min-h-[44px] px-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold uppercase text-stone-900 placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A80C14] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromoCode}
                      disabled={isValidatingPromo || !promoCodeInput.trim()}
                      className="px-4 min-h-[44px] bg-stone-900 hover:bg-stone-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:active:scale-100"
                    >
                      {isValidatingPromo ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                )}
                {promoFeedback && (
                  <p
                    role="status"
                    className={`text-[11px] font-bold ${promoFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {promoFeedback.message}
                  </p>
                )}
                {promoNotice && (
                  <p className="text-[11px] font-bold text-amber-600">
                    ⚠️ {promoNotice}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#F8D2D5] space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-stone-900">৳ {subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Applied ({appliedCoupon?.code})</span>
                    <span>-৳ {discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span>Delivery Fee</span>
                  <div className="text-right font-bold text-stone-900">
                    {effectiveShippingFee === 0 ? (
                      <span className="text-emerald-600 uppercase font-extrabold">Free Shipping</span>
                    ) : (
                      <span>৳ {effectiveShippingFee}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-[#F8D2D5]">
                  <span>Total</span>
                  <span className="text-[#A80C14] text-xl font-extrabold">৳ {totalAmount}</span>
                </div>
              </div>

              {/* Desktop CTA (mobile uses the sticky bottom bar) */}
              <button
                type="submit"
                disabled={isSubmitting || isCalculatingShipping}
                className="hidden lg:flex w-full min-h-[52px] items-center justify-center bg-[#A80C14] hover:bg-[#8C0A10] active:scale-[0.99] text-white font-extrabold text-xs uppercase tracking-wider rounded-full transition-all shadow-md gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Processing Order…' : 'Complete Order'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="hidden lg:flex items-center justify-center gap-1.5 text-[10px] font-semibold text-stone-400">
                <Lock className="w-3 h-3 text-emerald-600" /> 256-bit encrypted secure checkout
              </p>
            </div>
          </div>
        </aside>

        {/* Shipping Details */}
        <div className="lg:col-span-7 lg:order-1 space-y-5 lg:space-y-6">
          {/* Delivery & Order Policy Trigger Banner */}
          <button
            type="button"
            onClick={() => setIsPolicyModalOpen(true)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-rose-50 via-amber-50/60 to-stone-50 border border-[#F8D2D5] hover:border-[#A80C14]/40 rounded-2xl text-xs transition-all text-stone-900 group cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#A80C14] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                    ডেলিভারি ও অর্ডার পলিসি (সকল নিয়মাবলী)
                  </span>
                  <span className="px-2 py-0.5 bg-[#A80C14]/10 text-[#A80C14] rounded-full text-[10px] font-bold">
                    গুরুত্বপূর্ণ
                  </span>
                </div>
                <span className="block text-[11px] text-stone-500 truncate font-normal mt-0.5">
                  ক্যাশ অন ডেলিভারি, চার্জ, অর্ডার কনফার্মেশন ও রিটার্ন সংক্রান্ত তথ্য
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-[#A80C14] text-white rounded-full text-[11px] font-bold shrink-0 group-hover:bg-[#8C0A10] transition-colors flex items-center gap-1 shadow-xs">
              <span>নিয়মাবলী দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Payment Option */}
          <section className="bg-white p-4 sm:p-6 rounded-3xl border border-[#F8D2D5] shadow-xs space-y-3">
            <h2 className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#A80C14]/10 text-[#A80C14] text-xs font-black flex items-center justify-center shrink-0">1</span>
              Payment Option
            </h2>

            <div className="space-y-2.5 text-xs" role="radiogroup" aria-label="Payment method">
              {[
                {
                  id: 'Cash on Delivery (COD)',
                  icon: Banknote,
                  desc: 'Pay in cash when your parcel arrives at your door'
                },
                {
                  id: 'bKash Send Money (Manual)',
                  icon: Smartphone,
                  desc: 'Send Money now, then share the TrxID — verified before dispatch'
                }
              ].map((pm) => {
                const isSelected = paymentMethod === pm.id;
                const Icon = pm.icon;
                return (
                  <label
                    key={pm.id}
                    className={`flex items-start gap-3 min-h-[56px] p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${isSelected
                      ? 'border-[#A80C14] bg-[#FDF2F3] font-bold shadow-xs'
                      : 'border-stone-200 text-stone-700 hover:border-[#F8D2D5]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={isSelected}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="accent-[#A80C14] w-4 h-4 shrink-0 mt-0.5"
                    />
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#A80C14] text-white' : 'bg-stone-100 text-stone-500'}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-bold ${isSelected ? 'text-[#A80C14]' : 'text-stone-800'}`}>{pm.id}</span>
                      <span className="block text-[10px] text-stone-500 font-normal mt-0.5 leading-snug">{pm.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Shipping & Contact Details */}
          <section className="bg-white p-4 sm:p-6 rounded-3xl border border-[#F8D2D5] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#A80C14]/10 text-[#A80C14] text-xs font-black flex items-center justify-center shrink-0">2</span>
                Shipping &amp; Contact Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="e.g. Sarah Ahmed"
                autoComplete="name"
              />

              <Field
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
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
                  value={formData.street}
                  onChange={handleInputChange}
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
                ) : formData.street.trim() ? (
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
          </section>
        </div>
      </form>

      {/* Sticky mobile purchase bar — offset matches MobileBottomNav including
          its env(safe-area-inset-bottom) padding once the nav overhaul lands. */}
      <div className="lg:hidden fixed bottom-[calc(62px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F8D2D5] px-3 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 shrink-0">
          <span className="text-[9px] text-stone-400 uppercase tracking-wider leading-none">Total ({activeItems.length} {activeItems.length === 1 ? 'item' : 'items'})</span>
          <span className="font-extrabold text-[#A80C14] font-mono text-base leading-tight">
            ৳ {totalAmount}
          </span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="flex-1 max-w-[62%] min-h-[44px] bg-[#A80C14] hover:bg-[#8C0A10] active:scale-95 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Processing…' : 'Complete Order'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Manual bKash Payment — bottom sheet on mobile, centered dialog on desktop */}
      {isBkashModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="bKash payment"
          onClick={(e) => e.target === e.currentTarget && setIsBkashModalOpen(false)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 max-w-md w-full shadow-2xl overflow-hidden text-stone-900 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#E2136E] text-white p-5 sm:p-6 text-center space-y-2 relative shrink-0">
              <button
                type="button"
                onClick={() => setIsBkashModalOpen(false)}
                aria-label="Close bKash payment"
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center justify-center bg-white text-[#E2136E] rounded-2xl px-4 py-2 font-black text-xl tracking-wider shadow-sm select-none">
                bKash
              </div>
              <p className="text-xs text-[#F8D2D5]">Send Money Payment Portal</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-grow text-left">
              {/* Amount Info */}
              <div className="bg-[#FDF2F3]/60 border border-[#F8D2D5] p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-2xl font-black text-[#E2136E] font-mono">৳ {totalAmount}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Reference</p>
                  <p className="text-xs font-bold text-stone-600">Falak Closet Order</p>
                </div>
              </div>

              {/* Merchant number — tap-to-copy chip */}
              <button
                type="button"
                onClick={handleCopyNumber}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-left hover:border-[#E2136E]/40 active:scale-[0.99] transition-all cursor-pointer"
                aria-label={`Copy bKash number ${bkashSettings?.bkashNumber || '01700000005'}`}
              >
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Send Money to — {copied ? 'copied ✓' : 'tap to copy'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-base sm:text-lg font-extrabold text-stone-900 tracking-wide truncate">
                      {bkashSettings?.bkashNumber || '01700000005'}
                    </span>
                    <span className="px-2 py-0.5 bg-[#FDF2F3] text-[#E2136E] border border-[#F8D2D5] rounded text-[9px] font-bold shrink-0">
                      {bkashSettings?.bkashAccountType || 'Personal'}
                    </span>
                  </div>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-[#E2136E] text-white'}`}>
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </span>
                </div>
              </button>

              {/* Instructions list */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-stone-600 font-medium">
                  {bkashSettings?.instructions?.map((inst: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{inst}</li>
                  )) || (
                      <>
                        <li>Dial *247# or open the bKash App.</li>
                        <li>Choose &quot;Send Money&quot; and enter our number.</li>
                        <li>Enter amount: ৳{totalAmount}.</li>
                        <li>Use your phone number as reference.</li>
                        <li>Confirm transaction and copy the Transaction ID.</li>
                      </>
                    )}
                </ol>
              </div>

              {bkashError && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold leading-normal">
                  {bkashError}
                </div>
              )}

              {/* Form inputs */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="space-y-1.5">
                  <label htmlFor="bkash-sender" className="text-[11px] font-bold text-stone-700">
                    Your Sender bKash Number <span className="text-[#E2136E]">*</span>
                  </label>
                  <input
                    id="bkash-sender"
                    type="text"
                    required
                    maxLength={11}
                    inputMode="tel"
                    value={bkashSenderNumber}
                    onChange={(e) => setBkashSenderNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full min-h-[44px] px-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E2136E] focus:border-transparent font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bkash-trx" className="text-[11px] font-bold text-stone-700">
                    bKash Transaction ID (TrxID) <span className="text-[#E2136E]">*</span>
                  </label>
                  <input
                    id="bkash-trx"
                    type="text"
                    required
                    value={bkashTrxId}
                    onChange={(e) => setBkashTrxId(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123XYZ9"
                    className="w-full min-h-[44px] px-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E2136E] focus:border-transparent font-mono font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions — sticky footer, full-width buttons on mobile */}
            <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsBkashModalOpen(false)}
                className="min-h-[44px] px-4 bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-800 rounded-xl font-bold transition-all cursor-pointer"
              >
                Close Gateway
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="min-h-[44px] px-5 bg-[#E2136E] hover:bg-[#C2105E] active:scale-95 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying payment…' : 'Confirm bKash Payment'}
              </button>
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
