'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Grid2X2,
  Palette,
  Shirt,
  Tag,
  Sun,
  Search,
  Ruler,
  Layers,
  Wallet,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Product } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import { INITIAL_CATEGORIES } from '@/data/categories';
import { useCategories } from '@/lib/useCategories';
import { filterProducts } from '@/lib/utils';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useCart } from '@/context/CartContext';

/** One selectable filter value, with how many products actually carry it. */
interface Facet {
  value: string;
  count: number;
  hex?: string;
}

/** A price band derived from the catalog's real min/max. */
interface PriceBand {
  /** URL value, e.g. "1000-2500" — `""` means "any". */
  value: string;
  label: string;
  count: number;
}

/** Matches `norm()` in lib/utils so counts and filtering never disagree. */
function norm(value: string | undefined | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', 'FREE SIZE', 'ONE SIZE'];

/** Products rendered per page — caps DOM size / image count on large catalogs. */
const SHOP_PAGE_SIZE = 12;

function sizeRank(size: string): number {
  const idx = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  return idx === -1 ? SIZE_ORDER.length : idx;
}

/**
 * Count distinct products per value of a single scalar field.
 * Values are grouped by their normalised form but displayed using the first
 * spelling seen, so "Party wear" and "party-wear" collapse into one facet.
 */
function scalarFacets(products: Product[], key: 'workType' | 'occasion' | 'material' | 'weather'): Facet[] {
  const map = new Map<string, Facet>();

  products.forEach((p) => {
    const raw = (p[key] || '').trim();
    if (!raw) return;
    const items = Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)));
    items.forEach((item) => {
      const id = norm(item);
      if (!id) return;
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else map.set(id, { value: item, count: 1 });
    });
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Colours from both `colors[]` and the variation matrix, counted once per product. */
function colorFacets(products: Product[]): Facet[] {
  const map = new Map<string, Facet>();

  products.forEach((p) => {
    const seen = new Set<string>();
    const add = (name: string, hex: string) => {
      const id = norm(name);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else {
        let finalHex = hex;
        if ((!finalHex || finalHex === '#000000' || finalHex === '#000') && p.colors) {
          const match = p.colors.find((c) => norm(c.name) === id);
          if (match?.hex) finalHex = match.hex;
        }
        map.set(id, { value: name.trim(), hex: finalHex || '#000000', count: 1 });
      }
    };

    p.colors?.forEach((c) => add(c.name, c.hex));
    p.variations?.forEach((v) => {
      if (!v.isHidden && v.colorName) {
        add(v.colorName, v.colorHex || '');
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Sizes from both `sizes[]` and the variation matrix, in garment order. */
function sizeFacets(products: Product[]): Facet[] {
  const map = new Map<string, Facet>();

  products.forEach((p) => {
    const seen = new Set<string>();
    const add = (size: string) => {
      const id = norm(size);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const existing = map.get(id);
      if (existing) existing.count += 1;
      else map.set(id, { value: size.trim(), count: 1 });
    };

    p.sizes?.forEach(add);
    p.variations?.forEach((v) => {
      if (!v.isHidden && v.size) {
        add(v.size);
      }
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => sizeRank(a.value) - sizeRank(b.value) || a.value.localeCompare(b.value)
  );
}

/**
 * Four bands spanning the catalog's actual price range, so the brackets stay
 * meaningful whether the store sells ৳500 scarves or ৳50,000 couture.
 */
function priceBands(products: Product[]): PriceBand[] {
  const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length < 2) return [];

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max <= min) return [];

  // Round the cut points to something a shopper would recognise.
  const step = (max - min) / 4;
  const round = (n: number) => Math.max(1, Math.round(n / 100) * 100);
  const cuts = [round(min + step), round(min + step * 2), round(min + step * 3)];
  const edges = [0, ...cuts, Number.MAX_SAFE_INTEGER];

  const bands: PriceBand[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lo = edges[i];
    const hi = edges[i + 1];
    const count = prices.filter((n) => n >= lo && (hi === Number.MAX_SAFE_INTEGER ? true : n < hi)).length;
    if (count === 0) continue;

    bands.push({
      value: `${lo}-${hi === Number.MAX_SAFE_INTEGER ? '' : hi}`,
      label:
        hi === Number.MAX_SAFE_INTEGER
          ? `৳${lo.toLocaleString('en-IN')}+`
          : `৳${lo.toLocaleString('en-IN')} – ৳${hi.toLocaleString('en-IN')}`,
      count
    });
  }

  // A single band filters nothing.
  return bands.length > 1 ? bands : [];
}

// ─── Reusable facet list ─────────────────────────────────────────────────────

function FacetList({
  title,
  icon,
  allLabel,
  options,
  activeValue,
  onSelect,
  searchable = false
}: {
  title: string;
  icon: React.ReactNode;
  allLabel: string;
  options: Facet[];
  activeValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState('');

  // Nothing in the catalog carries this attribute — showing an empty filter
  // card just invites clicks that cannot change the results.
  if (options.length === 0) return null;

  const visible = query.trim()
    ? options.filter((o) => o.value.toLowerCase().includes(query.toLowerCase().trim()))
    : options;

  const isActive = (value: string) => norm(activeValue) === norm(value);

  return (
    <div className="p-4 bg-white rounded-2xl border border-[#F8D2D5] shadow-xs space-y-3">
      <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">{icon} {title}</span>
        <span className="text-[10px] text-[#A80C14] font-normal shrink-0">{options.length} available</span>
      </h4>

      {searchable && options.length > 5 && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-[#F8D2D5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#A80C14]"
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-stone-400" />
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-1 text-xs pr-1">
        <button
          onClick={() => onSelect('All')}
          className={`w-full text-left px-3 py-1.5 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
            activeValue === 'All' ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
          }`}
        >
          <span>{allLabel}</span>
        </button>

        {visible.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(isActive(opt.value) ? 'All' : opt.value)}
            className={`w-full text-left px-3 py-1.5 rounded-xl transition-all flex items-center justify-between gap-2 font-bold cursor-pointer ${
              isActive(opt.value) ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              {opt.hex && (
                <span
                  className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-inner shrink-0"
                  style={{ backgroundColor: opt.hex }}
                />
              )}
              <span className="truncate">{opt.value}</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                isActive(opt.value) ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {opt.count}
            </span>
          </button>
        ))}

        {visible.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-stone-400 italic">No match for &quot;{query}&quot;</p>
        )}
      </div>
    </div>
  );
}

// ─── Filter panel (shared by the desktop sidebar and the mobile drawer) ──────

interface Facets {
  colors: Facet[];
  workTypes: Facet[];
  occasions: Facet[];
  materials: Facet[];
  weathers: Facet[];
  sizes: Facet[];
  prices: PriceBand[];
}

/** Structural subset of `Category` — all this panel needs from the taxonomy. */
interface ManagedCategory {
  id: string;
  name: string;
  slug: string;
  type?: string;
  subCategories?: { id: string; name: string; slug: string }[];
}

function FilterPanel({
  facets,
  catalog,
  managedCategories,
  params,
  setParam,
  setParams
}: {
  facets: Facets;
  catalog: Product[];
  managedCategories: ManagedCategory[];
  params: Record<string, string>;
  setParam: (key: string, value: string) => void;
  setParams: (patch: Record<string, string>) => void;
}) {
  // Selecting a filter deliberately does NOT close the mobile drawer — the
  // result count on the "Show N Results" button updates live, so shoppers can
  // stack filters without reopening the panel each time.
  const pick = (key: string) => (value: string) => setParam(key, value);

  const mainManagedCategories = React.useMemo(() => {
    return managedCategories.filter((c) => !c.type || c.type === 'category');
  }, [managedCategories]);

  // Categories the catalog actually uses but the Categories tab does not manage
  const unmanagedCategories = React.useMemo(() => {
    const managed = new Set(mainManagedCategories.flatMap((c) => [norm(c.name), norm(c.slug)]));
    const extras = new Map<string, Facet>();

    catalog.forEach((p) => {
      const raw = (p.category || '').trim();
      if (!raw || managed.has(norm(raw))) return;
      const existing = extras.get(norm(raw));
      if (existing) existing.count += 1;
      else extras.set(norm(raw), { value: raw, count: 1 });
    });

    return Array.from(extras.values()).sort((a, b) => b.count - a.count);
  }, [mainManagedCategories, catalog]);

  const countForCategory = (cat: ManagedCategory) =>
    catalog.filter((p) => norm(p.category) === norm(cat.name) || norm(p.category) === norm(cat.slug)).length;

  const catActive = (cat: ManagedCategory) =>
    norm(params.category) === norm(cat.name) || norm(params.category) === norm(cat.slug);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="p-4 bg-white rounded-2xl border border-[#F8D2D5] shadow-xs space-y-3 font-sans">
        <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Grid2X2 className="w-3.5 h-3.5 text-[#A80C14]" /> Category
          </span>
        </h4>

        <div className="space-y-1.5 text-xs">
          <button
            onClick={() => setParam('category', 'All')}
            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
              params.category === 'All' ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
            }`}
          >
            <span>All Products</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                params.category === 'All' ? 'bg-white/20 text-white' : 'bg-[#FDF2F3] text-[#A80C14]'
              }`}
            >
              {catalog.length}
            </span>
          </button>

          {mainManagedCategories.map((cat) => {
            const selected = catActive(cat);

            return (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => setParam('category', selected ? 'All' : cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
                    selected ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      selected ? 'bg-white/20 text-white' : 'bg-[#FDF2F3] text-[#A80C14]'
                    }`}
                  >
                    {countForCategory(cat)}
                  </span>
                </button>
              </div>
            );
          })}

          {unmanagedCategories.length > 0 && (
            <div className="pt-2 mt-1 border-t border-dashed border-stone-200 space-y-1">
              <p className="px-1 text-[10px] uppercase tracking-wider text-stone-400 font-bold">Other in catalog</p>
              {unmanagedCategories.map((extra) => {
                const selected = norm(params.category) === norm(extra.value);
                return (
                  <button
                    key={extra.value}
                    onClick={() => setParam('category', selected ? 'All' : extra.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
                      selected ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-600 hover:bg-[#FDF2F3]'
                    }`}
                  >
                    <span className="truncate">{extra.value}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        selected ? 'bg-white/20 text-white' : 'bg-[#FDF2F3] text-[#A80C14]'
                      }`}
                    >
                      {extra.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Price bands */}
      {facets.prices.length > 0 && (
        <div className="p-4 bg-white rounded-2xl border border-[#F8D2D5] shadow-xs space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#A80C14]" /> Price Range
          </h4>
          <div className="space-y-1 text-xs">
            <button
              onClick={() => setParam('price', 'All')}
              className={`w-full text-left px-3 py-1.5 rounded-xl transition-all font-bold cursor-pointer ${
                params.price === 'All' ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
              }`}
            >
              Any Price
            </button>
            {facets.prices.map((band) => {
              const selected = params.price === band.value;
              return (
                <button
                  key={band.value}
                  onClick={() => setParam('price', selected ? 'All' : band.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
                    selected ? 'bg-[#A80C14] text-white shadow-xs' : 'text-stone-700 hover:bg-[#FDF2F3]'
                  }`}
                >
                  <span>{band.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      selected ? 'bg-white/20 text-white' : 'bg-[#FDF2F3] text-[#A80C14]'
                    }`}
                  >
                    {band.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <FacetList
        title="Color Family"
        icon={<Palette className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Colors"
        options={facets.colors}
        activeValue={params.color}
        onSelect={pick('color')}
        searchable
      />

      <FacetList
        title="Work Type"
        icon={<Shirt className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Work Types"
        options={facets.workTypes}
        activeValue={params.work}
        onSelect={pick('work')}
        searchable
      />

      <FacetList
        title="Occasion"
        icon={<Tag className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Occasions"
        options={facets.occasions}
        activeValue={params.occasion}
        onSelect={pick('occasion')}
        searchable
      />

      <FacetList
        title="Material"
        icon={<Layers className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Materials"
        options={facets.materials}
        activeValue={params.material}
        onSelect={pick('material')}
        searchable
      />

      <FacetList
        title="Season"
        icon={<Sun className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Seasons"
        options={facets.weathers}
        activeValue={params.weather}
        onSelect={pick('weather')}
      />

      <FacetList
        title="Size"
        icon={<Ruler className="w-3.5 h-3.5 text-[#A80C14]" />}
        allLabel="All Sizes"
        options={facets.sizes}
        activeValue={params.size}
        onSelect={pick('size')}
      />
    </div>
  );
}

// ─── Storefront pagination footer ────────────────────────────────────────────

function ShopLoadMore({
  showing,
  total,
  hasMore,
  onLoadMore,
}: {
  showing: number;
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 pt-4" aria-label="Catalog pagination">
      <span className="text-[11px] font-mono text-stone-500">
        Showing 1–{showing} of {total} {total === 1 ? 'design' : 'designs'}
      </span>

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="px-8 py-3 bg-[#A80C14] hover:bg-[#8C0A10] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <span className="hidden sm:inline">Load More Designs</span>
          <span className="sm:hidden">Load More</span>
          <span className="px-2 py-0.5 bg-white/20 rounded-full font-mono text-[10px] normal-case tracking-normal">
            {total - showing} left
          </span>
        </button>
      ) : (
        total > SHOP_PAGE_SIZE && (
          <span className="text-[11px] text-stone-400 italic">
            ✦ You&apos;ve reached the end of this collection
          </span>
        )
      )}

      {/* Thin progress bar — how much of the filtered set is on screen */}
      <div className="w-40 h-1 bg-stone-200 rounded-full overflow-hidden" aria-hidden>
        <div
          className="h-full bg-[#A80C14] rounded-full transition-all duration-300"
          style={{ width: `${total === 0 ? 0 : Math.min(100, (showing / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

/** URL param → human label, for the active-filter chips. */
const FILTER_LABELS: Record<string, string> = {
  q: 'Search',
  category: 'Category',
  subCategory: 'Subcategory',
  work: 'Work',
  occasion: 'Occasion',
  material: 'Material',
  weather: 'Season',
  color: 'Color',
  size: 'Size',
  price: 'Price',
  wishlist: 'Wishlist'
};

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const { wishlist, products, isLoadingProducts, productsError, refreshProductsFromApi } = useCart();

  // Read URL query params
  const qParam = searchParams.get('q') || '';
  const catParam = searchParams.get('category') || 'All';
  const subCategoryParam = searchParams.get('subCategory') || 'All';
  const workParam = searchParams.get('work') || 'All';
  const occasionParam = searchParams.get('occasion') || 'All';
  const matParam = searchParams.get('material') || 'All';
  const colorParam = searchParams.get('color') || 'All';
  const weatherParam = searchParams.get('weather') || 'All';
  const sizeParam = searchParams.get('size') || 'All';
  const priceParam = searchParams.get('price') || 'All';
  const sortParam = searchParams.get('sort') || 'recommended';
  const wishlistParam = searchParams.get('wishlist') === 'true';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // The catalog. Seeded server-side by the root layout, so it is already
  // populated on first paint — no seed-array fallback anywhere.
  const catalog = products;

  // Managed Categories — live from /api/categories, seed data as offline fallback
  const { categories: managedCategories } = useCategories({ fallback: INITIAL_CATEGORIES });

  // Every filter option, derived from the products actually in the store, with
  // real counts. One pass, recomputed only when the catalog changes.
  const facets: Facets = React.useMemo(
    () => ({
      colors: colorFacets(catalog),
      workTypes: scalarFacets(catalog, 'workType'),
      occasions: scalarFacets(catalog, 'occasion'),
      materials: scalarFacets(catalog, 'material'),
      weathers: scalarFacets(catalog, 'weather'),
      sizes: sizeFacets(catalog),
      prices: priceBands(catalog)
    }),
    [catalog]
  );

  // Update one or many params in a single navigation. Any filter/sort change
  // implicitly resets paging — the URL never keeps a stale page alongside a
  // new result set.
  const setParams = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === 'All' || value === '' || value === 'recommended' || value === 'false') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (!('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `/shop?${qs}` : '/shop', { scroll: false });
    },
    [router, searchParams]
  );

  const setParam = React.useCallback(
    (key: string, value: string) => setParams({ [key]: value }),
    [setParams]
  );

  const handleResetFilters = () => router.push('/shop', { scroll: false });

  // Filtered dataset
  const filteredProducts = React.useMemo(() => {
    const [rawMin, rawMax] = priceParam === 'All' ? [] : priceParam.split('-');
    const minPrice = rawMin ? Number(rawMin) : undefined;
    const maxPrice = rawMax ? Number(rawMax) : undefined;

    let list = filterProducts(catalog, {
      category: catParam,
      subCategory: subCategoryParam,
      workType: workParam,
      occasion: occasionParam,
      material: matParam,
      weather: weatherParam,
      color: colorParam,
      size: sizeParam,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      searchQuery: qParam
    });

    if (wishlistParam) {
      const wishlistIds = new Set(wishlist.map((w) => w.id));
      list = list.filter((p) => wishlistIds.has(p.id));
    }

    // Sort logic
    if (sortParam === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortParam === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortParam === 'rating') {
      list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
    } else if (sortParam === 'newest') {
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    } else if (sortParam === 'discount') {
      list.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
    }

    return list;
  }, [
    catalog,
    catParam,
    subCategoryParam,
    workParam,
    occasionParam,
    matParam,
    weatherParam,
    colorParam,
    sizeParam,
    priceParam,
    qParam,
    wishlistParam,
    sortParam,
    wishlist
  ]);

  React.useEffect(() => {
    trackEvent('search_query', {
      search_term: qParam || 'catalog_browse',
      category: catParam,
      color: colorParam,
      results_count: filteredProducts.length
    });
  }, [qParam, catParam, colorParam, filteredProducts.length, trackEvent]);

  // Active filters, as removable chips
  const activeChips = React.useMemo(() => {
    const entries: { key: string; label: string; value: string }[] = [];
    const push = (key: string, value: string) => {
      if (value && value !== 'All') entries.push({ key, label: FILTER_LABELS[key] || key, value });
    };

    push('q', qParam);
    push('category', catParam);
    push('subCategory', subCategoryParam);
    push('work', workParam);
    push('occasion', occasionParam);
    push('material', matParam);
    push('weather', weatherParam);
    push('color', colorParam);
    push('size', sizeParam);
    if (priceParam !== 'All') {
      const band = facets.prices.find((b) => b.value === priceParam);
      entries.push({ key: 'price', label: 'Price', value: band?.label || priceParam });
    }
    if (wishlistParam) entries.push({ key: 'wishlist', label: 'Wishlist', value: 'Saved items' });

    return entries;
  }, [
    qParam,
    catParam,
    subCategoryParam,
    workParam,
    occasionParam,
    matParam,
    weatherParam,
    colorParam,
    sizeParam,
    priceParam,
    wishlistParam,
    facets.prices
  ]);

  const hasActiveFilters = activeChips.length > 0;

  // ── Load-more paging ──────────────────────────────────────────────────
  // The catalog itself stays client-side (facets need it), but only the first
  // 12 ProductCards mount initially — "Load More" appends the next batch so
  // the DOM grows only as the shopper asks. The URL `page` param is the loaded
  // depth (page=2 ⇒ 24 visible), so links stay shareable and back/forward
  // still work; any filter change resets to one page.
  const totalFiltered = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / SHOP_PAGE_SIZE));
  const loadedPages = Math.min(pageParam, totalPages);
  const visibleCount = Math.min(loadedPages * SHOP_PAGE_SIZE, totalFiltered);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < totalFiltered;

  const handleLoadMore = () => {
    // No scroll: the viewport stays put and the new batch appears right where
    // the button was (which moves down with the appended cards).
    setParam('page', String(loadedPages + 1));
  };

  const panelParams = {
    category: catParam,
    subCategory: subCategoryParam,
    work: workParam,
    occasion: occasionParam,
    material: matParam,
    weather: weatherParam,
    color: colorParam,
    size: sizeParam,
    price: priceParam
  };

  const isEmptyCatalog = catalog.length === 0;
  const isBusy = isLoadingProducts && isEmptyCatalog;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-32 lg:pb-12 text-stone-900">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#F8D2D5] pb-6 gap-4">
        <div>
          <span className="px-3.5 py-1 bg-[#FDF2F3] text-[#A80C14] text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Haute Couture Catalog
          </span>
          <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2">
            {catParam === 'All' ? 'Complete Collection' : `${catParam} Collection`}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {isBusy ? (
              <span>Loading the catalog…</span>
            ) : (
              <>
                Showing <strong className="text-stone-900 font-bold">1–{visibleCount}</strong> of{' '}
                {totalFiltered} luxurious modest designs
                {qParam && (
                  <span>
                    {' '}matching &quot;<strong className="text-[#A80C14]">{qParam}</strong>&quot;
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Top Controls: Mobile Filter Drawer Button & Desktop Sorting */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden px-4 py-2.5 bg-white border border-[#F8D2D5] text-[#A80C14] text-xs font-bold rounded-full hover:bg-[#FDF2F3] transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters{hasActiveFilters ? ` (${activeChips.length})` : ''}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider hidden sm:inline">Sort By:</span>
            <select
              value={sortParam}
              onChange={(e) => setParam('sort', e.target.value)}
              className="px-4 py-2 bg-white border border-[#F8D2D5] rounded-full text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#A80C14] shadow-xs cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">New Arrivals</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog read failed — say so instead of showing an empty grid. */}
      {productsError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800">
          <p className="text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            The catalog could not be loaded{isEmptyCatalog ? '' : ' — showing the last known products'}. {productsError}
          </p>
          <button
            onClick={() => refreshProductsFromApi()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              onClick={() => setParam(chip.key, chip.key === 'wishlist' ? 'false' : 'All')}
              className="pl-3 pr-2 py-1.5 bg-white border border-[#F8D2D5] rounded-full text-[11px] font-bold text-stone-700 hover:border-[#A80C14] hover:text-[#A80C14] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="text-stone-400 uppercase tracking-wider">{chip.label}:</span>
              <span className="truncate max-w-[10rem]">{chip.value}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-[11px] font-bold text-[#A80C14] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      {/* Main Grid: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F8D2D5]">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#A80C14]" /> Filter Catalog
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#A80C14] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset All
              </button>
            )}
          </div>

          {isEmptyCatalog ? (
            <p className="text-xs text-stone-400 italic px-1">
              Filters appear once the catalog has products.
            </p>
          ) : (
            <FilterPanel
              facets={facets}
              catalog={catalog}
              managedCategories={managedCategories}
              params={panelParams}
              setParam={setParam}
              setParams={setParams}
            />
          )}
        </aside>

        {/* Products Grid Section */}
        <main className="lg:col-span-9 space-y-6">
          {isBusy ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-stone-200 rounded-2xl" />
                  <div className="h-3 bg-stone-200 rounded-full w-3/4" />
                  <div className="h-3 bg-stone-200 rounded-full w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {visibleProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              <ShopLoadMore
                showing={visibleCount}
                total={totalFiltered}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            </>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#F8D2D5] p-8 space-y-4 shadow-xs">
              <div className="w-16 h-16 bg-[#FDF2F3] rounded-full flex items-center justify-center mx-auto text-[#A80C14]">
                <Sparkles className="w-8 h-8" />
              </div>
              {isEmptyCatalog ? (
                <>
                  <h3 className="text-lg font-bold text-stone-900">The collection is being prepared</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    No designs have been published yet. Please check back shortly.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-stone-900">No designs match your active filters</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Try removing a filter above or resetting your search to discover more items.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-6 py-2.5 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors shadow-sm cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Drawer Modal — same panel as desktop, so the two can
          never drift apart the way the old hardcoded category list did. */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex justify-end">
          <div className="w-full max-w-xs bg-white h-full overflow-y-auto p-6 space-y-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#F8D2D5] shrink-0">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#A80C14]" /> Catalog Filters
              </h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              {isEmptyCatalog ? (
                <p className="text-xs text-stone-400 italic">Filters appear once the catalog has products.</p>
              ) : (
                <FilterPanel
                  facets={facets}
                  catalog={catalog}
                  managedCategories={managedCategories}
                  params={panelParams}
                  setParam={setParam}
                  setParams={setParams}
                />
              )}
            </div>

            <div className="pt-4 border-t border-[#F8D2D5] flex gap-2 shrink-0">
              <button
                onClick={() => {
                  handleResetFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-3 bg-stone-100 text-stone-800 font-bold text-xs rounded-full cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-[#A80C14] text-white font-bold text-xs rounded-full shadow-md cursor-pointer"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">Loading catalog...</div>}>
      <ShopContent />
    </Suspense>
  );
}
