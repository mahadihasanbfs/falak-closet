/**
 * products.ts — server-side product access.
 *
 * Reads Prisma **directly** rather than going through `fetcher.ts`, which would
 * make the app fetch its own API route: that path guesses the origin from
 * NEXT_PUBLIC_SITE_URL/PORT and can deadlock during prerender. Reads are wrapped
 * in `unstable_cache` tagged with PRODUCTS_TAG — the primitive Next prescribes
 * for non-`fetch` data sources while `cacheComponents` is off in next.config.ts.
 *
 * Import this from Server Components and Route Handlers only.
 */

import { unstable_cache } from 'next/cache';
import type { Product as ProductRow } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PRODUCTS_TAG } from '@/lib/fetcher';
import type { Product } from '@/data/products';

/** A Mongo ObjectId rendered as hex — how Prisma exposes `_id`. */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function isObjectId(value: string): boolean {
  return OBJECT_ID.test(value);
}

// ─── Serialization ───────────────────────────────────────────────────────────

/** Prisma returns `null` for absent optional scalars; the app's types use `undefined`. */
function opt<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert a Prisma row into the plain `Product` the UI expects.
 * Required because `createdAt`/`updatedAt` are `Date` objects, which cannot cross
 * the Server → Client Component boundary.
 */
export function serializeProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    code: row.code ?? '',
    category: row.category,
    subCategory: opt(row.subCategory),
    price: row.price,
    buyingPrice: opt(row.buyingPrice),
    originalPrice: row.originalPrice,
    rating: row.rating,
    reviewCount: row.reviewCount,
    isNew: opt(row.isNew),
    isNewArrival: row.isNewArrival,
    isBestSeller: row.isBestSeller,
    isFlashSale: row.isFlashSale,
    discountPercentage: row.discountPercentage,
    workType: row.workType,
    occasion: row.occasion,
    material: row.material,
    weather: opt(row.weather),
    colors: row.colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      imageIndex: opt(c.imageIndex),
      images: c.images,
    })),
    sizes: row.sizes,
    variations: row.variations.map((v) => ({
      id: v.id,
      colorName: v.colorName,
      colorHex: v.colorHex,
      size: v.size,
      stock: v.stock,
      price: opt(v.price),
      buyingPrice: opt(v.buyingPrice),
      priceOverride: opt(v.priceOverride),
      originalPrice: opt(v.originalPrice),
      imageUrl: opt(v.imageUrl),
      shortDetails: opt(v.shortDetails),
      isHidden: opt(v.isHidden),
    })),
    stock: row.stock,
    images: row.images,
    description: row.description,
    features: row.features,
    careInstructions: row.careInstructions,
    reviewsList: row.reviewsList.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      date: r.date,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      status: r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : undefined,
    })),
    freeDeliveryQuantity: opt(row.freeDeliveryQuantity),
    tierDiscounts: (row.tierDiscounts || []).map((t) => ({
      minQuantity: t.minQuantity,
      discountAmount: t.discountAmount,
    })),
    videoUrl: opt(row.videoUrl),
    landingDiscountPercentage: opt(row.landingDiscountPercentage),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Remove sensitive financial fields (such as `buyingPrice`) from products
 * before returning them to public unauthenticated API endpoints.
 */
export function sanitizeProductForPublic<T extends Product>(product: T): T {
  const sanitized = { ...product };
  delete sanitized.buyingPrice;
  if (Array.isArray(sanitized.variations)) {
    sanitized.variations = sanitized.variations.map((v) => {
      const vCopy = { ...v };
      delete vCopy.buyingPrice;
      return vCopy;
    });
  }
  return sanitized;
}

/**
 * Lighter mapping for LIST reads (shop grid, cart, search, layout seed).
 *
 * Strips the prose-heavy fields list surfaces never render — description,
 * features, careInstructions, reviewsList. `variations` deliberately STAYS:
 * SearchAutocomplete matches by variation color/size and uses imageUrl for
 * thumbnails. Without this trim the whole catalog rides in one
 * `unstable_cache` entry, and Next.js silently refuses to cache payloads
 * over 2MB (uncatchable rejection logged as "items over 2MB can not be
 * cached") — with prose included the catalog crossed that line.
 *
 * Full documents still come from `serializeProduct` via getProductBySlugOrId.
 */
export function serializeProductCard(row: ProductRow): Product {
  const {
    description: _description,
    features: _features,
    careInstructions: _careInstructions,
    reviewsList: _reviewsList,
    ...card
  } = serializeProduct(row);
  return card;
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export type ProductSort = 'newest' | 'price-low' | 'price-high' | 'rating' | 'name';

export interface ProductQuery {
  category?: string;
  subCategory?: string;
  q?: string;
  sort?: ProductSort;
  limit?: number;
}

function orderFor(sort: ProductSort = 'newest') {
  switch (sort) {
    case 'price-low':
      return { price: 'asc' as const };
    case 'price-high':
      return { price: 'desc' as const };
    case 'rating':
      return { rating: 'desc' as const };
    case 'name':
      return { name: 'asc' as const };
    default:
      return { createdAt: 'desc' as const };
  }
}

/**
 * Uncached, filtered read — for route handlers, where the query varies per request.
 * Server Components should prefer `getProducts()`.
 */
export async function queryProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { category, subCategory, q, sort, limit } = query;

  // Products store either a category name ("Hijabs & Dupattas") or a slug
  // ("hijabs-dupattas") depending on when they were created, so match loosely.
  const rows = await prisma.product.findMany({
    where: {
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(subCategory ? { subCategory: { equals: subCategory, mode: 'insensitive' } } : {}),
      ...(q
        ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { material: { contains: q, mode: 'insensitive' } },
          ],
        }
        : {}),
    },
    orderBy: orderFor(sort),
    ...(limit && limit > 0 ? { take: limit } : {}),
  });

  return rows.map(serializeProduct);
}

/**
 * Every product, newest first — as slim cards. Cached and tagged, so any
 * mutation calling revalidateTag(PRODUCTS_TAG, 'max') refreshes the storefront.
 */
export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    const products = rows.map(serializeProductCard);

    // Next.js drops cache entries over 2MB with an uncatchable rejection —
    // surface the problem here, where it is still actionable, instead of a
    // mystery log line at the layout. 1.5MB leaves room to grow past the warn.
    const bytes = Buffer.byteLength(JSON.stringify(products), 'utf8');
    if (bytes > 1.5 * 1024 * 1024) {
      console.warn(
        `[products] cached catalog is ${(bytes / 1048576).toFixed(1)}MB — Next.js data cache caps at 2MB; migrate embedded images or trim serializeProductCard fields`
      );
    }

    return products;
  },
  ['products:all'],
  { tags: [PRODUCTS_TAG], revalidate: 3600 }
);

/**
 * Resolve one product by slug **or** ObjectId.
 *
 * Both are needed: the storefront links by slug, while the admin table and the
 * legacy Mongoose-era documents key off ids.
 */
export const getProductBySlugOrId = unstable_cache(
  async (key: string): Promise<Product | null> => {
    if (!key) return null;

    const row = await prisma.product.findFirst({
      where: isObjectId(key) ? { OR: [{ id: key }, { slug: key }] } : { slug: key },
    });

    return row ? serializeProduct(row) : null;
  },
  ['products:one'],
  { tags: [PRODUCTS_TAG], revalidate: 3600 }
);

/** Slugs only — for the sitemap. */
export const getProductSlugs = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const rows = await prisma.product.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  },
  ['products:slugs'],
  { tags: [PRODUCTS_TAG], revalidate: 3600 }
);

/** Fetch products tagged as isFlashSale. Cached and tagged under PRODUCTS_TAG. */
export const getFlashSaleProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({
      where: { isFlashSale: true },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(serializeProductCard);
  },
  ['products:flash-sale'],
  { tags: [PRODUCTS_TAG], revalidate: 3600 }
);

/** `getFlashSaleProducts()` that never throws — returns empty array on DB failure. */
export async function getFlashSaleProductsSafe(): Promise<Product[]> {
  try {
    return await getFlashSaleProducts();
  } catch (err) {
    console.error('[products] flash sale read failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * `getProducts()` that reports failure instead of throwing.
 *
 * The root layout seeds the cart context with this so every page renders the
 * catalog server-side. A throw there would take down *every* route, including
 * ones that do not show products at all — so the outage is returned as data and
 * surfaced in the UI as "catalog unavailable" rather than "no products".
 */
export async function getProductsSafe(): Promise<{ products: Product[]; error: string | null }> {
  try {
    return { products: await getProducts(), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('[products] catalog read failed:', message);
    return { products: [], error: message };
  }
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/** Thrown by `buildProductData` for caller mistakes — routes map it to a 400. */
export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductValidationError';
  }
}

export function slugifyProduct(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value: unknown, fallback = 0): number {
  return Math.trunc(toNum(value, fallback));
}

function toBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toStrList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => toStr(v)).filter(Boolean);
}

type Raw = Record<string, unknown>;

function toColors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Raw => Boolean(c) && typeof c === 'object')
    .map((c) => ({
      name: toStr(c.name) || 'Default',
      hex: toStr(c.hex) || '#000000',
      ...(c.imageIndex === undefined || c.imageIndex === null
        ? {}
        : { imageIndex: toInt(c.imageIndex) }),
      images: toStrList(c.images),
    }));
}

function toVariations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Raw => Boolean(v) && typeof v === 'object')
    .map((v, i) => ({
      id: toStr(v.id) || `var-${i}`,
      colorName: toStr(v.colorName),
      colorHex: toStr(v.colorHex) || '#000000',
      size: toStr(v.size),
      stock: toInt(v.stock),
      ...(v.price === undefined || v.price === null ? {} : { price: toNum(v.price) }),
      ...(v.buyingPrice === undefined || v.buyingPrice === null ? {} : { buyingPrice: toNum(v.buyingPrice) }),
      ...(v.priceOverride === undefined || v.priceOverride === null
        ? {}
        : { priceOverride: toNum(v.priceOverride) }),
      ...(v.originalPrice === undefined || v.originalPrice === null
        ? {}
        : { originalPrice: toNum(v.originalPrice) }),
      ...(v.imageUrl === undefined || v.imageUrl === null ? {} : { imageUrl: toStr(v.imageUrl) }),
      ...(v.shortDetails === undefined || v.shortDetails === null ? {} : { shortDetails: toStr(v.shortDetails) }),
      isHidden: toBool(v.isHidden),
    }));
}

function toReviews(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Raw => Boolean(r) && typeof r === 'object')
    .map((r, i) => ({
      id: toStr(r.id) || `rev-${i}`,
      author: toStr(r.author) || 'Anonymous',
      rating: toNum(r.rating, 5),
      date: toStr(r.date) || '2026-01-01',
      comment: toStr(r.comment),
      verifiedPurchase: toBool(r.verifiedPurchase),
      status: toStr(r.status) === 'pending' ? 'pending' : 'approved',
    }));
}

/**
 * The single whitelist/coercion gate for every product write (POST, PUT, seed).
 *
 * Prisma rejects unknown fields, and the admin form's payload carries UI-only
 * keys (`featuresText`, `careText`, `_id`, …). Enumerating the accepted fields
 * here — rather than spreading the request body — is what keeps those out.
 *
 * With `partial: true` only the keys actually present in `body` are returned, so
 * a PATCH cannot blank out fields it never mentioned.
 */
export function buildProductData(body: Raw, options: { partial?: boolean } = {}) {
  const partial = options.partial === true;
  const data: Raw = {};
  const sent = (key: string) => body[key] !== undefined;

  // ── name & slug ──
  if (sent('name') || !partial) {
    const name = toStr(body.name);
    if (!name) throw new ProductValidationError('Product name is required');
    data.name = name;
  }

  // On create the slug is derived from the name. On update it changes only when
  // explicitly sent — a rename must not silently break existing product URLs.
  if (sent('slug')) {
    const slug = slugifyProduct(toStr(body.slug));
    if (!slug) throw new ProductValidationError('Slug cannot be empty');
    data.slug = slug;
  } else if (!partial) {
    const slug = slugifyProduct(toStr(body.name));
    if (!slug) throw new ProductValidationError('Could not derive a slug from the product name');
    data.slug = slug;
  }

  // ── pricing ──
  if (sent('price') || !partial) {
    const price = toNum(body.price, -1);
    if (price < 0) throw new ProductValidationError('A non-negative price is required');
    data.price = price;
  }

  if (sent('buyingPrice')) {
    data.buyingPrice = Math.max(0, toNum(body.buyingPrice, 0));
  } else if (!partial) {
    data.buyingPrice = Math.max(0, toNum(body.buyingPrice, 0));
  }

  if (sent('originalPrice') || !partial) {
    // Falls back to the price so the "was / now" UI never shows a negative saving.
    data.originalPrice = toNum(body.originalPrice, 0) || toNum(body.price, 0);
  }

  // Always recompute rather than trusting the client: the storefront badge and
  // the discount sort both read this field.
  const price = toNum(data.price ?? body.price, NaN);
  const original = toNum(data.originalPrice ?? body.originalPrice, NaN);
  if (Number.isFinite(price) && Number.isFinite(original) && original > price && original > 0) {
    data.discountPercentage = Math.round(((original - price) / original) * 100);
  } else if (sent('discountPercentage')) {
    data.discountPercentage = toNum(body.discountPercentage);
  } else if (!partial) {
    data.discountPercentage = 0;
  }

  // ── taxonomy ──
  if (sent('category') || !partial) {
    const category = toStr(body.category);
    if (!category) throw new ProductValidationError('Category is required');
    data.category = category;
  }
  if (sent('subCategory')) data.subCategory = toStr(body.subCategory) || null;
  if (sent('code')) data.code = toStr(body.code) || null;
  if (sent('weather')) data.weather = toStr(body.weather) || null;

  if (sent('workType') || !partial) data.workType = toStr(body.workType) || 'Printed & Plain';
  if (sent('occasion') || !partial) data.occasion = toStr(body.occasion) || 'Daily & Casual';
  if (sent('material') || !partial) data.material = toStr(body.material) || 'Cotton';

  // ── flags ──
  if (sent('isNew')) data.isNew = toBool(body.isNew);
  if (sent('isNewArrival') || !partial) data.isNewArrival = toBool(body.isNewArrival);
  if (sent('isBestSeller') || !partial) data.isBestSeller = toBool(body.isBestSeller);
  if (sent('isFlashSale') || !partial) data.isFlashSale = toBool(body.isFlashSale);

  // ── ratings & stock ──
  if (sent('rating') || !partial) data.rating = toNum(body.rating, 4.8);
  if (sent('reviewCount') || !partial) data.reviewCount = toInt(body.reviewCount, 0);
  if (sent('stock') || !partial) data.stock = toInt(body.stock, 0);

  if (sent('freeDeliveryQuantity')) {
    const rawVal = body.freeDeliveryQuantity;
    if (rawVal === null || rawVal === undefined || rawVal === 0 || rawVal === '0' || rawVal === '') {
      data.freeDeliveryQuantity = null;
    } else {
      const num = Number(rawVal);
      if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
        throw new ProductValidationError('Free delivery quantity must be a positive integer.');
      }
      data.freeDeliveryQuantity = toInt(rawVal);
    }
  }

  if (sent('tierDiscounts')) {
    const raw = body.tierDiscounts;
    if (!Array.isArray(raw)) {
      data.tierDiscounts = [];
    } else {
      data.tierDiscounts = raw
        .map((item: any) => ({
          minQuantity: Math.max(1, parseInt(item.minQuantity, 10) || 1),
          discountAmount: Math.max(0, parseFloat(item.discountAmount) || 0),
        }))
        .filter((item: any) => item.minQuantity > 0 && item.discountAmount > 0);
    }
  }

  if (sent('videoUrl')) {
    data.videoUrl = toStr(body.videoUrl) || null;
  }

  if (sent('landingDiscountPercentage')) {
    const raw = body.landingDiscountPercentage;
    if (raw === null || raw === undefined || raw === '' || Number(raw) === 0) {
      data.landingDiscountPercentage = null;
    } else {
      const parsed = toNum(raw, 0);
      data.landingDiscountPercentage = Math.max(0, Math.min(100, parsed));
    }
  }

  // ── collections ──
  if (sent('colors') || !partial) data.colors = toColors(body.colors);
  if (sent('sizes') || !partial) data.sizes = toStrList(body.sizes);
  if (sent('variations')) data.variations = toVariations(body.variations);
  if (sent('images') || !partial) data.images = toStrList(body.images);
  if (sent('features') || !partial) data.features = toStrList(body.features);
  if (sent('careInstructions') || !partial) data.careInstructions = toStrList(body.careInstructions);
  if (sent('reviewsList')) data.reviewsList = toReviews(body.reviewsList);

  // ── description ──
  if (sent('description') || !partial) data.description = toStr(body.description);

  // Stock is the sum of the variation matrix whenever the admin form supplied one.
  if (Array.isArray(data.variations) && data.variations.length > 0) {
    const total = (data.variations as { stock: number }[]).reduce((sum, v) => sum + (v.stock || 0), 0);
    if (total > 0) data.stock = total;

    const validPrices = (data.variations as { price?: number; isHidden?: boolean }[])
      .filter((v) => !v.isHidden && typeof v.price === 'number' && v.price > 0)
      .map((v) => v.price!);
    if (validPrices.length > 0) {
      data.price = Math.min(...validPrices);
    }

    const validBuyingPrices = (data.variations as { buyingPrice?: number; isHidden?: boolean }[])
      .filter((v) => !v.isHidden && typeof v.buyingPrice === 'number' && v.buyingPrice > 0)
      .map((v) => v.buyingPrice!);
    if (validBuyingPrices.length > 0) {
      data.buyingPrice = Math.min(...validBuyingPrices);
    }
  }

  return data;
}

/**
 * Append `-2`, `-3`, … until the slug is free. Used by the seed route, where a
 * collision should not abort the whole batch.
 */
export async function resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugifyProduct(base) || 'product';
  let candidate = root;

  for (let n = 2; n < 100; n += 1) {
    const clash = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
  }

  return `${root}-${slugifyProduct(String(Math.random()).slice(2, 8))}`;
}
