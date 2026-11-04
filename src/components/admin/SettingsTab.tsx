'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Database, RefreshCw, CheckCircle2, KeyRound, CloudUpload, Phone, Megaphone, ListChecks, Trash2, Plus, Truck, Eye, EyeOff } from 'lucide-react';
import { uploadImages } from '@/lib/cloudinary';
import { toEnglishNumber } from '@/lib/utils';
import type { Product } from '@/data/products';

interface SettingsTabProps {
  dbSource: string;
  onSeedDatabase: () => Promise<void>;
  isSeeding: boolean;
  seedResult: string | null;
}

export function SettingsTab({
  dbSource,
  onSeedDatabase,
  isSeeding,
  seedResult
}: SettingsTabProps) {
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | string>(0);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeSavedSuccess, setStoreSavedSuccess] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  // bKash manual payment settings state
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashAccountType, setBkashAccountType] = useState('Personal');
  const [bkashInstructions, setBkashInstructions] = useState('');
  const [isSavingBkash, setIsSavingBkash] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const fetchBkashSettings = async () => {
    try {
      const res = await fetch('/api/settings?key=payment');
      const data = await res.json();
      if (data.success && data.setting) {
        const val = data.setting.value;
        setBkashNumber(val.bkashNumber || '');
        setBkashAccountType(val.bkashAccountType || 'Personal');
        setBkashInstructions(Array.isArray(val.instructions) ? val.instructions.join('\n') : '');
      }
    } catch (e) {
      console.error('Failed to load bkash settings:', e);
    }
  };

  const handleSaveBkashSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^01\d{9}$/.test(bkashNumber.trim())) {
      setSettingsError('bKash number must be an 11-digit number starting with 01');
      return;
    }

    setIsSavingBkash(true);
    setSettingsError(null);
    setSettingsSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'payment',
          value: {
            bkashNumber: bkashNumber.trim(),
            bkashAccountType,
            instructions: bkashInstructions.split('\n').map(l => l.trim()).filter(Boolean)
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSavedSuccess(true);
        setTimeout(() => setSettingsSavedSuccess(false), 3000);
      } else {
        setSettingsError(data.error || 'Failed to save settings.');
      }
    } catch {
      setSettingsError('Network error — failed to save settings.');
    } finally {
      setIsSavingBkash(false);
    }
  };

  // ── Store configuration (free delivery threshold) — real /api/settings persistence ──
  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('/api/settings?key=store');
      const data = await res.json();
      if (data.success && data.setting) {
        const val = data.setting.value;
        if (typeof val.freeShippingThreshold === 'number' && val.freeShippingThreshold >= 0) {
          setFreeShippingThreshold(val.freeShippingThreshold);
        }
      }
    } catch (e) {
      console.error('Failed to load store settings:', e);
    }
  };

  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [offerSavedSuccess, setOfferSavedSuccess] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = typeof freeShippingThreshold === 'string'
      ? (freeShippingThreshold.trim() === '' ? 0 : parseInt(freeShippingThreshold.trim(), 10))
      : freeShippingThreshold;

    if (!Number.isFinite(parsed) || parsed < 0) {
      setStoreError('Free delivery threshold must be a non-negative number.');
      return;
    }

    setIsSavingStore(true);
    setStoreError(null);
    setStoreSavedSuccess(false);

    try {
      const minQty = typeof announcementForm.freeDeliveryMinQty === 'string'
        ? (parseInt(announcementForm.freeDeliveryMinQty.trim(), 10) || 1)
        : (announcementForm.freeDeliveryMinQty || 1);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'store',
          value: {
            freeShippingThreshold: parsed,
            currencySymbol: '৳ BDT'
          }
        })
      });
      const data = await res.json();

      // Also persist the delivery offer rules
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'announcement',
          value: {
            ...announcementForm,
            freeDeliveryMinQty: minQty
          }
        })
      });

      if (data.success) {
        setStoreSavedSuccess(true);
        window.dispatchEvent(new Event('falak:settings-changed'));
        setTimeout(() => setStoreSavedSuccess(false), 3000);
      } else {
        setStoreError(data.error || 'Failed to save settings.');
      }
    } catch {
      setStoreError('Network error — failed to save settings.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSaveDeliveryOffer = async () => {
    const minQty = typeof announcementForm.freeDeliveryMinQty === 'string'
      ? (parseInt(announcementForm.freeDeliveryMinQty.trim(), 10) || 1)
      : (announcementForm.freeDeliveryMinQty || 1);

    setIsSavingOffer(true);
    setOfferError(null);
    setOfferSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'announcement',
          value: {
            ...announcementForm,
            freeDeliveryMinQty: minQty
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setOfferSavedSuccess(true);
        window.dispatchEvent(new Event('falak:settings-changed'));
        setTimeout(() => setOfferSavedSuccess(false), 3000);
      } else {
        setOfferError(data.error || 'Failed to save delivery offer.');
      }
    } catch {
      setOfferError('Network error — failed to save delivery offer.');
    } finally {
      setIsSavingOffer(false);
    }
  };

  // ── One-time base64 → Cloudinary migration ─────────────────────────────
  // Products saved before the Cloudinary integration may still carry base64
  // `data:` image strings (MongoDB bloat). This utility re-uploads them and
  // rewrites the URLs. Idempotent — already-remote URLs are skipped.
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);

  const dataUrlToFile = async (dataUrl: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    return new File([blob], `legacy-${Date.now()}.${ext}`, { type: blob.type });
  };

  // ── Site identity & contact (footer + Organization schema) ──────────
  const [siteForm, setSiteForm] = useState({
    contactPhone: '',
    contactEmail: '',
    address: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    youtube: ''
  });
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [siteSavedSuccess, setSiteSavedSuccess] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/settings?key=site');
      const data = await res.json();
      if (data.success && data.setting) {
        const val = data.setting.value;
        setSiteForm({
          contactPhone: val.contactPhone || '',
          contactEmail: val.contactEmail || '',
          address: val.address || '',
          whatsapp: val.whatsapp || '',
          instagram: val.instagram || '',
          facebook: val.facebook || '',
          youtube: val.youtube || ''
        });
      }
    } catch (e) {
      console.error('Failed to load site identity:', e);
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = siteForm.contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSiteError('Contact email does not look valid.');
      return;
    }

    for (const field of ['whatsapp', 'instagram', 'facebook', 'youtube'] as const) {
      const v = siteForm[field].trim();
      if (v && v.includes(':') && !/^https?:\/\//i.test(v)) {
        setSiteError(`Social link "${field}" must be an https:// URL or plain handle.`);
        return;
      }
    }

    setIsSavingSite(true);
    setSiteError(null);
    setSiteSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site', value: siteForm })
      });
      const data = await res.json();
      if (data.success) {
        setSiteSavedSuccess(true);
        setTimeout(() => setSiteSavedSuccess(false), 3000);
      } else {
        setSiteError(data.error || 'Failed to save site identity.');
      }
    } catch {
      setSiteError('Network error — failed to save site identity.');
    } finally {
      setIsSavingSite(false);
    }
  };

  // ── Home value props ("Why Choose Us" cards) ──────────────────────
  const [valueProps, setValueProps] = useState<{ icon: string; title: string; description: string }[]>([]);
  const [isSavingProps, setIsSavingProps] = useState(false);
  const [propsSavedSuccess, setPropsSavedSuccess] = useState(false);
  const [propsError, setPropsError] = useState<string | null>(null);

  const fetchValueProps = async () => {
    try {
      const res = await fetch('/api/settings?key=value-props');
      const data = await res.json();
      if (data.success && Array.isArray(data.setting?.value)) {
        setValueProps(data.setting.value);
      }
    } catch (e) {
      console.error('Failed to load value props:', e);
    }
  };

  const handleSaveValueProps = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = valueProps
      .map((p) => ({ icon: p.icon || 'sparkles', title: p.title.trim(), description: p.description.trim() }))
      .filter((p) => p.title);

    if (cleaned.length === 0) {
      setPropsError('At least one card with a title is required.');
      return;
    }

    setIsSavingProps(true);
    setPropsError(null);
    setPropsSavedSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'value-props', value: cleaned })
      });
      const data = await res.json();
      if (data.success) {
        setValueProps(cleaned);
        setPropsSavedSuccess(true);
        setTimeout(() => setPropsSavedSuccess(false), 3000);
      } else {
        setPropsError(data.error || 'Failed to save value props.');
      }
    } catch {
      setPropsError('Network error — failed to save value props.');
    } finally {
      setIsSavingProps(false);
    }
  };

  // ── Announcement bar ──────────────────────────────────────────────
  const [announcementForm, setAnnouncementForm] = useState({
    message: '',
    link: '',
    linkLabel: '',
    isActive: false,
    freeDeliveryOffer: true,
    freeDeliveryMinQty: 8 as number | string,
    freeDeliveryCategory: 'Hijab',
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementSaved, setAnnouncementSaved] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch('/api/settings?key=announcement');
      const data = await res.json();
      if (data.success && data.setting) {
        const v = data.setting.value;
        const msg = v.message || '';
        setAnnouncementForm({
          message: msg,
          link: v.link || '',
          linkLabel: v.linkLabel || '',
          isActive: Boolean(v.isActive),
          freeDeliveryOffer: typeof v.freeDeliveryOffer === 'boolean'
            ? v.freeDeliveryOffer
            : /free|delivery|ডেলিভারি/i.test(msg),
          freeDeliveryMinQty: Number(v.freeDeliveryMinQty) || 8,
          freeDeliveryCategory: v.freeDeliveryCategory || 'Hijab',
        });
      }
    } catch (e) {
      console.error('Failed to load announcement:', e);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    const link = announcementForm.link.trim();
    if (announcementForm.message.trim() && link && !link.startsWith('/') && !/^https?:\/\//i.test(link)) {
      setAnnouncementError('Link must be an internal path (/...) or an https:// URL.');
      return;
    }

    const minQty = typeof announcementForm.freeDeliveryMinQty === 'string'
      ? (parseInt(announcementForm.freeDeliveryMinQty.trim(), 10) || 1)
      : (announcementForm.freeDeliveryMinQty || 1);

    setIsSavingAnnouncement(true);
    setAnnouncementError(null);
    setAnnouncementSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'announcement',
          value: {
            message: announcementForm.message.trim(),
            link,
            linkLabel: announcementForm.linkLabel.trim(),
            isActive: announcementForm.isActive,
            freeDeliveryOffer: announcementForm.freeDeliveryOffer,
            freeDeliveryMinQty: minQty,
            freeDeliveryCategory: announcementForm.freeDeliveryCategory,
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncementSaved(true);
        window.dispatchEvent(new Event('falak:settings-changed'));
        setTimeout(() => setAnnouncementSaved(false), 3000);
      } else {
        setAnnouncementError(data.error || 'Failed to save announcement.');
      }
    } catch {
      setAnnouncementError('Network error — failed to save announcement.');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // Load all settings blocks once on mount (functions are declared above).
  useEffect(() => {
    fetchBkashSettings();
    fetchStoreSettings();
    fetchSiteSettings();
    fetchValueProps();
    fetchAnnouncement();
  }, []);

  const handleMigrateImages = async () => {
    if (isMigrating) return; // in-flight guard against double-runs
    if (
      !confirm(
        'Upload every embedded (base64) product image to Cloudinary and replace the stored URLs?\nAlready-remote images are skipped. This may take a while.'
      )
    )
      return;

    setIsMigrating(true);
    setMigrationSummary(null);
    let productsTouched = 0;
    let imagesMoved = 0;
    const failures: string[] = [];

    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      const products: Product[] = data.products || [];

      for (const product of products) {
        const hasLegacy =
          product.images.some((i) => i.startsWith('data:')) ||
          product.colors.some((c) => (c.images || []).some((i) => i.startsWith('data:'))) ||
          (product.variations || []).some((v) => (v.imageUrl || '').startsWith('data:'));
        if (!hasLegacy) continue;

        try {
          let moved = 0;

          // Legacy rows duplicate the SAME data URL across images, colors and
          // variations[].imageUrl — upload each unique image once and reuse it.
          const urlCache = new Map<string, string>();
          const migrateUrl = async (url: string): Promise<string> => {
            if (!url.startsWith('data:')) return url;
            const cached = urlCache.get(url);
            if (cached) return cached;
            const [uploaded] = await uploadImages(await dataUrlToFile(url), 'products/migrated');
            urlCache.set(url, uploaded.url);
            moved++;
            return uploaded.url;
          };

          const mainImages: string[] = [];
          for (const img of product.images) {
            mainImages.push(await migrateUrl(img));
          }

          const colors = [];
          for (const color of product.colors) {
            const colorImages: string[] = [];
            for (const img of color.images || []) {
              colorImages.push(await migrateUrl(img));
            }
            colors.push({ ...color, images: colorImages });
          }

          const variations = [];
          for (const variation of product.variations || []) {
            variations.push({
              ...variation,
              ...(variation.imageUrl ? { imageUrl: await migrateUrl(variation.imageUrl) } : {}),
            });
          }

          const update = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: mainImages, colors, variations }),
          });
          if (!update.ok) throw new Error(`HTTP ${update.status}`);

          productsTouched++;
          imagesMoved += moved;
        } catch (err) {
          console.warn('[migration] product failed:', product.name, err);
          failures.push(product.name);
        }
      }

      setMigrationSummary(
        `Done — ${imagesMoved} image(s) moved across ${productsTouched} product(s).` +
        (failures.length ? ` Failed: ${failures.join(', ')}.` : '')
      );
    } catch {
      setMigrationSummary('Migration failed — could not load the product list.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl text-stone-900">
      {/* DB Connection & Seeder Card */}
      {/* <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6"> */}
      {/* <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>MongoDB Database Engine</span>
            </h3>
            <p className="text-xs text-stone-500">
              Live connection status and database re-seeder controls
            </p>
          </div> */}
      {/* 
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono text-emerald-800 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            {dbSource === 'mongodb' ? 'Connected to Mongo Daemon' : 'Local Static Mode'}
          </span> */}
      {/* </div> */}

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="text-stone-500 text-[10px] uppercase font-bold">Connection String</span>
            <p className="text-stone-900 font-bold truncate">mongodb://localhost:27017</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="text-stone-500 text-[10px] uppercase font-bold">Database Name</span>
            <p className="text-stone-900 font-bold">falak-closet</p>
          </div>
        </div> */}

      {/* Database Seeder Button */}
      {/* <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-stone-900 text-xs">Reset / Seed Sample Modest Fashion Dataset</p>
            <p className="text-[11px] text-stone-500">
              Populates MongoDB with sample Abayas, Kaftans, Hijabs, and Promotions.
            </p>
          </div>

          <button
            onClick={onSeedDatabase}
            disabled={isSeeding}
            className="px-4 py-2.5 bg-[#9B050B] hover:bg-[#B8000A] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding MongoDB...' : 'Seed Database Now'}</span>
          </button>
        </div>

        {seedResult && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
            {seedResult}
          </div>
        )} */}
      {/* </div> */}

      {/* General Store Settings Form */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-900" />
            <span>Store Configuration</span>
          </h3>
          <p className="text-xs text-stone-500">
            Free delivery rules for the storefront cart & checkout. Prices display in ৳ BDT.
          </p>
        </div>

        {storeSavedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Threshold saved — new carts pick it up on their next visit.</span>
          </div>
        )}

        {storeError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
            {storeError}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-stone-700">Free Delivery Threshold (৳ BDT)</label>
            <input
              type="text"
              inputMode="numeric"
              value={freeShippingThreshold}
              onChange={(e) => {
                const cleaned = toEnglishNumber(e.target.value).replace(/[^0-9]/g, '');
                setFreeShippingThreshold(cleaned);
              }}
              placeholder="0"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
            <p className="text-[10px] text-stone-500">
              Orders at or above this subtotal get free delivery (zone charges are waived). Applies
              on top of per-product “Buy X → Free Delivery” rules.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingStore}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingStore ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>
        </form>

        {/* Cart Free Delivery Promotion Rule placed under Save Configuration button */}
        <div className="pt-5 border-t border-stone-200/80 space-y-4 text-xs">
          {offerSavedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>কার্ট ফ্রি ডেলিভারি অফার সফলভাবে সংরক্ষিত হয়েছে!</span>
            </div>
          )}

          {offerError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
              {offerError}
            </div>
          )}

          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#A80C14]" />
                  <span className="font-bold text-stone-900 text-xs">কার্ট ফ্রি ডেলিভারি অফার (Free Delivery Offer on Cart)</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  নির্দিষ্ট সংখ্যক প্রোডাক্ট/হিজাব কার্টে যোগ করলে ক্রেতা ফ্রি ডেলিভারি চার্জ সুবিধা পাবে।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAnnouncementForm({ ...announcementForm, freeDeliveryOffer: !announcementForm.freeDeliveryOffer })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${announcementForm.freeDeliveryOffer
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-200 text-stone-600 border-stone-300'
                }`}
              >
                {announcementForm.freeDeliveryOffer ? '✓ সক্রিয় (Active)' : 'বন্ধ (Inactive)'}
              </button>
            </div>

            {announcementForm.freeDeliveryOffer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-200/60">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 text-[11px]">মিনিমাম কোয়ান্টিটি (Minimum Quantity)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={announcementForm.freeDeliveryMinQty}
                    onChange={(e) => {
                      const cleaned = toEnglishNumber(e.target.value).replace(/[^0-9]/g, '');
                      setAnnouncementForm({ ...announcementForm, freeDeliveryMinQty: cleaned });
                    }}
                    placeholder="8"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                  <p className="text-[10px] text-stone-400">উদা: ৮ দিলে যেকোনো ৮টি কিনলেই ডেলিভারি চার্জ ফ্রি দেখাবে।</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 text-[11px]">প্রযোজ্য পণ্য / ক্যাটাগরি (Applicable To)</label>
                  <select
                    value={announcementForm.freeDeliveryCategory}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, freeDeliveryCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
                  >
                    <option value="Hijab">Hijab (যেকোনো হিজাব)</option>
                    <option value="all">All Products (সকল প্রোডাক্ট)</option>
                  </select>
                  <p className="text-[10px] text-stone-400">কার্টে মোট যেকোনো ৮টি হিজাব হলেই ফ্রি চার্জ কার্যকর হবে।</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSaveDeliveryOffer}
              disabled={isSavingOffer}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="w-3.5 h-3.5 text-[#F5C77E]" />
              <span>{isSavingOffer ? 'Saving Offer…' : 'Save Delivery Offer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* bKash Payment Settings */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#E2136E] text-white flex items-center justify-center rounded font-sans text-[10px] font-bold">b</span>
            <span>bKash Payment Settings</span>
          </h3>
          <p className="text-xs text-stone-500">Configure manual payment number, account type, and instructions.</p>
        </div>

        {settingsSavedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>bKash settings saved successfully!</span>
          </div>
        )}

        {settingsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
            {settingsError}
          </div>
        )}

        <form onSubmit={handleSaveBkashSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">bKash Mobile Number *</label>
              <input
                type="text"
                required
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="e.g. 017XXXXXXXX"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Account Type</label>
              <select
                value={bkashAccountType}
                onChange={(e) => setBkashAccountType(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 font-bold"
              >
                <option value="Personal">Personal</option>
                <option value="Agent">Agent</option>
                <option value="Merchant">Merchant</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700">Payment Instructions (one step per line)</label>
            <textarea
              rows={5}
              value={bkashInstructions}
              onChange={(e) => setBkashInstructions(e.target.value)}
              placeholder="Enter instructions, one step per line"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingBkash}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingBkash ? 'Saving settings...' : 'Save bKash Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* Announcement Bar */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#9B050B]" />
            <span>Announcement Bar</span>
          </h3>
          <p className="text-xs text-stone-500">
            Slim notice strip above the header on every storefront page. Empty message or inactive = hidden.
          </p>
        </div>

        {announcementSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Announcement saved — visible on the next storefront visit.</span>
          </div>
        )}

        {announcementError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">{announcementError}</div>
        )}

        <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-stone-700">Message</label>
            <input
              type="text"
              value={announcementForm.message}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
              placeholder="e.g. Eid collection is live — flat 25% off this week!"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Link (optional)</label>
              <input
                type="text"
                value={announcementForm.link}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, link: e.target.value })}
                placeholder="/live-promotions"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Link Label</label>
              <input
                type="text"
                value={announcementForm.linkLabel}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, linkLabel: e.target.value })}
                placeholder="Shop Now"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          {/* Storefront Visibility Toggle Card */}
          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {announcementForm.isActive ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-stone-400" />
                )}
                <span className="font-bold text-stone-900 text-xs">
                  স্টোরফ্রন্ট ভিজিবিলিটি (Storefront Visibility)
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {announcementForm.isActive
                  ? 'অ্যানাউন্সমেন্ট বারটি বর্তমানে ওয়েবসাইটে ক্রেতাদের নিকট প্রদর্শিত হচ্ছে।'
                  : 'অ্যানাউন্সমেন্ট বারটি বর্তমানে ওয়েবসাইটে লুকায়িত (Hidden) রাখা হয়েছে।'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAnnouncementForm({ ...announcementForm, isActive: !announcementForm.isActive })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 shrink-0 ${
                announcementForm.isActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700 border-stone-300'
              }`}
            >
              {announcementForm.isActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>সক্রিয় (Visible)</span>
                </>
              ) : (
                <span>লুকায়িত (Hidden)</span>
              )}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingAnnouncement}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingAnnouncement ? 'Saving…' : 'Save Announcement'}
            </button>
          </div>
        </form>
      </div>

      {/* Home Value Props */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#9B050B]" />
            <span>Home Value Props</span>
          </h3>
          <p className="text-xs text-stone-500">
            The “Why Modest Fashion Lovers Choose Us” cards on the home page. Up to 8 cards; the grid shows 4 per row.
          </p>
        </div>

        {propsSavedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Value props saved — the home page updates within a minute.</span>
          </div>
        )}

        {propsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">{propsError}</div>
        )}

        <form onSubmit={handleSaveValueProps} className="space-y-4 text-xs">
          <div className="space-y-3">
            {valueProps.map((prop, idx) => (
              <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-stone-900 font-mono uppercase tracking-wider text-[10px]">
                    Card #{idx + 1}
                  </span>
                  {valueProps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setValueProps((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Remove card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-stone-700">Icon</label>
                    <select
                      value={prop.icon}
                      onChange={(e) =>
                        setValueProps((prev) => prev.map((p, i) => (i === idx ? { ...p, icon: e.target.value } : p)))
                      }
                      className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="award">Award</option>
                      <option value="shield">Shield</option>
                      <option value="truck">Truck</option>
                      <option value="rotate">Exchange (Rotate)</option>
                      <option value="heart">Heart & Hands</option>
                      <option value="sparkles">Sparkles</option>
                      <option value="badge-check">Badge Check</option>
                      <option value="medal">Medal</option>
                      <option value="gem">Gem</option>
                      <option value="crown">Crown</option>
                      <option value="recycle">Recycle</option>
                      <option value="palette">Palette</option>
                      <option value="package">Package</option>
                      <option value="headphones">Headphones</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-stone-700">Title *</label>
                    <input
                      type="text"
                      value={prop.title}
                      onChange={(e) =>
                        setValueProps((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))
                      }
                      placeholder="Card headline"
                      className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 font-bold focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Description</label>
                  <textarea
                    rows={2}
                    value={prop.description}
                    onChange={(e) =>
                      setValueProps((prev) => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))
                    }
                    placeholder="One-line supporting copy"
                    className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
            ))}
          </div>

          {valueProps.length < 8 && (
            <button
              type="button"
              onClick={() => setValueProps((prev) => [...prev, { icon: 'sparkles', title: '', description: '' }])}
              className="px-4 py-2.5 border-2 border-dashed border-stone-300 hover:border-stone-900 text-stone-700 hover:text-stone-900 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-[#9B050B]" /> Add Card
            </button>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProps}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingProps ? 'Saving…' : 'Save Value Props'}
            </button>
          </div>
        </form>
      </div>

      {/* Site Identity & Contact */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#9B050B]" />
            <span>Site Identity & Contact</span>
          </h3>
          <p className="text-xs text-stone-500">
            Contact details and social profiles shown in the footer and shared with search engines.
            Leave a field empty to hide it.
          </p>
        </div>

        {siteSavedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Saved — the footer and search listings update within a minute.</span>
          </div>
        )}

        {siteError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">{siteError}</div>
        )}

        <form onSubmit={handleSaveSiteSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Contact Phone</label>
              <input
                type="text"
                value={siteForm.contactPhone}
                onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })}
                placeholder="e.g. +880 1XXX-XXXXXX"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Contact Email</label>
              <input
                type="text"
                value={siteForm.contactEmail}
                onChange={(e) => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
                placeholder="e.g. hello@falakcloset.com"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700">Business Address</label>
            <input
              type="text"
              value={siteForm.address}
              onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
              placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">WhatsApp</label>
              <input
                type="text"
                value={siteForm.whatsapp}
                onChange={(e) => setSiteForm({ ...siteForm, whatsapp: e.target.value })}
                placeholder="8801XXXXXXXXX or https://wa.me/…"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Instagram</label>
              <input
                type="text"
                value={siteForm.instagram}
                onChange={(e) => setSiteForm({ ...siteForm, instagram: e.target.value })}
                placeholder="@handle or https://instagram.com/…"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">Facebook</label>
              <input
                type="text"
                value={siteForm.facebook}
                onChange={(e) => setSiteForm({ ...siteForm, facebook: e.target.value })}
                placeholder="handle or https://facebook.com/…"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700">YouTube</label>
              <input
                type="text"
                value={siteForm.youtube}
                onChange={(e) => setSiteForm({ ...siteForm, youtube: e.target.value })}
                placeholder="@channel or https://youtube.com/…"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          <p className="text-[10px] text-stone-500">
            Social fields accept a plain handle (@handle), an ID/number, or a full https:// URL.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSite}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSavingSite ? 'Saving…' : 'Save Site Identity'}
            </button>
          </div>
        </form>
      </div>

      {/* Cloudinary Image Migration */}
      {/* <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-stone-200">
          <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-[#9B050B]" />
            <span>Cloudinary Image Storage</span>
          </h3>
          <p className="text-xs text-stone-500">
            New uploads already go to Cloudinary. Use this once to move old embedded (base64)
            product photos out of MongoDB.
          </p>
        </div>

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-stone-900 text-xs">Migrate Product Images to Cloudinary</p>
            <p className="text-[11px] text-stone-500">
              Idempotent — products whose images are already remote URLs are skipped.
            </p>
          </div>

          <button
            onClick={handleMigrateImages}
            disabled={isMigrating}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <CloudUpload className={`w-4 h-4 ${isMigrating ? 'animate-bounce' : ''}`} />
            <span>{isMigrating ? 'Migrating…' : 'Start Migration'}</span>
          </button>
        </div>

        {migrationSummary && (
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 font-bold">
            {migrationSummary}
          </div>
        )}
      </div> */}

      {/* Admin Security Credentials Card */}
      {/* <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
            <KeyRound className="w-4 h-4 text-stone-900" />
            <span>Admin Authentication Protocol</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">2FA Ready</span>
        </div>
        <p className="text-xs text-stone-500">
          Admin Portal authentication is protected with local session token validation. Demo username: <strong className="text-stone-900">admin</strong> / Password: <strong className="text-stone-900">falak123</strong>.
        </p>
      </div> */}
    </div>
  );
}
