/**
 * locationBilingual.ts — Helper for English & Bengali location mapping,
 * Dhaka sub-area recognition, and search query normalization.
 */

export interface LocationTranslation {
  en: string;
  bn: string;
  aliases?: string[];
}

/**
 * Known Dhaka Sub-Areas with English & Bengali variants.
 * Applies when City is Dhaka.
 */
export const DHAKA_SUB_AREAS_MAPPING: LocationTranslation[] = [
  { en: 'Savar', bn: 'সাভার', aliases: ['savar', 'সাভার', 'সাভার বাজার'] },
  { en: 'Ashulia', bn: 'আশুলিয়া', aliases: ['ashulia', 'আশুলিয়া', 'আশুলিয়া', 'নবীনগর', 'বাইপাইল', 'জিরাবো'] },
  { en: 'Keraniganj', bn: 'কেরানিগঞ্জ', aliases: ['keraniganj', 'কেরানীগঞ্জ', 'কেরানিগঞ্জ', 'জিনজিরা', 'বসুন্ধরা রিভারভিউ'] },
  { en: 'Gazipur', bn: 'গাজীপুর', aliases: ['gazipur', 'গাজীপুর', 'জয়দেবপুর', 'বোর্ড বাজার', 'চন্দ্রা'] },
  { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ', aliases: ['narayanganj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ', 'ফতুল্লা', 'সিদ্ধিরগঞ্জ', 'কাঁচপুর', 'সোনারগাঁও'] },
  { en: 'Tongi', bn: 'টঙ্গী', aliases: ['tongi', 'টঙ্গি', 'টঙ্গী', 'টঙ্গী বাজার', 'চেরাগ আলী'] },
  { en: 'Dhamrai', bn: 'ধামরাই', aliases: ['dhamrai', 'ধামরাই'] },
  { en: 'Hemayetpur', bn: 'হেমায়েতপুর', aliases: ['hemayetpur', 'হেমায়েতপুর', 'হেমায়েতপুর'] },
  { en: 'Bhedarganj', bn: 'ভেদেরগঞ্জ', aliases: ['bhedarganj', 'ভেদেরগঞ্জ'] },
  { en: 'Kaliakair', bn: 'কালিয়াকৈর', aliases: ['kaliakair', 'কালিয়াকৈর', 'কালিয়াকৈড়'] },
  { en: 'Kapasia', bn: 'কাপাসিয়া', aliases: ['kapasia', 'কাপাসিয়া'] },
  { en: 'Sreepur', bn: 'শ্রীপুর', aliases: ['sreepur', 'শ্রীপুর'] },
  { en: 'Mirzapur', bn: 'মির্জাপুর', aliases: ['mirzapur', 'মির্জাপুর'] },
  { en: 'Tarabo', bn: 'তারাবো', aliases: ['tarabo', 'তারাবো'] },
  { en: 'Araihazar', bn: 'আড়াইহাজার', aliases: ['araihazar', 'আড়াইহাজার', 'আড়াইহাজার'] },
];

/**
 * Major Dhaka Core Zones with English & Bengali variants.
 */
export const DHAKA_CORE_ZONES_MAPPING: LocationTranslation[] = [
  { en: 'Dhanmondi', bn: 'ধানমন্ডি', aliases: ['dhanmondi', 'ধানমন্ডি', 'ধানমণ্ডি'] },
  { en: 'Uttara', bn: 'উত্তরা', aliases: ['uttara', 'উত্তরা'] },
  { en: 'Mirpur', bn: 'মিরপুর', aliases: ['mirpur', 'মিরপুর'] },
  { en: 'Gulshan', bn: 'গুলশান', aliases: ['gulshan', 'গুলশান'] },
  { en: 'Banani', bn: 'বনানী', aliases: ['banani', 'বনানী'] },
  { en: 'Mohammadpur', bn: 'মোহাম্মদপুর', aliases: ['mohammadpur', 'মোহাম্মদপুর'] },
  { en: 'Bashundhara', bn: 'বসুন্ধরা', aliases: ['bashundhara', 'বসুন্ধরা'] },
  { en: 'Badda', bn: 'বাড্ডা', aliases: ['badda', 'বাড্ডা'] },
  { en: 'Rampura', bn: 'রামপুরা', aliases: ['rampura', 'রামপুরা'] },
  { en: 'Khilgaon', bn: 'খিলগাঁও', aliases: ['khilgaon', 'খিলগাঁও'] },
  { en: 'Jatrabari', bn: 'যাত্রাবাড়ী', aliases: ['jatrabari', 'যাত্রাবাড়ী', 'যাত্রাবাড়ী'] },
  { en: 'Motijheel', bn: 'মতিঝিল', aliases: ['motijheel', 'মতিঝিল'] },
  { en: 'Old Dhaka', bn: 'পুরান ঢাকা', aliases: ['old dhaka', 'puran dhaka', 'পুরান ঢাকা', 'পুরানো ঢাকা'] },
  { en: 'Malibagh', bn: 'মালিবাগ', aliases: ['malibagh', 'মালিবাগ'] },
  { en: 'Moghbazar', bn: 'মগবাজার', aliases: ['moghbazar', 'মগবাজার'] },
  { en: 'Tejgaon', bn: 'তেজগাঁও', aliases: ['tejgaon', 'তেজগাঁও'] },
  { en: 'Lalmatia', bn: 'লালমাটিয়া', aliases: ['lalmatia', 'লালমাটিয়া'] },
  { en: 'Shyamoli', bn: 'শ্যামলী', aliases: ['shyamoli', 'শ্যামলী'] },
  { en: 'Kalyanpur', bn: 'কল্যাণপুর', aliases: ['kalyanpur', 'কল্যাণপুর'] },
  { en: 'Nikunja', bn: 'নিকুঞ্জ', aliases: ['nikunja', 'নিকুঞ্জ'] },
];

import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_DIVISIONS,
} from './bangladeshLocations';

/**
 * Major Bangladesh District / City Mappings generated from Bangladesh locations.
 */
const EXTRA_ALIASES: Record<string, string[]> = {
  Chattogram: ['chittagong', 'chattogram', 'চট্টগ্রাম'],
  Bogura: ['bogra', 'bogura', 'বগুড়া', 'বগুড়া'],
  Jashore: ['jessore', 'jashore', 'যশোর'],
  Cumilla: ['comilla', 'cumilla', 'কুমিল্লা'],
  Barishal: ['barisal', 'barishal', 'বরিশাল'],
  Mymensingh: ['mymensingh', 'ময়মনসিংহ', 'ময়মনসিংহ'],
  Brahmanbaria: ['brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মণবাড়িয়া'],
  Kushtia: ['kushtia', 'কুষ্টিয়া', 'কুষ্টিয়া'],
  "Cox's Bazar": ['coxs bazar', "cox's bazar", 'কক্সবাজার'],
};

export const CITY_DISTRICT_MAPPING: LocationTranslation[] = [
  ...BANGLADESH_DIVISIONS.map((div) => ({
    en: div.nameEn,
    bn: div.nameBn,
    aliases: [div.nameEn.toLowerCase(), div.nameBn, ...(EXTRA_ALIASES[div.nameEn] || [])],
  })),
  ...BANGLADESH_DISTRICTS.map((dist) => ({
    en: dist.nameEn,
    bn: dist.nameBn,
    aliases: [dist.nameEn.toLowerCase(), dist.nameBn, ...(EXTRA_ALIASES[dist.nameEn] || [])],
  })),
];


/**
 * Checks if input represents Dhaka city (in English or Bengali).
 */
export function isDhakaCity(cityText?: string | null): boolean {
  if (!cityText) return false;
  const clean = cityText.toLowerCase().trim();
  return clean.includes('dhaka') || clean.includes('ঢাকা');
}

/**
 * Checks if input text matches any Dhaka Sub-Area (English or Bengali).
 */
export function isDhakaSubArea(text?: string | null): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().trim();
  return DHAKA_SUB_AREAS_MAPPING.some((sub) =>
    (sub.aliases || [sub.en.toLowerCase(), sub.bn]).some((alias) => clean.includes(alias.toLowerCase()))
  );
}

/**
 * Normalizes text for matching by replacing Bengali variants & lowercasing.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Returns searchable search terms for a given English option label.
 * E.g. "Savar" -> ["Savar", "সাভার"]
 */
export function getSearchableTerms(label: string): string[] {
  const clean = label.trim().toLowerCase();
  const allMappings = [...DHAKA_SUB_AREAS_MAPPING, ...DHAKA_CORE_ZONES_MAPPING, ...CITY_DISTRICT_MAPPING];
  const found = allMappings.find(
    (m) => m.en.toLowerCase() === clean || (m.aliases && m.aliases.some((a) => a.toLowerCase() === clean))
  );
  if (found) {
    return [found.en, found.bn, ...(found.aliases || [])];
  }
  return [label];
}

/**
 * Smartly attempts to match a zone from a text string (e.g. street address in English or Bengali).
 */
export function matchZoneFromText(
  streetAddress: string,
  zones: Array<{ zone_id: number; zone_name: string }>
): number | null {
  if (!streetAddress || !zones || zones.length === 0) return null;
  const cleanStreet = streetAddress.toLowerCase().trim();

  // Try direct zone_name match first
  for (const z of zones) {
    const zNameClean = z.zone_name.toLowerCase();
    if (cleanStreet.includes(zNameClean)) {
      return z.zone_id;
    }
  }

  // Try bilingual dictionary match
  const allMappings = [...DHAKA_SUB_AREAS_MAPPING, ...DHAKA_CORE_ZONES_MAPPING];
  for (const mapping of allMappings) {
    const hasMatchInStreet = (mapping.aliases || [mapping.en.toLowerCase(), mapping.bn]).some((alias) =>
      cleanStreet.includes(alias.toLowerCase())
    );

    if (hasMatchInStreet) {
      // Find which zone in `zones` corresponds to this mapping
      const matchedZone = zones.find((z) => {
        const zClean = z.zone_name.toLowerCase();
        return (
          zClean.includes(mapping.en.toLowerCase()) ||
          mapping.en.toLowerCase().includes(zClean)
        );
      });
      if (matchedZone) {
        return matchedZone.zone_id;
      }
    }
  }

  return null;
}

export interface CalculateShippingFeeParams {
  division?: string | null;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  zoneName?: string | null;
  areaName?: string | null;
  subtotal?: number;
  freeShippingThreshold?: number;
  isFreeDelivery?: boolean;
  items?: Array<{ product?: any; quantity?: number }> | null;
}

export interface ShippingFeeResult {
  fee: number;
  tier: 'dhaka_core' | 'dhaka_subarea' | 'outside_dhaka' | 'free_shipping';
  reason: string;
}

/**
 * Checks whether an order qualifies for free delivery either by:
 * 1. Meeting site-wide store free shipping threshold (subtotal >= freeShippingThreshold, where threshold > 0)
 * 2. Meeting product-level free delivery quantity threshold (ordered quantity of product >= product.freeDeliveryQuantity)
 */
export function checkIsFreeDelivery(
  items: Array<{ product?: any; quantity?: number }> | null | undefined,
  subtotal: number = 0,
  freeShippingThreshold: number = Infinity
): boolean {
  const numThreshold = Number(freeShippingThreshold);
  if (!isNaN(numThreshold) && numThreshold > 0 && numThreshold < Infinity && subtotal > 0 && subtotal >= numThreshold) {
    return true;
  }

  if (Array.isArray(items) && items.length > 0) {
    const quantitiesByProductId: Record<string, number> = {};
    for (const item of items) {
      const prod = item?.product;
      const pid = prod?.id || prod?._id;
      if (pid) {
        quantitiesByProductId[pid] = (quantitiesByProductId[pid] || 0) + (item?.quantity ?? 1);
      }
    }

    for (const item of items) {
      const prod = item?.product;
      const reqQty = prod?.freeDeliveryQuantity;
      const pid = prod?.id || prod?._id;
      if (prod && typeof reqQty === 'number' && reqQty > 0 && pid) {
        const totalQty = quantitiesByProductId[pid] || 0;
        if (totalQty >= reqQty) {
          return true;
        }
      }
    }
  }

  return false;
}

import { parseAddressLocation, ParsedLocation } from './addressParser';
export { parseAddressLocation, type ParsedLocation };

/**
 * Single source of truth for calculating tiered shipping rates in Bangladesh:
 * - Free Shipping: isFreeDelivery || subtotal >= freeShippingThreshold || product freeDeliveryQuantity met => ৳0
 * - Inside Dhaka Core: ৳80
 * - Dhaka Sub-area (Savar, Ashulia, Keraniganj, Gazipur, Tongi, Narayanganj, Dhamrai): ৳100
 * - Outside Dhaka: ৳150
 */
export function calculateShippingFee({
  division,
  district,
  city,
  address,
  zoneName,
  areaName,
  subtotal = 0,
  freeShippingThreshold = Infinity,
  isFreeDelivery = false,
  items = null,
}: CalculateShippingFeeParams): ShippingFeeResult {
  const isUnlocked = isFreeDelivery || checkIsFreeDelivery(items, subtotal, freeShippingThreshold);

  if (isUnlocked) {
    return {
      fee: 0,
      tier: 'free_shipping',
      reason: 'Free Shipping Threshold Met',
    };
  }

  // Combine all location indicators to parse address with typo tolerance
  const combined = [address, district, city, division, zoneName, areaName]
    .filter(Boolean)
    .join(' ');

  const parsed = parseAddressLocation(combined);

  return {
    fee: parsed.rate,
    tier: parsed.tier,
    reason: parsed.badgeLabelBn,
  };
}


