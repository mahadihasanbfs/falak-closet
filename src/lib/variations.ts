import type { ProductVariation } from '@/data/products';

/** Case/whitespace-insensitive identity of a variation: `color|size`. */
export function variationKey(v: { colorName?: string; size?: string }): string {
  return `${(v.colorName || '').trim().toLowerCase()}|${(v.size || '').trim().toLowerCase()}`;
}

export interface VariationDedupeResult {
  /** Deduplicated list, original order preserved. */
  kept: ProductVariation[];
  /** The duplicates that were dropped (audit record — save this). */
  removed: ProductVariation[];
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * Deduplicate variations by normalized color+size, keeping the FIRST
 * occurrence (same rule the storefront grid uses, so admin and shop agree).
 *
 * Before a duplicate is dropped, any field the keeper is missing is filled
 * from it — price fields, image, details, hex, and stock only when the keeper
 * is at 0 — so no unique data is lost by the merge. `isHidden` is never
 * merged: the keeper's visibility stands, exactly as the admin first set it.
 * Stock is never summed: a re-added duplicate row is a fresh entry, not a
 * split of real inventory.
 *
 * Pure function: input array and its objects are not mutated.
 */
export function dedupeVariations(variations: ProductVariation[]): VariationDedupeResult {
  const clones = variations.map((v) => ({ ...v }));
  const seen = new Map<string, ProductVariation>();
  const kept: ProductVariation[] = [];
  const removed: ProductVariation[] = [];

  for (const v of clones) {
    const key = variationKey(v);
    const first = seen.get(key);

    if (!first) {
      seen.set(key, v);
      kept.push(v);
      continue;
    }

    // Merge missing data into the keeper before dropping this duplicate.
    if (first.price == null && v.price != null) first.price = v.price;
    if (first.buyingPrice == null && v.buyingPrice != null) first.buyingPrice = v.buyingPrice;
    if (first.priceOverride == null && v.priceOverride != null) first.priceOverride = v.priceOverride;
    if (first.originalPrice == null && v.originalPrice != null) first.originalPrice = v.originalPrice;
    if (isBlank(first.imageUrl) && !isBlank(v.imageUrl)) first.imageUrl = v.imageUrl;
    if (isBlank(first.shortDetails) && !isBlank(v.shortDetails)) first.shortDetails = v.shortDetails;
    if ((isBlank(first.colorHex) || first.colorHex === '#000000') && !isBlank(v.colorHex) && v.colorHex !== '#000000') {
      first.colorHex = v.colorHex;
    }
    if (first.stock <= 0 && v.stock > 0) first.stock = v.stock;

    removed.push(v);
  }

  return { kept, removed };
}
