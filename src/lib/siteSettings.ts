/**
 * siteSettings.ts — cached server reads of the SiteSetting collection.
 *
 * The /api/settings route owns writes; every write busts SITE_SETTINGS_TAG so
 * these cached reads refresh on the next request. Import from Server
 * Components and Route Handlers only.
 */

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { SITE_SETTINGS_TAG } from '@/lib/fetcher';

/** Mirrors DEFAULT_SETTINGS['store'] in /api/settings. 0 = disabled by default. */
const DEFAULT_FREE_DELIVERY_THRESHOLD = 0;

export interface StoreSettings {
  freeShippingThreshold: number;
  currencySymbol: string;
}

export interface SiteIdentity {
  contactPhone: string;
  contactEmail: string;
  address: string;
  /** Plain @handle or full https URL — empty string = hidden. */
  whatsapp: string;
  instagram: string;
  facebook: string;
  youtube: string;
}

/** One "Why Choose Us" card on the home page. */
export interface ValuePropItem {
  /** Whitelisted icon key — see ICONS in ValuePropsSection.tsx. */
  icon: string;
  title: string;
  description: string;
}

export interface Announcement {
  message: string;
  /** Internal path (/...) or https URL — empty = text-only bar. */
  link: string;
  linkLabel: string;
  isActive: boolean;
  freeDeliveryOffer?: boolean;
  freeDeliveryMinQty?: number;
  freeDeliveryCategory?: string;
}

/** Matches DEFAULT_SETTINGS['site'] in /api/settings. */
export const EMPTY_SITE_IDENTITY: SiteIdentity = {
  contactPhone: '',
  contactEmail: '',
  address: '',
  whatsapp: '',
  instagram: '',
  facebook: '',
  youtube: ''
};

function parseStore(value: unknown): StoreSettings {
  const store = (value ?? {}) as Record<string, unknown>;
  const threshold = Number(store.freeShippingThreshold);
  return {
    freeShippingThreshold:
      Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_FREE_DELIVERY_THRESHOLD,
    currencySymbol: typeof store.currencySymbol === 'string' ? store.currencySymbol : '৳ BDT',
  };
}

export const getStoreSettings = unstable_cache(
  async (): Promise<StoreSettings> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'store' } });
    // Absent row → defaults (the API seeds on first read; here we just degrade).
    return parseStore(row?.value);
  },
  ['settings:store'],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 }
);

/**
 * `getStoreSettings()` with built-in fallback — pages must never 500 over a
 * settings read.
 */
export async function getStoreSettingsSafe(): Promise<StoreSettings> {
  try {
    return await getStoreSettings();
  } catch (err) {
    console.error('[settings] store read failed:', err);
    return parseStore(null);
  }
}

function parseIdentity(value: unknown): SiteIdentity {
  const site = (value ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    contactPhone: str(site.contactPhone),
    contactEmail: str(site.contactEmail),
    address: str(site.address),
    whatsapp: str(site.whatsapp),
    instagram: str(site.instagram),
    facebook: str(site.facebook),
    youtube: str(site.youtube),
  };
}

export const getSiteIdentity = unstable_cache(
  async (): Promise<SiteIdentity> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'site' } });
    return parseIdentity(row?.value);
  },
  ['settings:site'],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 }
);

/** `getSiteIdentity()` with built-in fallback (all-empty identity). */
export async function getSiteIdentitySafe(): Promise<SiteIdentity> {
  try {
    return await getSiteIdentity();
  } catch (err) {
    console.error('[settings] site identity read failed:', err);
    return EMPTY_SITE_IDENTITY;
  }
}

/** The four cards the storefront shipped with — fallback when unset. */
export const DEFAULT_VALUE_PROPS: ValuePropItem[] = [
  { icon: 'award', title: 'Premium Nida & Silk Fabrics', description: 'Crafted with imported Korean Nida, pure Dubai silk, and breathable airy cotton fabrics.' },
  { icon: 'shield', title: '100% Authentic Modest Cut', description: 'Generous flared silhouettes, full-length hemlines, and modest wrist coverage for effortless modesty.' },
  { icon: 'truck', title: 'Fast Doorstep BD Delivery', description: 'Swift 2-3 day express courier delivery across all 64 districts in Bangladesh.' },
  { icon: 'rotate', title: '30-Day Easy Exchange', description: 'Hassle-free size replacement and item exchange guarantee within 30 days.' },
];

function parseValueProps(value: unknown): ValuePropItem[] {
  if (!Array.isArray(value)) return DEFAULT_VALUE_PROPS;
  const items = value
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')
    .map((v) => ({
      icon: typeof v.icon === 'string' ? v.icon : 'sparkles',
      title: typeof v.title === 'string' ? v.title.trim() : '',
      description: typeof v.description === 'string' ? v.description.trim() : '',
    }))
    .filter((v) => v.title);
  return items.length > 0 ? items : DEFAULT_VALUE_PROPS;
}

export const getValueProps = unstable_cache(
  async (): Promise<ValuePropItem[]> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'value-props' } });
    return parseValueProps(row?.value);
  },
  ['settings:value-props'],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 }
);

export async function getValuePropsSafe(): Promise<ValuePropItem[]> {
  try {
    return await getValueProps();
  } catch (err) {
    console.error('[settings] value props read failed:', err);
    return DEFAULT_VALUE_PROPS;
  }
}

function parseAnnouncement(value: unknown): Announcement {
  const a = (value ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const message = str(a.message);
  return {
    message,
    link: str(a.link),
    linkLabel: str(a.linkLabel),
    isActive: a.isActive === true,
    freeDeliveryOffer: typeof a.freeDeliveryOffer === 'boolean'
      ? a.freeDeliveryOffer
      : /free|delivery|ডেলিভারি/i.test(message),
    freeDeliveryMinQty: num(a.freeDeliveryMinQty, 8),
    freeDeliveryCategory: str(a.freeDeliveryCategory) || 'Hijab',
  };
}

export const EMPTY_ANNOUNCEMENT: Announcement = {
  message: '',
  link: '',
  linkLabel: '',
  isActive: false,
  freeDeliveryOffer: false,
  freeDeliveryMinQty: 8,
  freeDeliveryCategory: 'Hijab',
};

export const getAnnouncement = unstable_cache(
  async (): Promise<Announcement> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'announcement' } });
    return parseAnnouncement(row?.value);
  },
  ['settings:announcement'],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 }
);

export async function getAnnouncementSafe(): Promise<Announcement> {
  try {
    return await getAnnouncement();
  } catch (err) {
    console.error('[settings] announcement read failed:', err);
    return EMPTY_ANNOUNCEMENT;
  }
}
