import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SITE_SETTINGS_TAG } from '@/lib/fetcher';
import { broadcastSocketEventServer } from '@/lib/socketServerBroadcast';

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Server error';
}

const DEFAULT_SETTINGS = {
  // Free-delivery amount threshold read by CartContext on the storefront.
  // currencySymbol is stored for records — display formatting is ৳ BDT only.
  store: {
    freeShippingThreshold: 0,
    currencySymbol: '৳ BDT'
  },
  // Contact details + social profiles shown in the footer and fed to the
  // Organization JSON-LD schema. Empty string = feature hidden.
  site: {
    contactPhone: '',
    contactEmail: '',
    address: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    youtube: ''
  },
  // Home "Why Choose Us" cards. `icon` must be one of the whitelist in
  // src/components/home/ValuePropsSection.tsx.
  'value-props': [
    { icon: 'award', title: 'Premium Nida & Silk Fabrics', description: 'Crafted with imported Korean Nida, pure Dubai silk, and breathable airy cotton fabrics.' },
    { icon: 'shield', title: '100% Authentic Modest Cut', description: 'Generous flared silhouettes, full-length hemlines, and modest wrist coverage for effortless modesty.' },
    { icon: 'truck', title: 'Fast Doorstep BD Delivery', description: 'Swift 2-3 day express courier delivery across all 64 districts in Bangladesh.' },
    { icon: 'rotate', title: '30-Day Easy Exchange', description: 'Hassle-free size replacement and item exchange guarantee within 30 days.' }
  ],
  // Slim top-of-page bar. Empty message or isActive:false = hidden.
  announcement: {
    message: '',
    link: '',
    linkLabel: '',
    isActive: false,
    freeDeliveryOffer: false,
    freeDeliveryMinQty: 8,
    freeDeliveryCategory: 'Hijab',
  },
  payment: {
    bkashNumber: '01700000000',
    bkashAccountType: 'Personal',
    instructions: [
      'Open your bKash app and select "Send Money".',
      'Enter the number listed above.',
      'Enter the exact total order amount.',
      'Put your phone number as reference.',
      'Enter your PIN to confirm the payment.',
      'Copy the Transaction ID (TrxID) from the SMS and paste it below.'
    ]
  }
};

// ─── GET /api/settings?key=... ───────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    let setting = await prisma.siteSetting.findUnique({
      where: { key }
    });

    if (!setting) {
      // Return and seed default setting
      const defaultValue = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] || {};
      setting = await prisma.siteSetting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: defaultValue
        }
      });
    }

    return NextResponse.json({ success: true, setting });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// ─── POST /api/settings ───────────────────────────────────────────────────────
// body: { key, value }
function validateSettingValue(key: string, value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'Value must be an object';

  if (key === 'store') {
    const store = value as Record<string, unknown>;
    if (store.freeShippingThreshold !== undefined) {
      const threshold = Number(store.freeShippingThreshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        return 'Free delivery threshold must be a non-negative number';
      }
    }
    if (store.currencySymbol !== undefined && typeof store.currencySymbol !== 'string') {
      return 'Currency symbol must be text';
    }
  }

  if (key === 'site') {
    const site = value as Record<string, unknown>;
    for (const [field, raw] of Object.entries(site)) {
      if (typeof raw !== 'string') return `Site field "${field}" must be text`;
      const v = raw.trim();
      if (['whatsapp', 'instagram', 'facebook', 'youtube'].includes(field)) {
        // Social profiles may be full URLs, @handles, or phone digits — but
        // never javascript: or other schemes.
        if (v && v.includes(':') && !/^https?:\/\//i.test(v)) {
          return `Social link "${field}" must be an https:// URL or plain handle`;
        }
      }
      if (field === 'contactEmail' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return 'Contact email does not look valid';
      }
    }
  }

  if (key === 'value-props') {
    if (!Array.isArray(value)) return 'Value props must be a list';
    if (value.length > 8) return 'Keep the value props list to at most 8 items';
    for (const item of value as unknown[]) {
      if (typeof item !== 'object' || item === null) return 'Each value prop must be an object';
      const p = item as Record<string, unknown>;
      if (typeof p.title !== 'string' || !p.title.trim()) return 'Every value prop needs a title';
      if (typeof p.description !== 'string') return 'Value prop descriptions must be text';
      if (p.icon !== undefined && typeof p.icon !== 'string') return 'Value prop icon must be text';
    }
  }

  if (key === 'announcement') {
    const a = value as Record<string, unknown>;
    if (a.message !== undefined && typeof a.message !== 'string') return 'Announcement message must be text';
    if (a.linkLabel !== undefined && typeof a.linkLabel !== 'string') return 'Announcement link label must be text';
    if (a.isActive !== undefined && typeof a.isActive !== 'boolean') return 'Announcement active flag must be true/false';
    if (a.freeDeliveryOffer !== undefined && typeof a.freeDeliveryOffer !== 'boolean') return 'Announcement free delivery offer flag must be true/false';
    if (a.freeDeliveryMinQty !== undefined && (!Number.isFinite(Number(a.freeDeliveryMinQty)) || Number(a.freeDeliveryMinQty) < 1)) {
      return 'Announcement free delivery minimum quantity must be at least 1';
    }
    if (a.freeDeliveryCategory !== undefined && typeof a.freeDeliveryCategory !== 'string') return 'Announcement free delivery category must be text';
    const link = typeof a.link === 'string' ? a.link.trim() : '';
    if (link && !link.startsWith('/') && !/^https?:\/\//i.test(link)) {
      return 'Announcement link must be an internal path (/...) or an http(s) URL';
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json({ success: false, error: 'Key and value are required' }, { status: 400 });
    }

    const validationError = validateSettingValue(key, value);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const setting = await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    // Cached server reads (shipping page, future SSR consumers) must not
    // serve the previous value, and the shipping page shows the threshold.
    revalidateTag(SITE_SETTINGS_TAG, 'max');
    revalidatePath('/shipping');
    // The root layout renders the footer + Organization JSON-LD from these
    // settings — 'layout' scope refreshes every page that shares it.
    revalidatePath('/', 'layout');
    void broadcastSocketEventServer('settings_sync', { key, setting });

    return NextResponse.json({ success: true, message: 'Settings saved', setting });
  } catch (err) {
    console.error('[POST /api/settings]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
