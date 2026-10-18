/**
 * pathao.ts — Server-side Pathao Courier API integration client.
 *
 * Keeps all Pathao merchant API credentials, token management, location reads,
 * delivery price calculation, and order/shipment creation isolated on the server.
 */

import type { ORDER_STATUSES } from '@/lib/orders';

export const PATHAO_DELIVERY_TYPES = {
  NORMAL: 48,
  ON_DEMAND: 12,
} as const;

export const PATHAO_ITEM_TYPES = {
  DOCUMENT: 1,
  PARCEL: 2,
} as const;

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available?: boolean;
  pickup_available?: boolean;
}

export interface PathaoPriceQuoteRequest {
  storeId?: number | string;
  cityId: number;
  zoneId: number;
  areaId?: number;
  recipientAddress?: string;
  weight: number;
  deliveryType?: number;
  itemType?: number;
}

export interface PathaoPriceQuoteResponse {
  price: number;
  discount: number;
  promo_discount: number;
  cod_percentage: number;
  additional_charge: number;
  final_price: number;
}

export interface PathaoCreateShipmentRequest {
  storeId?: number | string;
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCityId: number;
  recipientZoneId: number;
  recipientAreaId?: number;
  deliveryType?: number;
  itemType?: number;
  itemQuantity: number;
  itemWeight: number;
  amountToCollect: number;
  itemDescription?: string;
  specialInstruction?: string;
}

export interface PathaoCreateShipmentResponse {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee?: number;
}

// Internal token state cache
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

/**
 * Normalizes phone numbers to standard 11-digit BD mobile format (01xxxxxxxxx).
 * Pathao requires valid 11-digit BD mobile numbers.
 */
export function sanitizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8801')) {
    return '0' + digits.slice(3);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Calculates shipment weight from cart/order items in KG.
 * Applies Pathao limits: Minimum 0.5 KG, Maximum 10.0 KG.
 */
export function calculateOrderWeight(items: Array<{ product?: any; quantity: number }>): number {
  if (!Array.isArray(items) || items.length === 0) return 0.5;

  let totalWeight = 0;
  for (const item of items) {
    const rawProd = item.product || {};
    const qty = Math.max(1, item.quantity || 1);
    const weightPerUnit = typeof rawProd.weight === 'number' && rawProd.weight > 0
      ? rawProd.weight
      : 0.5; // Default 0.5 kg per apparel item
    totalWeight += weightPerUnit * qty;
  }

  // Pathao min 0.5kg, max 10kg
  const clamped = Math.max(0.5, Math.min(10.0, Math.round(totalWeight * 100) / 100));
  return clamped;
}

function getPathaoConfig() {
  const rawBaseUrl = process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com';
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  const clientId = (process.env.PATHAO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PATHAO_CLIENT_SECRET || '').trim();
  const username = (process.env.PATHAO_USERNAME || '').trim();
  const password = (process.env.PATHAO_PASSWORD || '').trim();
  const storeId = (process.env.PATHAO_STORE_ID || '').trim();

  return { baseUrl, clientId, clientSecret, username, password, storeId };
}

/** Default mock cities for testing when API credentials are missing or unconfigured */
const TEST_MOCK_CITIES: PathaoCity[] = [
  { city_id: 1, city_name: 'Dhaka' },
  { city_id: 2, city_name: 'Chattogram' },
  { city_id: 3, city_name: 'Sylhet' },
  { city_id: 4, city_name: 'Khulna' },
  { city_id: 5, city_name: 'Rajshahi' },
  { city_id: 6, city_name: 'Barishal' },
  { city_id: 7, city_name: 'Rangpur' },
  { city_id: 8, city_name: 'Mymensingh' },
];

/** Default mock zones for testing */
const TEST_MOCK_ZONES: Record<number, PathaoZone[]> = {
  1: [
    { zone_id: 101, zone_name: 'Dhanmondi' },
    { zone_id: 102, zone_name: 'Uttara' },
    { zone_id: 103, zone_name: 'Gulshan' },
    { zone_id: 104, zone_name: 'Mirpur' },
    { zone_id: 105, zone_name: 'Mohammadpur' },
    { zone_id: 106, zone_name: 'Bashundhara' },
    { zone_id: 107, zone_name: 'Savar' },
    { zone_id: 108, zone_name: 'Ashulia' },
    { zone_id: 109, zone_name: 'Keraniganj' },
    { zone_id: 110, zone_name: 'Gazipur' },
    { zone_id: 111, zone_name: 'Tongi' },
    { zone_id: 112, zone_name: 'Narayanganj' },
    { zone_id: 113, zone_name: 'Dhamrai' },
  ],
  2: [
    { zone_id: 201, zone_name: 'Agrabad' },
    { zone_id: 202, zone_name: 'GEC Circle' },
    { zone_id: 203, zone_name: 'Halishahar' },
    { zone_id: 204, zone_name: 'Nasirabad' },
  ],
  3: [
    { zone_id: 301, zone_name: 'Zindabazar' },
    { zone_id: 302, zone_name: 'Ambarkhana' },
  ],
};

/** Default mock areas for testing */
const TEST_MOCK_AREAS: Record<number, PathaoArea[]> = {
  101: [
    { area_id: 1001, area_name: 'Road 27 (New 16)' },
    { area_id: 1002, area_name: 'Satmasjid Road' },
    { area_id: 1003, area_name: 'Sobhanbagh' },
  ],
  102: [
    { area_id: 1010, area_name: 'Sector 3' },
    { area_id: 1011, area_name: 'Sector 7' },
    { area_id: 1012, area_name: 'Sector 11' },
  ],
  107: [
    { area_id: 1070, area_name: 'Savar Bazar' },
    { area_id: 1071, area_name: 'Savar Cantonment' },
  ],
  108: [
    { area_id: 1080, area_name: 'Ashulia Bazar' },
    { area_id: 1081, area_name: 'Baipal' },
  ],
  109: [
    { area_id: 1090, area_name: 'Keraniganj Model Town' },
    { area_id: 1091, area_name: 'Zinjira' },
  ],
};

/**
 * Obtains or reuses a valid Pathao OAuth access token.
 */
export async function getPathaoAccessToken(): Promise<string> {
  const config = getPathaoConfig();

  if (!config.clientId || !config.clientSecret || config.clientId.includes('your-pathao')) {
    throw new Error('Pathao credentials are unconfigured or using placeholder values.');
  }

  // Return cached token if valid (with 60-second buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }

  const url = `${config.baseUrl}/aladdin/api/v1/issue-token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      grant_type: 'password',
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Pathao] issue-token failed:', errorText);
    let detailMsg = res.statusText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) detailMsg = parsed.message;
      else if (parsed.error) detailMsg = parsed.error;
    } catch {}
    throw new Error(`Pathao OAuth token error (${res.status}): ${detailMsg}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 86400;

  if (!accessToken) {
    throw new Error('Pathao token issue response did not contain access_token.');
  }

  cachedToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
}

/**
 * Helper for authorized GET requests to Pathao API.
 */
async function pathaoGet<T>(endpoint: string): Promise<T> {
  const config = getPathaoConfig();
  const token = await getPathaoAccessToken();
  const url = `${config.baseUrl}${endpoint}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 3600 }, // Cache static location data
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Pathao GET ${endpoint}] failed:`, errText);
    throw new Error(`Pathao API error: ${res.status}`);
  }

  const result = await res.json();
  return result;
}

/**
 * Helper for authorized POST requests to Pathao API.
 */
async function pathaoPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const config = getPathaoConfig();
  const token = await getPathaoAccessToken();
  const url = `${config.baseUrl}${endpoint}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Pathao POST ${endpoint}] failed:`, errText);
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.errors && typeof parsed.errors === 'object') {
        const errList = Object.entries(parsed.errors).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : v}`
        );
        detail = `${parsed.message || 'Validation failed'} (${errList.join('; ')})`;
      } else if (parsed.message) {
        detail = parsed.message;
      } else if (parsed.error) {
        detail = parsed.error;
      }
    } catch {}
    throw new Error(`Pathao API error (${res.status}): ${detail}`);
  }

  return await res.json();
}

/**
 * Fetches Pathao City List. Fallbacks to test mock cities if API is unconfigured/fails during testing.
 * GET /aladdin/api/v1/city-list
 */
export async function getPathaoCities(): Promise<PathaoCity[]> {
  try {
    const res = await pathaoGet<{ data?: { data?: PathaoCity[] } }>('/aladdin/api/v1/city-list');
    if (res?.data?.data && res.data.data.length > 0) {
      return res.data.data;
    }
    return TEST_MOCK_CITIES;
  } catch (err) {
    console.warn('[Pathao] Using mock cities for testing mode');
    return TEST_MOCK_CITIES;
  }
}

/**
 * Fetches Pathao Zone List for a given City ID. Fallbacks to test mock zones during testing.
 * GET /aladdin/api/v1/cities/{city_id}/zone-list
 */
export async function getPathaoZones(cityId: number): Promise<PathaoZone[]> {
  try {
    const res = await pathaoGet<{ data?: { data?: PathaoZone[] } }>(
      `/aladdin/api/v1/cities/${cityId}/zone-list`
    );
    if (res?.data?.data && res.data.data.length > 0) {
      return res.data.data;
    }
    return TEST_MOCK_ZONES[cityId] || [
      { zone_id: cityId * 100 + 1, zone_name: 'Central Zone' },
      { zone_id: cityId * 100 + 2, zone_name: 'North Zone' },
      { zone_id: cityId * 100 + 3, zone_name: 'South Zone' },
    ];
  } catch (err) {
    console.warn(`[Pathao] Using mock zones for testing city ${cityId}`);
    return TEST_MOCK_ZONES[cityId] || [
      { zone_id: cityId * 100 + 1, zone_name: 'Central Zone' },
      { zone_id: cityId * 100 + 2, zone_name: 'North Zone' },
      { zone_id: cityId * 100 + 3, zone_name: 'South Zone' },
    ];
  }
}

/**
 * Fetches Pathao Area List for a given Zone ID. Fallbacks to test mock areas during testing.
 * GET /aladdin/api/v1/zones/{zone_id}/area-list
 */
export async function getPathaoAreas(zoneId: number): Promise<PathaoArea[]> {
  try {
    const res = await pathaoGet<{ data?: { data?: PathaoArea[] } }>(
      `/aladdin/api/v1/zones/${zoneId}/area-list`
    );
    if (res?.data?.data && res.data.data.length > 0) {
      return res.data.data;
    }
    return TEST_MOCK_AREAS[zoneId] || [];
  } catch (err) {
    console.warn(`[Pathao] Using mock areas for testing zone ${zoneId}`);
    return TEST_MOCK_AREAS[zoneId] || [];
  }
}

/**
 * Fetches merchant stores from Pathao.
 * GET /aladdin/api/v1/stores
 */
export async function getPathaoStores(): Promise<Array<{ store_id: number; store_name: string }>> {
  try {
    const res = await pathaoGet<{ data?: { data?: Array<{ store_id: number; store_name: string }> } }>(
      '/aladdin/api/v1/stores'
    );
    return res?.data?.data || [];
  } catch (err) {
    console.warn('[Pathao] Failed to fetch merchant stores:', err);
    return [];
  }
}

/**
 * Calculates dynamic delivery price from Pathao. Fallbacks to test rates during testing.
 * POST /aladdin/api/v1/merchant/price-plan
 */
export async function getPathaoDeliveryFee(
  req: PathaoPriceQuoteRequest
): Promise<PathaoPriceQuoteResponse> {
  const config = getPathaoConfig();
  const rawStoreId = req.storeId || config.storeId;
  const storeIdNum = rawStoreId ? parseInt(String(rawStoreId), 10) : undefined;

  try {
    const payload: Record<string, unknown> = {
      item_type: req.itemType ?? PATHAO_ITEM_TYPES.PARCEL,
      delivery_type: req.deliveryType ?? PATHAO_DELIVERY_TYPES.NORMAL,
      item_weight: req.weight,
      recipient_city: req.cityId,
      recipient_zone: req.zoneId,
    };

    if (storeIdNum && !isNaN(storeIdNum)) {
      payload.store_id = storeIdNum;
    }

    const response = await pathaoPost<{ data?: PathaoPriceQuoteResponse }>(
      '/aladdin/api/v1/merchant/price-plan',
      payload
    );

    if (response?.data?.final_price !== undefined) {
      return response.data;
    }
  } catch (err) {
    console.warn('[Pathao] Live price quote failed, using calculated test rate:', err);
  }

  // Fallback fee calculation: 80 BDT for Dhaka core, 120 BDT for Dhaka Sub-area, 150 BDT Outside Dhaka
  const cleanAddr = (req.recipientAddress || '').toLowerCase();
  const isDhakaSubArea =
    req.cityId === 1 &&
    (cleanAddr.includes('savar') ||
      cleanAddr.includes('gazipur') ||
      cleanAddr.includes('tongi') ||
      cleanAddr.includes('narayanganj') ||
      cleanAddr.includes('keraniganj') ||
      cleanAddr.includes('ashulia') ||
      cleanAddr.includes('dhamrai'));
  const basePrice = req.cityId === 1 ? (isDhakaSubArea ? 120 : 80) : 150;
  const extraWeightFee = req.weight > 0.5 ? Math.ceil((req.weight - 0.5) * 20) : 0;
  const finalPrice = basePrice + extraWeightFee;

  return {
    price: basePrice,
    discount: 0,
    promo_discount: 0,
    cod_percentage: 1,
    additional_charge: extraWeightFee,
    final_price: finalPrice,
  };
}

/**
 * Creates a Pathao Order / Consignment.
 * POST /aladdin/api/v1/orders
 */
export async function createPathaoShipment(
  req: PathaoCreateShipmentRequest
): Promise<PathaoCreateShipmentResponse> {
  const config = getPathaoConfig();
  const rawStoreId = req.storeId || config.storeId;
  let activeStoreId = rawStoreId ? parseInt(String(rawStoreId), 10) : undefined;

  // Auto-fetch merchant's store_id if not explicitly defined in environment or request
  if (!activeStoreId || isNaN(activeStoreId)) {
    try {
      const stores = await getPathaoStores();
      if (stores.length > 0 && stores[0].store_id) {
        activeStoreId = stores[0].store_id;
      }
    } catch (e) {
      console.warn('[Pathao] Failed to auto-detect store_id:', e);
    }
  }

  // Pathao API requires recipient_address to be at least 10 characters long
  let addressText = (req.recipientAddress || '').trim();
  if (addressText.length < 10) {
    addressText = `${addressText}, Bangladesh`.trim();
  }

  const payload: Record<string, unknown> = {
    store_id: activeStoreId || 1,
    merchant_order_id: req.merchantOrderId,
    recipient_name: req.recipientName,
    recipient_phone: sanitizeBdPhone(req.recipientPhone),
    recipient_address: addressText,
    recipient_city: req.recipientCityId,
    recipient_zone: req.recipientZoneId,
    delivery_type: req.deliveryType ?? PATHAO_DELIVERY_TYPES.NORMAL,
    item_type: req.itemType ?? PATHAO_ITEM_TYPES.PARCEL,
    item_quantity: req.itemQuantity,
    item_weight: req.itemWeight,
    amount_to_collect: Math.max(0, Math.round(req.amountToCollect)),
    item_description: req.itemDescription || 'Falak Closet Apparel Order',
  };

  if (req.recipientAreaId) {
    payload.recipient_area = req.recipientAreaId;
  }

  if (req.specialInstruction) {
    payload.special_instruction = req.specialInstruction;
  }

  const response = await pathaoPost<{ data?: PathaoCreateShipmentResponse }>(
    '/aladdin/api/v1/orders',
    payload
  );

  if (!response?.data?.consignment_id) {
    throw new Error('Pathao shipment creation failed: no consignment_id returned by Pathao API.');
  }

  return response.data;
}

/**
 * Maps Pathao courier status string to Falak Closet internal Order status and paymentStatus.
 */
export function mapPathaoStatusToOrderStatus(rawPathaoStatus: string): {
  status: (typeof ORDER_STATUSES)[number];
  courierStatus: string;
  markAsPaid?: boolean;
} {
  const s = (rawPathaoStatus || '').toLowerCase().trim();

  // Delivered or Payment Collected
  if (s.includes('deliver') || s.includes('payment_collected') || s.includes('completed')) {
    return {
      status: 'Delivered',
      courierStatus: 'Delivered',
      markAsPaid: true,
    };
  }

  // Ready for Delivery / Out for Delivery / Last Mile
  if (s.includes('ready_for_delivery') || s.includes('out_for_delivery') || s.includes('last_mile') || s.includes('dispatched')) {
    return {
      status: 'Out for Delivery',
      courierStatus: 'Ready for Delivery',
    };
  }

  // In Transit / On the Way
  if (s.includes('transit') || s.includes('on_the_way')) {
    return {
      status: 'Shipped',
      courierStatus: 'In Transit',
    };
  }

  // Picked
  if (s.includes('picked') || s.includes('pickup')) {
    return {
      status: 'Packed',
      courierStatus: 'Picked',
    };
  }

  // Accepted
  if (s.includes('accept') || s.includes('assigned')) {
    return {
      status: 'Confirmed',
      courierStatus: 'Accepted',
    };
  }

  // Return / Failed / Cancelled
  if (s.includes('return')) {
    return {
      status: 'Returned',
      courierStatus: 'Returned',
    };
  }

  if (s.includes('failed')) {
    return {
      status: 'Failed Delivery',
      courierStatus: 'Failed Delivery',
    };
  }

  if (s.includes('cancel') || s.includes('reject')) {
    return {
      status: 'Cancelled',
      courierStatus: 'Cancelled',
    };
  }

  // Default fallback
  return {
    status: 'Processing',
    courierStatus: rawPathaoStatus || 'Processing',
  };
}
