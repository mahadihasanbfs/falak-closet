export interface ProductColor {
  name: string;
  hex: string;
  imageIndex?: number;
  /** Per-colour gallery built by the admin form; `images` on the product is the flattened union. */
  images?: string[];
}

export interface ProductVariation {
  id: string;
  colorName: string;
  colorHex: string;
  size: string;
  stock: number;
  price?: number;
  buyingPrice?: number;
  priceOverride?: number;
  originalPrice?: number;
  imageUrl?: string;
  shortDetails?: string;
  isHidden?: boolean;
}

export interface ProductTierDiscount {
  minQuantity: number;
  discountAmount: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  /** Moderation state — absent (legacy/seed data) counts as approved. */
  status?: 'pending' | 'approved';
}

export type CategoryType = typeof CATEGORIES[number] | 'Abayas' | 'Hijabs & Dupattas' | 'Modest Dresses' | 'Co-ord Sets' | 'Luxury Tunics' | 'Accessories' | 'Dress' | 'HIJAB';
export type WorkType = typeof WORK_TYPES[number] | 'Embroidery' | 'Zari & Dori' | 'Sequins' | 'Cutwork' | 'Hand-beaded' | 'Printed & Plain';
export type OccasionType = typeof OCCASIONS[number] | 'Bridal & Wedding' | 'Party & Evening' | 'Formal & Work' | 'Daily & Casual' | 'Festive & Eid' | 'Party Wear' | 'Casual Wear' | 'Everyday Wear' | 'Regular Wear';
export type MaterialType = typeof MATERIALS[number] | 'Nida Silk' | 'Georgette' | 'Velvet' | 'Linen' | 'Chiffon' | 'Organza' | 'Raw Silk' | 'CEY' | 'Ac Cotton' | 'Airy Cotton' | 'Crinkle';

export interface Product {
  id: string;
  slug: string;
  name: string;
  code: string;
  category: CategoryType | string;
  subCategory?: string;
  price: number;
  buyingPrice?: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFlashSale?: boolean;
  discountPercentage: number;
  workType: WorkType | string;
  occasion: OccasionType | string;
  material: MaterialType | string;
  weather?: 'Summer' | 'Winter' | 'Festive' | 'Wedding' | string;
  weight?: number;
  colors: ProductColor[];
  sizes: ('S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free Size' | string)[];
  stock: number;
  images: string[];
  variations?: ProductVariation[];
  /** Optional because list payloads (serializeProductCard) omit the prose —
   *  only the full single-doc read (getProductBySlugOrId) guarantees them. */
  description?: string;
  features?: string[];
  careInstructions?: string[];
  reviewsList?: Review[];
  freeDeliveryQuantity?: number;
  tierDiscounts?: ProductTierDiscount[];
  videoUrl?: string;
  landingDiscountPercentage?: number;
  /** ISO strings — Prisma `Date`s are serialized in `src/lib/products.ts` so they can cross to the client. */
  createdAt?: string;
  updatedAt?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'flk-001',
    slug: 'crinkle-hijab',
    name: 'Crinkle Hijab',
    code: 'EZ-L6',
    category: 'Hijabs & Dupattas',
    price: 250,
    originalPrice: 350,
    rating: 4.9,
    reviewCount: 48,
    isNewArrival: true,
    isBestSeller: true,
    isFlashSale: true,
    discountPercentage: 28,
    workType: 'Printed & Plain',
    occasion: 'Casual Wear',
    material: 'Crinkle',
    weather: 'Summer',
    colors: [
      { name: 'Multi Colors Stack', hex: '#EC4899' },
      { name: 'Dusty Rose', hex: '#DCAE96' },
      { name: 'Sage', hex: '#9DC183' }
    ],
    sizes: ['Free Size'],
    stock: 50,
    images: [
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Ultra-lightweight premium crinkle hijab featuring soft texture, breathable fabric, and full non-slip coverage.',
    features: [
      'Soft crinkle textured finish',
      'Breathable all-day wear',
      'Generous 180cm x 75cm size',
      'No iron required'
    ],
    careInstructions: ['Hand wash in cold water', 'Line dry in shade'],
    reviewsList: [
      {
        id: 'r1',
        author: 'Nusrat Jahan (Dhaka)',
        rating: 5,
        date: '2026-07-04',
        comment: 'So soft and comfortable! Love the crinkle fabric.',
        verifiedPurchase: true
      }
    ]
  },
  {
    id: 'flk-002',
    slug: 'kaftan-set',
    name: 'Kaftan Set',
    code: 'EM-E16',
    category: 'Modest Dresses',
    price: 1950,
    originalPrice: 2500,
    rating: 4.8,
    reviewCount: 32,
    isNewArrival: true,
    isFlashSale: true,
    discountPercentage: 22,
    workType: 'Embroidery',
    occasion: 'Party Wear',
    material: 'CEY',
    weather: 'Festive',
    colors: [
      { name: 'Peach Mosaic Print', hex: '#E07A5F' },
      { name: 'Emerald', hex: '#0B6623' }
    ],
    sizes: ['M', 'L', 'XL', 'Free Size'],
    stock: 18,
    images: [
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Elegant printed kaftan set crafted from premium breathable CEY fabric with inner tie belt.',
    features: [
      'Fluid butterfly silhouette',
      'Soft non-transparent CEY fabric',
      'Includes inner tie belt for adjustable waist'
    ],
    careInstructions: ['Hand wash or delicate machine cycle'],
    reviewsList: []
  },
  {
    id: 'flk-003',
    slug: 'golden-shimmer-hijab',
    name: 'Golden Shimmer Hijab',
    code: 'EZ-M12',
    category: 'Hijabs & Dupattas',
    price: 350,
    originalPrice: 480,
    rating: 5.0,
    reviewCount: 41,
    isNewArrival: true,
    discountPercentage: 27,
    workType: 'Printed & Plain',
    occasion: 'Party Wear',
    material: 'Airy Cotton',
    weather: 'Summer',
    colors: [
      { name: 'Liquid Gold', hex: '#F7E7CE' },
      { name: 'Champagne Pink', hex: '#F3C5C5' }
    ],
    sizes: ['Free Size'],
    stock: 35,
    images: [
      'https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Soft metallic shimmer hijab offering subtle elegance for evening parties and special events.',
    features: ['High lustre subtle shimmer', 'Non-slip grip finish'],
    careInstructions: ['Hand wash gently in cold water'],
    reviewsList: []
  },
  {
    id: 'flk-004',
    slug: 'sequin-embellished-scarf',
    name: 'Sequin Embellished Scarf',
    code: 'EZ-S8',
    category: 'Hijabs & Dupattas',
    price: 420,
    originalPrice: 600,
    rating: 4.7,
    reviewCount: 29,
    isNewArrival: true,
    discountPercentage: 30,
    workType: 'Sequins',
    occasion: 'Festive & Eid',
    material: 'Ac Cotton',
    weather: 'Wedding',
    colors: [
      { name: 'Gold Sequin', hex: '#D4AF37' },
      { name: 'Rose Gold', hex: '#B76E79' }
    ],
    sizes: ['Free Size'],
    stock: 22,
    images: [
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Crinkle textured scarf embellished with tiny gold sequins along border rows.',
    features: ['Lightweight Ac Cotton fabric', 'Durable gold sequin border decoration'],
    careInstructions: ['Dry clean or delicate hand wash'],
    reviewsList: []
  },
  {
    id: 'flk-005',
    slug: 'rose-dust-pleated-hijab',
    name: 'Rose Dust Pleated Hijab',
    code: 'EZ-P4',
    category: 'Hijabs & Dupattas',
    price: 380,
    originalPrice: 520,
    rating: 4.9,
    reviewCount: 36,
    isNewArrival: true,
    discountPercentage: 26,
    workType: 'Printed & Plain',
    occasion: 'Casual Wear',
    material: 'Airy Cotton',
    weather: 'Winter',
    colors: [
      { name: 'Rose Dust', hex: '#D7A19C' },
      { name: 'Mauve', hex: '#9E7B9B' }
    ],
    sizes: ['Free Size'],
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Micro-pleated soft cotton hijab in subtle rose dust tone.',
    features: ['Permanent micro-pleating', 'Soft breathable cotton blend'],
    careInstructions: ['Hand wash cold'],
    reviewsList: []
  }
];

export const CATEGORIES = [
  'Accessories',
  'Dress',
  'HIJAB',
  'Abayas',
  'Hijabs & Dupattas',
  'Modest Dresses',
  'Co-ord Sets',
  'Luxury Tunics'
] as const;

export const WORK_TYPES = [
  'Beats Work',
  'Border Contrast',
  'Contrast Work',
  'Crepe',
  'Crush',
  'Embroidery',
  'Foil',
  'Glitter',
  'Karchupi work',
  'Laise Work',
  'Layered',
  'Lurex Work',
  'Pearl Work',
  'Plain Work',
  'Polka Dots',
  'Print',
  'Self Work',
  'Sequins Work',
  'Shaded',
  'Shimmer work',
  'Solid Color',
  'Stone Work',
  'Tassel Work',
  'Zari & Dori',
  'Zipper stone'
] as const;

export interface ColorFamily {
  name: string;
  hex: string;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  { name: 'Ash', hex: '#B2BEB5' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Black', hex: '#111111' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Coffee', hex: '#4A2C2A' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Golden', hex: '#D4AF37' },
  { name: 'Green', hex: '#15803D' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Magenta', hex: '#D946EF' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Mauve', hex: '#E0B0FF' },
  { name: 'Multi', hex: '#EC4899' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Onion', hex: '#6B2D5C' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Peach', hex: '#FFDAB9' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Shaded', hex: '#94A3B8' },
  { name: 'Skin', hex: '#E8D3C4' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Turkish Shimmer', hex: '#C5A059' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Yellow', hex: '#EAB308' }
];

export const MATERIALS = [
  'Ac Cotton',
  'Airy Cotton',
  'Also Rayon cotton',
  'Arabian Silk',
  'Armania Silk',
  'Butter cotton',
  'Cashmere Cotton',
  'CEY',
  'Cheese Cotton',
  'Cherry Georgette',
  'Chiffon',
  'Comfy Cotton',
  'Cotton',
  'Cottony silk',
  'Crample',
  'Crinkle',
  'Crinkle Cotton',
  'Crinkle Shimmer',
  'Crystal crush & Cherry',
  'Diamond Georgette',
  'Double Georgette',
  'Dubai Jacquard Silk',
  'Dubai Royal Silk',
  'Dubai Silk',
  'Export Quality Cotton',
  'Feather Lite Chiffon',
  'Genji Cotton',
  'Glossy Cotton',
  'Golden Silk',
  'Gold Silk',
  'Grid Cotton',
  'Imported Georgette',
  'Imported Korean Silk',
  'Irani Shimmer',
  'Jersey Cotton',
  'Kashmiri Kota Cotton',
  'Kota Cotton',
  'Linen',
  'Linen Shimmer',
  'Luxury Crushed Chiffon',
  'Luxury Georgette',
  'Malaysian Bubble Chiffon',
  'Maslin',
  'Maslin Shimmer',
  'Maslin Silk',
  'Nida Silk',
  'Organza Cotton',
  'Organza Silk',
  'Pashmina Cotton',
  'Pashmina Silk',
  'Popcorn',
  'Premium Cotton',
  'Raw Silk',
  'Rayon cotton',
  'Shimmer Cotton',
  'Silk',
  'Silky Cotton',
  'Single Georgette',
  'Soft Cotton',
  'Soft Imported Georgette',
  'Super Cotton',
  'Tissue',
  'Turkish Shimmer',
  'Turkish Silk',
  'Velvet',
  'Zafran'
] as const;

export const OCCASIONS = [
  'Casual Wear',
  'Everyday Wear',
  'Party Wear',
  'Regular Wear',
  'Festive & Eid',
  'Bridal & Wedding',
  'Formal & Work'
] as const;

export const WEATHER_TYPES = [
  'Summer',
  'Winter',
  'Festive',
  'Wedding'
] as const;

