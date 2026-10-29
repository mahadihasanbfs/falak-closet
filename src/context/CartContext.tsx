'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Product } from '@/data/products';
import { AppliedCoupon } from '@/data/promotions';
import { useWishlist } from '@/hooks/useWishlist';
import { sendNewOrderNotification, isSocketEnabled, getSocket } from '@/lib/socketClient';
import { getProductVariationPrice } from '@/lib/utils';
import { checkIsFreeDelivery } from '@/lib/shipping/locationBilingual';

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface DeliverySubArea {
  id: string;
  name: string;
  charge: number | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  etaDays: string;
  isActive: boolean;
  sortOrder: number;
  subAreas: DeliverySubArea[];
}

export interface OrderRecord {
  id: string;
  date: string;
  createdAt?: number;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  status:
    | 'Pending'
    | 'Confirmed'
    | 'Processing'
    | 'Packed'
    | 'Ready for Shipment'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Completed'
    | 'Payment Pending'
    | 'Payment Failed'
    | 'Cancelled'
    | 'Return Requested'
    | 'Returned'
    | 'Refund Processing'
    | 'Refunded'
    | 'Failed Delivery'
    | 'On Hold'
    | 'Quality Checked';
  userEmail?: string;
  userIp?: string;
  courierDeliveryFee?: number;
  consignmentId?: string;
  courierStatus?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    district?: string;
    fullAddress?: string;
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    pathaoCityId?: number;
    pathaoZoneId?: number;
    pathaoAreaId?: number;
    pathaoCityName?: string;
    pathaoZoneName?: string;
    pathaoAreaName?: string;
  };
  deliveryMethod?: string;
  paymentMethod?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  paymentSenderNumber?: string;
  paymentTrxId?: string;
  paymentStatus?: string;
  deliveryZone?: string;
  deliverySubArea?: string;
  promoCode?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  district: string;
  fullAddress: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, color: string, size: string, quantity?: number) => void;
  removeFromCart: (productId: string, color: string, size: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  appliedCoupon: AppliedCoupon | null;
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removePromoCode: () => void;
  promoNotice: string | null;
  discountAmount: number;
  comboDiscountAmount: number;
  shippingFee: number;
  totalAmount: number;
  freeShippingThreshold: number;
  freeShippingProgress: number;

  // Delivery Zones
  deliveryZones: DeliveryZone[];
  selectedZoneId: string | null;
  selectedSubAreaId: string | null;
  setSelectedZone: (zoneId: string, subAreaId?: string | null) => void;
  selectedZoneName: string;
  selectedSubAreaName: string | null;
  quantityFreeDelivery: { unlocked: boolean; productName: string; requiredQty: number; currentQty: number } | null;

  // Wishlist
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  mergeServerWishlist: (serverIds: string[]) => void;
  clearWishlist: () => void;

  // Server Cart Merge (called after login/signup)
  mergeServerCart: (serverCartItems: { productId: string; selectedColor: string; selectedSize: string; quantity: number }[]) => void;

  // Drawer states
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;

  // Auth Session State
  user: UserProfile | null;
  isAuthenticated: boolean;

  // Dynamic Database Products State
  products: Product[];
  isLoadingProducts: boolean;
  /** Non-null when the catalog read failed — lets consumers distinguish "no products" from "could not load". */
  productsError: string | null;
  refreshProductsFromApi: () => Promise<void>;
  getProductBySlug: (slug: string) => Product | undefined;

  // Order Creation & Tracking History
  orders: OrderRecord[];
  placeOrder: (orderData: Omit<OrderRecord, 'id' | 'date' | 'status' | 'trackingNumber' | 'estimatedDelivery'>) => Promise<OrderRecord>;
  getOrderById: (orderId: string) => OrderRecord | undefined;
  getOrdersByPhone: (phone: string) => OrderRecord[];
  refreshOrdersFromApi: () => Promise<void>;
}

// Fallback while (or if) the /api/settings read never lands — 0 means disabled by default.
const FREE_SHIPPING_MIN = 0;

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  initialProducts = [],
  initialProductsError = null,
}: {
  children: React.ReactNode;
  /** Server-rendered catalog from the root layout. Keeps the first paint free of a fetch waterfall. */
  initialProducts?: Product[];
  initialProductsError?: string | null;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [promoNotice, setPromoNotice] = useState<string | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Auth Session State
  const [user, setUser] = useState<UserProfile | null>(null);
  const isAuthenticated = !!user;

  // Pending server cart items waiting for products to load (so we can resolve productId -> Product)
  const pendingServerCartRef = useRef<{ productId: string; selectedColor: string; selectedSize: string; quantity: number }[] | null>(null);
  const mergeServerWishlistRef = useRef<((ids: string[]) => void) | null>(null);
  const clearWishlistRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            Promise.resolve().then(() => {
              setUser(data.user);
            });
            // Store pending server cart for merge once products are available
            if (Array.isArray(data.cart) && data.cart.length > 0) {
              pendingServerCartRef.current = data.cart;
            }
            // Sync database wishlist for logged-in user
            if (Array.isArray(data.wishlist) && data.wishlist.length > 0 && mergeServerWishlistRef.current) {
              mergeServerWishlistRef.current(data.wishlist);
            }
            return;
          }
        }
      } catch {}
      Promise.resolve().then(() => {
        setUser(null);
        clearWishlistRef.current?.();
      });
    };

    checkAuth();
    window.addEventListener('falak:auth-changed', checkAuth);
    return () => window.removeEventListener('falak:auth-changed', checkAuth);
  }, []);

  // Delivery Zones State
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedSubAreaId, setSelectedSubAreaId] = useState<string | null>(null);

  // Admin-configured free delivery threshold (Settings → Store Configuration).
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(FREE_SHIPPING_MIN);

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('/api/settings?key=store', { cache: 'no-store' });
      const data = await res.json();
      const threshold = Number(data?.setting?.value?.freeShippingThreshold);
      if (data.success && !isNaN(threshold) && threshold >= 0) {
        setFreeShippingThreshold(threshold);
      }
    } catch (e) {
      // Keep the built-in fallback — checkout must not hinge on this read.
      console.error('Failed to fetch store settings:', e);
    }
  };

  useEffect(() => {
    window.addEventListener('falak:settings-changed', fetchStoreSettings);
    return () => window.removeEventListener('falak:settings-changed', fetchStoreSettings);
  }, []);

  const fetchDeliveryZones = async () => {
    try {
      const res = await fetch('/api/delivery-zones');
      const data = await res.json();
      if (data.success && Array.isArray(data.deliveryZones)) {
        setDeliveryZones(data.deliveryZones);
        // Default select first active zone
        const active = data.deliveryZones.filter((z: DeliveryZone) => z.isActive);
        if (active.length > 0) {
          setSelectedZoneId(active[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch delivery zones:', e);
    }
  };

  const setSelectedZone = (zoneId: string, subAreaId: string | null = null) => {
    setSelectedZoneId(zoneId);
    setSelectedSubAreaId(subAreaId);
  };

  // Dynamic Database Products State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  // Already have the server's copy, so nothing is "loading" on first paint.
  const [isLoadingProducts, setIsLoadingProducts] = useState(initialProducts.length === 0 && !initialProductsError);
  const [productsError, setProductsError] = useState<string | null>(initialProductsError);

  const {
    wishlist,
    toggleWishlist,
    isInWishlist,
    mergeServerWishlist,
    clearWishlist,
  } = useWishlist(products, user);
  mergeServerWishlistRef.current = mergeServerWishlist;
  clearWishlistRef.current = clearWishlist;

  // Load products from Database API
  const refreshProductsFromApi = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !Array.isArray(data.products)) {
        // Keep whatever is already on screen. Blanking the catalog on a failed
        // refresh used to turn a transient network blip into an empty store.
        setProductsError(data?.error || `Could not load the catalog (HTTP ${res.status}).`);
        return;
      }

      setProducts(data.products);
      setProductsError(null);
    } catch (err) {
      setProductsError((err as Error).message || 'Network error while loading the catalog.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // The server already handed us the catalog; re-fetching on mount would just
  // duplicate that query. Only fetch when it arrived empty.
  useEffect(() => {
    if (initialProducts.length === 0 && !initialProductsError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshProductsFromApi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep products state synchronized if layout re-renders with fresh initialProducts
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Real-time catalog sync via socket and local custom event
  useEffect(() => {
    const handleProductsChanged = () => {
      refreshProductsFromApi();
    };

    window.addEventListener('falak:products-changed', handleProductsChanged);

    let socket: any = null;
    if (isSocketEnabled) {
      try {
        socket = getSocket();
        socket.on('product_sync', handleProductsChanged);
      } catch {}
    }

    return () => {
      window.removeEventListener('falak:products-changed', handleProductsChanged);
      if (socket) {
        socket.off('product_sync', handleProductsChanged);
      }
    };
  }, []);

  // Once products are available, flush any pending server cart merge
  useEffect(() => {
    if (products.length === 0) return;
    if (!pendingServerCartRef.current || pendingServerCartRef.current.length === 0) return;
    const pending = pendingServerCartRef.current;
    pendingServerCartRef.current = null;

    setCart((prev) => {
      const merged = [...prev];
      for (const serverItem of pending) {
        const product = products.find((p) => p.id === serverItem.productId);
        if (!product) continue;
        const existingIndex = merged.findIndex(
          (i) =>
            i.product?.id === serverItem.productId &&
            i.selectedColor === serverItem.selectedColor &&
            i.selectedSize === serverItem.selectedSize
        );
        if (existingIndex > -1) {
          // Keep whichever quantity is higher
          merged[existingIndex] = {
            ...merged[existingIndex],
            quantity: Math.max(merged[existingIndex].quantity, serverItem.quantity),
          };
        } else {
          merged.push({
            product,
            selectedColor: serverItem.selectedColor,
            selectedSize: serverItem.selectedSize,
            quantity: serverItem.quantity,
          });
        }
      }
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const getProductBySlug = (slug: string) => {
    const clean = slug.toLowerCase();
    return products.find((p) => p.slug.toLowerCase() === clean || p.id.toLowerCase() === clean);
  };

  // Load orders from API & localStorage
  // Load user's own order history from localStorage
  const refreshOrdersFromApi = async () => {
    try {
      // Clean up legacy all-orders storage key if present
      localStorage.removeItem('falak_orders');

      const savedOrders = localStorage.getItem('falak_my_orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('falak_cart');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedCoupon = localStorage.getItem('falak_coupon');
      if (savedCoupon) setAppliedCoupon(JSON.parse(savedCoupon));
    } catch { }

    refreshOrdersFromApi();
    fetchDeliveryZones();
    fetchStoreSettings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('falak_cart', JSON.stringify(cart));
    } catch { }
  }, [cart]);

  // Debounced DB cart sync — fires 1.5 s after the last cart mutation, only for signed-in users.
  const dbSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user) return; // guests: skip DB write
    if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
    dbSyncTimerRef.current = setTimeout(() => {
      const payload = cart.map((item) => ({
        productId: item.product?.id ?? '',
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
      })).filter((i) => !!i.productId);

      fetch('/api/user/me/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: payload }),
      }).catch(() => {}); // fire-and-forget; localStorage is the fallback
    }, 1500);

    return () => {
      if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, user]);



  useEffect(() => {
    try {
      localStorage.setItem('falak_orders', JSON.stringify(orders));
    } catch { }
  }, [orders]);

  // Relocated coupon effects to be after subtotal/discountAmount declarations below

  const addToCart = (product: Product, color: string, size: string, quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product?.id === product?.id &&
          item.selectedColor === color &&
          item.selectedSize === size
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { product, selectedColor: color, selectedSize: size, quantity }];
    });
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (productId: string, color: string, size: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product?.id === productId &&
            item.selectedColor === color &&
            item.selectedSize === size
          )
      )
    );
  };

  const updateQuantity = (
    productId: string,
    color: string,
    size: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, color, size);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.product?.id === productId &&
          item.selectedColor === color &&
          item.selectedSize === size
        ) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setPromoNotice(null);
    // Also clear the DB cart for authenticated users
    if (user) {
      fetch('/api/user/me/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: [] }),
      }).catch(() => {});
    }
  };

  /**
   * mergeServerCart — called by useAccount after login/signup with the raw
   * CartItem rows from the DB. Products may not be loaded yet; if so we stash
   * items in a ref and resolve them once the catalog arrives (see the
   * `products` useEffect above).
   */
  const mergeServerCart = useCallback(
    (serverCartItems: { productId: string; selectedColor: string; selectedSize: string; quantity: number }[]) => {
      if (!serverCartItems || serverCartItems.length === 0) return;

      if (products.length === 0) {
        // Products not loaded yet — defer until catalog is ready
        pendingServerCartRef.current = serverCartItems;
        return;
      }

      setCart((prev) => {
        const merged = [...prev];
        for (const serverItem of serverCartItems) {
          const product = products.find((p) => p.id === serverItem.productId);
          if (!product) continue;
          const existingIndex = merged.findIndex(
            (i) =>
              i.product?.id === serverItem.productId &&
              i.selectedColor === serverItem.selectedColor &&
              i.selectedSize === serverItem.selectedSize
          );
          if (existingIndex > -1) {
            merged[existingIndex] = {
              ...merged[existingIndex],
              quantity: Math.max(merged[existingIndex].quantity, serverItem.quantity),
            };
          } else {
            merged.push({
              product,
              selectedColor: serverItem.selectedColor,
              selectedSize: serverItem.selectedSize,
              quantity: serverItem.quantity,
            });
          }
        }
        return merged;
      });
    },
    [products]
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce(
    (total, item) =>
      total + getProductVariationPrice(item.product, item.selectedColor, item.selectedSize) * item.quantity,
    0
  );

  const applyPromoCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, message: 'Promo code is required.' };

    try {
      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, cartSubtotal: subtotal }),
      });
      const data = await res.json();

      if (data.success) {
        setAppliedCoupon({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          calculatedDiscount: data.calculatedDiscount,
        });
        setPromoNotice(null);
        return { success: true, message: data.message || `Coupon ${data.code} applied successfully!` };
      } else {
        return { success: false, message: data.error || 'Invalid promo code.' };
      }
    } catch (err) {
      console.error('Failed to validate promo code:', err);
      return { success: false, message: 'Could not verify code — please try again.' };
    }
  };

  const removePromoCode = () => {
    setAppliedCoupon(null);
    setPromoNotice(null);
  };

  // Calculate quantity-based tier combo discounts per product
  const comboDiscountAmount = useMemo(() => {
    let totalComboDiscount = 0;
    const prodCounts: Record<string, { product: Product; qty: number }> = {};
    cart.forEach((item) => {
      const pid = item.product?.id;
      if (pid && item.product) {
        if (!prodCounts[pid]) {
          prodCounts[pid] = { product: item.product, qty: 0 };
        }
        prodCounts[pid].qty += (item.quantity ?? 0);
      }
    });

    Object.values(prodCounts).forEach(({ product, qty }) => {
      const tiers = product.tierDiscounts;
      if (Array.isArray(tiers) && tiers.length > 0) {
        const sortedTiers = [...tiers]
          .filter((t) => t.minQuantity > 0 && t.discountAmount > 0)
          .sort((a, b) => b.minQuantity - a.minQuantity);
        const matchedTier = sortedTiers.find((t) => qty >= t.minQuantity);
        if (matchedTier) {
          totalComboDiscount += matchedTier.discountAmount;
        }
      }
    });

    return totalComboDiscount;
  }, [cart]);

  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.calculatedDiscount, subtotal) : 0;
  const discountAmount = Math.min(subtotal, couponDiscount + comboDiscountAmount);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem('falak_coupon', JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem('falak_coupon');
      }
    } catch { }
  }, [appliedCoupon]);

  // Stale promo guard: re-validate the coupon silently when subtotal changes
  useEffect(() => {
    if (!appliedCoupon) return;

    if (cart.length === 0 || subtotal === 0) {
      const oldCode = appliedCoupon.code;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppliedCoupon(null);
      setPromoNotice(`Code ${oldCode} removed — cart is empty`);
      return;
    }

    let isMounted = true;
    const revalidate = async () => {
      try {
        const res = await fetch('/api/promotions/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: appliedCoupon.code, cartSubtotal: subtotal }),
        });
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          if (data.calculatedDiscount !== appliedCoupon.calculatedDiscount) {
            setAppliedCoupon({
              code: data.code,
              discountType: data.discountType,
              discountValue: data.discountValue,
              calculatedDiscount: data.calculatedDiscount,
            });
          }
        } else {
          const oldCode = appliedCoupon.code;
          setAppliedCoupon(null);
          setPromoNotice(`Code ${oldCode} removed — ${data.error || 'cart no longer meets the requirements'}`);
        }
      } catch (err) {
        console.error('Silent promo revalidation failed:', err);
      }
    };

    revalidate();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCoupon?.code]);

  // Sum quantities by product ID
  const quantitiesByProductId: Record<string, number> = {};
  cart.forEach((item) => {
    const pid = item.product?.id;
    if (pid) {
      quantitiesByProductId[pid] = (quantitiesByProductId[pid] || 0) + (item.quantity ?? 0);
    }
  });

  let quantityFreeDelivery: { unlocked: boolean; productName: string; requiredQty: number; currentQty: number } | null = null;

  for (const item of cart) {
    const prod = item.product;
    const reqQty = prod?.freeDeliveryQuantity;
    if (prod && typeof reqQty === 'number' && reqQty > 0) {
      const currentQty = quantitiesByProductId[prod.id] || 0;
      if (currentQty >= reqQty) {
        quantityFreeDelivery = {
          unlocked: true,
          productName: prod.name,
          requiredQty: reqQty,
          currentQty
        };
        break;
      } else {
        if (!quantityFreeDelivery || (currentQty / reqQty > quantityFreeDelivery.currentQty / quantityFreeDelivery.requiredQty)) {
          quantityFreeDelivery = {
            unlocked: false,
            productName: prod.name,
            requiredQty: reqQty,
            currentQty
          };
        }
      }
    }
  }

  const activeZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const activeSubArea = activeZone?.subAreas?.find((s: DeliverySubArea) => s.id === selectedSubAreaId);

  const selectedZoneName = activeZone?.name || 'Inside Dhaka';
  const selectedSubAreaName = activeSubArea?.name || null;

  const baseFee = activeSubArea?.charge ?? activeZone?.charge ?? 60; // fallback charge

  const hasFreeShippingThreshold =
    typeof freeShippingThreshold === 'number' &&
    freeShippingThreshold > 0 &&
    freeShippingThreshold < Infinity;

  const freeShippingProgress = hasFreeShippingThreshold && subtotal > 0
    ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
    : 0;

  const isFreeDelivery = checkIsFreeDelivery(cart, subtotal, freeShippingThreshold);

  const shippingFee = subtotal === 0 || isFreeDelivery ? 0 : baseFee;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);



  // Place order with API post to /api/orders
  const placeOrder = async (
    orderData: Omit<OrderRecord, 'id' | 'date' | 'status' | 'trackingNumber' | 'estimatedDelivery'>
  ): Promise<OrderRecord> => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `FLK-${randomNum}`;
    const trackingNum = `TRK-FLK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: OrderRecord = {
      ...orderData,
      id: orderId,
      date: new Date().toISOString(),
      status: 'Processing',
      trackingNumber: trackingNum,
      estimatedDelivery: '3-5 Business Days'
    };

    let finalOrder = newOrder;

    // Post to API (MongoDB)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const data = await res.json();
      if (data.success && data.order) {
        finalOrder = {
          ...data.order,
          items: newOrder.items // keep the client-side items structure
        };
        if (data.warning) {
          console.warn('Order submission warning:', data.warning);
        }
      }
    } catch (e) {
      console.warn('API post fallback to local state:', e);
    }

    setOrders((prev) => {
      const updated = [finalOrder, ...prev.filter((o) => o.id !== finalOrder.id)];
      try {
        localStorage.setItem('falak_my_orders', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    clearCart();

    // Real-Time Socket Notification to Admin
    sendNewOrderNotification(finalOrder);

    return finalOrder;
  };

  const getOrderById = (orderId: string) => {
    if (!orderId || !orderId.trim()) return undefined;
    const clean = orderId.trim().replace(/^#/, '').toUpperCase();
    return orders.find((o) => {
      const oId = o.id.toUpperCase();
      const track = (o.trackingNumber || '').toUpperCase();
      return oId === clean || oId === `FLK-${clean}` || (track && track === clean);
    });
  };

  const getOrdersByPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 3) return [];
    return orders.filter((o) => {
      const pClean = (o.shippingAddress?.phone || '').replace(/\D/g, '');
      return pClean.length > 0 && pClean.includes(clean);
    });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        appliedCoupon,
        applyPromoCode,
        removePromoCode,
        promoNotice,
        discountAmount,
        comboDiscountAmount,
        shippingFee,
        totalAmount,
        freeShippingThreshold,
        freeShippingProgress,
        deliveryZones,
        selectedZoneId,
        selectedSubAreaId,
        setSelectedZone,
        selectedZoneName,
        selectedSubAreaName,
        quantityFreeDelivery,
        wishlist,
        toggleWishlist,
        isInWishlist,
        mergeServerWishlist,
        clearWishlist,
        mergeServerCart,
        isCartDrawerOpen,
        user,
        isAuthenticated,
        setIsCartDrawerOpen,
        products,
        isLoadingProducts,
        productsError,
        refreshProductsFromApi,
        getProductBySlug,
        orders,
        placeOrder,
        getOrderById,
        getOrdersByPhone,
        refreshOrdersFromApi
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
