import { Product } from '@/data/products';

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// Format currency using Bangladeshi Taka symbol (৳)
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '৳0';
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

// Convert English digits to Bengali numerals (e.g. 1 -> ১, 2 -> ২)
export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] ?? d);
}

/**
 * Normalise a taxonomy value so a name and its slug compare equal.
 *
 * Products store whichever form the admin sent — "Hijabs & Dupattas" from the
 * category dropdown, "hijabs-dupattas" from a category link — so a strict
 * equality check silently hid half the catalog behind the filter pills.
 */
function norm(value: string | undefined | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** True when `value` (or any comma-separated token in `value`) matches `target` as either a display name or a slug. */
export function taxonomyMatches(value: string | undefined | null, target: string): boolean {
  if (!value) return false;
  const targetNorm = norm(target);
  if (!targetNorm) return false;
  return value.split(',').some((token) => norm(token) === targetNorm);
}

export interface ProductFilters {
  category?: string;
  subCategory?: string;
  workType?: string;
  occasion?: string;
  material?: string;
  weather?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'rating' | 'newest';
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  let result = [...products];

  if (filters.category && filters.category !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.category, filters.category!));
  }

  if (filters.subCategory && filters.subCategory !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.subCategory, filters.subCategory!));
  }

  if (filters.workType && filters.workType !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.workType, filters.workType!));
  }

  if (filters.occasion && filters.occasion !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.occasion, filters.occasion!));
  }

  // Was declared in the filter type but never applied, so /shop's material
  // filter silently returned the unfiltered catalog.
  if (filters.material && filters.material !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.material, filters.material!));
  }

  if (filters.weather && filters.weather !== 'All') {
    result = result.filter((p) => taxonomyMatches(p.weather, filters.weather!));
  }

  if (filters.color && filters.color !== 'All') {
    const qColor = filters.color.toLowerCase();
    result = result.filter(
      (p) =>
        p.colors?.some((c) => c.name.toLowerCase().includes(qColor)) ||
        p.variations?.some((v) => !v.isHidden && v.colorName.toLowerCase().includes(qColor))
    );
  }

  if (filters.size && filters.size !== 'All') {
    const qSize = filters.size.toLowerCase();
    result = result.filter(
      (p) =>
        p.sizes?.some((s) => s.toLowerCase() === qSize) ||
        p.variations?.some((v) => !v.isHidden && v.size.toLowerCase() === qSize)
    );
  }

  if (filters.minPrice !== undefined) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.subCategory || '').toLowerCase().includes(q) ||
        (p.workType || '').toLowerCase().includes(q) ||
        (p.material || '').toLowerCase().includes(q) ||
        p.colors?.some((c) => c.name.toLowerCase().includes(q)) ||
        p.variations?.some((v) => !v.isHidden && v.colorName.toLowerCase().includes(q))
    );
  }

  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }
  }

  return result;
}

// Common modest fashion color name to hex mapping fallback
export const COLOR_HEX_MAP: Record<string, string> = {
  'parrot green': '#4CAF50',
  'creamy golden': '#E6C280',
  'burnt terracotta': '#C85A32',
  'burnt orange': '#E65100',
  'white': '#FFFFFF',
  'pistachio': '#93C572',
  'yellow': '#FFEB3B',
  'cosmic orange': '#FF6F00',
  'powder blue': '#B0E0E6',
  'mint': '#98FF98',
  'black': '#1A1A1A',
  'butter scotch': '#E3A857',
  'red': '#E53935',
  'golden': '#FFD700',
  'pink': '#FF80AB',
  'dusty mint': '#80B3A0',
  'ash': '#B0BEC5',
  'dusty pink': '#D8A7B1',
  'denim blue': '#1565C0',
  'baby pink': '#F4C2C2',
  'mauve lavender': '#E1BEE7',
  'vanilla white': '#FDFBF7',
  'soft grey': '#D6D6D6',
  'blush mauve': '#C8A2C8',
  'cinnamon': '#D2691E',
  'skin': '#F5CBA7',
  'nude peach': '#FADBD8',
  'orchid': '#DA70D6',
  'french vanilla': '#F3E5AB',
  'mustard': '#E65100',
  'cool ash': '#90A4AE',
  'pearl white': '#F8F9FA',
  'smokey ash': '#607D8B',
  'off white': '#FAF9F6',
  'blush peach': '#FFDAB9',
  'mayonnaise': '#FEF9E7',
  'blue ash': '#78909C',
  'coral pink': '#FF6F61',
  'nude golden': '#E5C158',
  'candy pink': '#FF69B4',
  'rosy': '#835352',
  'brown gold': '#AD7E60',
  'red merron': '#640A23',
  'yellow gold': '#AD8335',
  'mejenda': '#931C42',
  'magenta': '#D81B60',
  'metallic silver': '#928E8F',
  'copper gold': '#755228',
  'silver': '#8D8787',
  'hot pink': '#FF1493',
  'dusty rose': '#DCAE96',
  'violet purple': '#8A2BE2',
  'purple': '#800080',
  'olive': '#808000',
  'maroon': '#800000',
  'navy': '#000080',
  'teal': '#008080',
  'burgundy': '#800020',
  'peach': '#FFE5B4',
  'lavender': '#E6E6FA',
};

/**
 * Resolves the appropriate hex color for a given product and selected color name.
 */
export function getProductVariationColorHex(
  product: Product | any | undefined | null,
  colorName?: string
): string | null {
  if (!colorName) return null;
  const cleanColor = colorName.toLowerCase().trim();

  // 1. Check variations matrix first
  if (product?.variations && Array.isArray(product.variations)) {
    const matchedVar = product.variations.find(
      (v: any) =>
        v.colorName &&
        v.colorName.toLowerCase().trim() === cleanColor &&
        v.colorHex &&
        v.colorHex !== '#000000' &&
        v.colorHex !== '#000'
    );
    if (matchedVar?.colorHex) return matchedVar.colorHex;

    const looseVar = product.variations.find(
      (v: any) =>
        v.colorName &&
        (v.colorName.toLowerCase().trim().includes(cleanColor) ||
          cleanColor.includes(v.colorName.toLowerCase().trim())) &&
        v.colorHex &&
        v.colorHex !== '#000000' &&
        v.colorHex !== '#000'
    );
    if (looseVar?.colorHex) return looseVar.colorHex;
  }

  // 2. Check colors array
  if (product?.colors && Array.isArray(product.colors)) {
    const matchedCol = product.colors.find(
      (c: any) =>
        c.name &&
        c.name.toLowerCase().trim() === cleanColor &&
        c.hex &&
        c.hex !== '#000000' &&
        c.hex !== '#000'
    );
    if (matchedCol?.hex) return matchedCol.hex;

    const looseCol = product.colors.find(
      (c: any) =>
        c.name &&
        (c.name.toLowerCase().trim().includes(cleanColor) ||
          cleanColor.includes(c.name.toLowerCase().trim())) &&
        c.hex &&
        c.hex !== '#000000' &&
        c.hex !== '#000'
    );
    if (looseCol?.hex) return looseCol.hex;
  }

  // 3. Fallback to COLOR_HEX_MAP
  if (COLOR_HEX_MAP[cleanColor]) {
    return COLOR_HEX_MAP[cleanColor];
  }
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (cleanColor.includes(key) || key.includes(cleanColor)) {
      return hex;
    }
  }

  return null;
}

/**
 * Resolves the appropriate image URL for a given product and selected color variation.
 */
export function getProductVariationImage(
  product: Product | any | undefined | null,
  colorName?: string
): string {
  const fallback =
    product?.images?.[0] ||
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80';
  if (!product || !colorName) return fallback;

  const cleanColor = colorName.toLowerCase().trim();

  // 1. Check variations matrix first for an explicit imageUrl
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    const matchedVar = product.variations.find(
      (v: any) => v.colorName && v.colorName.toLowerCase().trim() === cleanColor && v.imageUrl
    );
    if (matchedVar?.imageUrl) return matchedVar.imageUrl;

    const looseVar = product.variations.find(
      (v: any) =>
        v.colorName &&
        (v.colorName.toLowerCase().trim().includes(cleanColor) ||
          cleanColor.includes(v.colorName.toLowerCase().trim())) &&
        v.imageUrl
    );
    if (looseVar?.imageUrl) return looseVar.imageUrl;
  }

  // 2. Check colors array for imageIndex or images array
  if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
    const colorObj = product.colors.find(
      (c: any) => c.name && c.name.toLowerCase().trim() === cleanColor
    );
    if (colorObj) {
      if (typeof colorObj.imageIndex === 'number' && product.images?.[colorObj.imageIndex]) {
        return product.images[colorObj.imageIndex];
      }
      const colImgs = (colorObj as { images?: string[] }).images;
      if (Array.isArray(colImgs) && colImgs.length > 0 && colImgs[0]) {
        return colImgs[0];
      }
    }

    const looseColorObj = product.colors.find(
      (c: any) =>
        c.name &&
        (c.name.toLowerCase().trim().includes(cleanColor) ||
          cleanColor.includes(c.name.toLowerCase().trim()))
    );
    if (looseColorObj) {
      if (typeof looseColorObj.imageIndex === 'number' && product.images?.[looseColorObj.imageIndex]) {
        return product.images[looseColorObj.imageIndex];
      }
      const colImgs = (looseColorObj as { images?: string[] }).images;
      if (Array.isArray(colImgs) && colImgs.length > 0 && colImgs[0]) {
        return colImgs[0];
      }
    }

    // 3. Fallback: match by index in colors array vs images array
    const colorIdx = product.colors.findIndex(
      (c: any) => c.name && c.name.toLowerCase().trim() === cleanColor
    );
    if (colorIdx !== -1 && product.images?.[colorIdx]) {
      return product.images[colorIdx];
    }
  }

  return fallback;
}

/**
 * Resolves the unit price for a given product and selected color/size variation.
 */
export function getProductVariationPrice(
  product: Product | undefined | null,
  colorName?: string,
  sizeName?: string
): number {
  if (!product) return 0;
  const basePrice = product.price || 0;
  if (!colorName && !sizeName) return basePrice;

  const cleanColor = (colorName || '').toLowerCase().trim();
  const cleanSize = (sizeName || '').toLowerCase().trim();

  if (product.variations && product.variations.length > 0) {
    const matchedVar = product.variations.find(
      (v) =>
        (!cleanColor || (v.colorName && v.colorName.toLowerCase().trim() === cleanColor)) &&
        (!cleanSize || (v.size && v.size.toLowerCase().trim() === cleanSize))
    );
    if (matchedVar) {
      if (typeof matchedVar.price === 'number' && matchedVar.price > 0) {
        return matchedVar.price;
      }
      if (typeof matchedVar.priceOverride === 'number' && matchedVar.priceOverride > 0) {
        return matchedVar.priceOverride;
      }
    }
  }

  return basePrice;
}
