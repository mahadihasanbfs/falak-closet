'use client';

import React, { useState, useEffect } from 'react';
import {
  Images,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { HeroSlideView } from '@/lib/heroSlides';
import { ImageUploader } from '@/components/ui/ImageUploader';

const EMPTY_FORM = {
  tag: '',
  title: '',
  subtitle: '',
  ctaText: 'Shop Now',
  ctaLink: '/shop',
  image: '',
  isActive: true,
  sortOrder: '0'
};

/** Common CTA targets surfaced as datalist suggestions in the form. */
const CTA_SUGGESTIONS = ['/shop', '/live-promotions', '/cart', '/how-to-order', '/track'];

export function HeroSlidesTab() {
  const [slides, setSlides] = useState<HeroSlideView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlideView | null>(null);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState('');

  // Form State
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const fetchSlides = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/hero-slides');
      const data = await res.json();
      if (data.success) {
        setSlides(data.slides || []);
      } else {
        setLoadError(data.error || 'Failed to load hero slides.');
      }
    } catch {
      setLoadError('Network error — could not reach /api/hero-slides.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openCreateModal = () => {
    setEditingSlide(null);
    // New slides naturally sort to the end.
    setFormData({ ...EMPTY_FORM, sortOrder: String(slides.length + 1) });
    setActionError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slide: HeroSlideView) => {
    setEditingSlide(slide);
    setFormData({
      tag: slide.tag,
      title: slide.title,
      subtitle: slide.subtitle,
      ctaText: slide.ctaText,
      ctaLink: slide.ctaLink,
      image: slide.image,
      isActive: slide.isActive,
      sortOrder: String(slide.sortOrder)
    });
    setActionError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSlide(null);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.image.trim()) {
      setActionError('Title and image are required.');
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        ...(editingSlide ? { id: editingSlide.id } : {}),
        tag: formData.tag.trim(),
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        ctaText: formData.ctaText.trim(),
        ctaLink: formData.ctaLink.trim(),
        image: formData.image.trim(),
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0
      };

      const res = await fetch('/api/hero-slides', {
        method: editingSlide ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!data.success) {
        setActionError(data.error || 'Could not save the slide.');
        return;
      }

      closeModal();
      await fetchSlides();
    } catch {
      setActionError('Network error — could not save the slide.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (slide: HeroSlideView) => {
    try {
      const res = await fetch('/api/hero-slides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slide.id, isActive: !slide.isActive })
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'Could not toggle the slide.');
        return;
      }
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, isActive: !slide.isActive } : s)));
    } catch {
      setActionError('Network error — could not toggle the slide.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/hero-slides?id=${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'Could not delete the slide.');
        return;
      }
      setSlides((prev) => prev.filter((s) => s.id !== deletingId));
    } catch {
      setActionError('Network error — could not delete the slide.');
    } finally {
      setDeletingId(null);
      setDeletingTitle('');
    }
  };

  // Reorder: swap sortOrder with the neighbour and PATCH both rows.
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;

    const a = slides[index];
    const b = slides[target];
    const swapped = [...slides];
    swapped[index] = { ...b, sortOrder: a.sortOrder };
    swapped[target] = { ...a, sortOrder: b.sortOrder };
    setSlides(swapped); // optimistic — server refresh on failure

    try {
      const patch = (id: string, sortOrder: number) =>
        fetch('/api/hero-slides', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, sortOrder })
        });
      await Promise.all([patch(a.id, b.sortOrder), patch(b.id, a.sortOrder)]);
    } catch {
      setActionError('Reorder failed — refreshing.');
      fetchSlides();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FDF2F3] border border-[#F8D2D5] rounded-2xl">
            <Images className="w-6 h-6 text-[#A80C14]" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl text-stone-900">Hero Carousel Slides</h2>
            <p className="text-xs text-stone-500">
              Manage the home page banner slider — {slides.filter((s) => s.isActive).length} active of{' '}
              {slides.length} total.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSlides}
            className="p-2.5 bg-white border border-stone-200 hover:border-stone-400 rounded-xl transition-colors cursor-pointer"
            title="Refresh slides"
          >
            <RefreshCw className={`w-4 h-4 text-stone-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Slide
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
          </span>
          <button onClick={() => setActionError(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-stone-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="p-6 bg-white rounded-3xl border border-rose-200 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-stone-900">Could not load slides</p>
          <p className="text-xs text-stone-500">{loadError}</p>
          <button
            onClick={fetchSlides}
            className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`bg-white rounded-3xl border p-4 shadow-xs flex flex-col sm:flex-row gap-4 ${
                slide.isActive ? 'border-stone-200' : 'border-red-200 opacity-85 bg-stone-50/50'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-full sm:w-44 h-24 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/50 shrink-0">
                {slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image} alt={slide.title} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">No Image</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {slide.tag && (
                    <span className="px-2 py-0.5 bg-[#FDF2F3] border border-[#F8D2D5] text-[#A80C14] text-[9px] font-black rounded-md uppercase tracking-wider">
                      {slide.tag}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      slide.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}
                  >
                    {slide.isActive ? 'Active' : 'Hidden'}
                  </span>
                  <span className="text-[9px] font-mono text-stone-400">order {slide.sortOrder}</span>
                </div>
                <p className="font-bold text-sm text-stone-900 truncate">{slide.title}</p>
                <p className="text-[11px] text-stone-500 truncate">{slide.subtitle || '—'}</p>
                <p className="text-[10px] text-stone-400 font-mono truncate">
                  CTA: “{slide.ctaText}” → {slide.ctaLink}
                </p>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === slides.length - 1}
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleToggleActive(slide)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    slide.isActive
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-stone-400 hover:bg-stone-100'
                  }`}
                  title={slide.isActive ? 'Hide from storefront' : 'Show on storefront'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(slide)}
                  className="p-1.5 text-stone-500 hover:text-[#A80C14] hover:bg-[#FDF2F3] rounded-lg transition-colors cursor-pointer"
                  title="Edit slide"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeletingId(slide.id);
                    setDeletingTitle(slide.title);
                  }}
                  className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {slides.length === 0 && (
            <div className="p-8 bg-white rounded-3xl border border-dashed border-stone-300 text-center space-y-2">
              <Images className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-900">No hero slides yet</p>
              <p className="text-xs text-stone-500">Create the first slide for the home page carousel.</p>
            </div>
          )}

          <p className="text-[10px] text-stone-400 text-center pt-1">
            Changes go live within a minute — the home page cache refreshes on its next visit.
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="shrink-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingSlide ? 'Edit Hero Slide' : 'Add Hero Slide'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Live mini preview — same palette as the storefront hero */}
              <div className="relative h-28 rounded-2xl overflow-hidden bg-[#0D153A] border border-stone-200">
                {formData.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0D153A] via-[#0D153A]/90 to-transparent" />
                <div className="absolute inset-0 p-4 flex flex-col justify-center text-white space-y-1">
                  {formData.tag && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#F2C76E]">
                      {formData.tag}
                    </span>
                  )}
                  <span className="text-sm font-extrabold leading-tight line-clamp-2">
                    {formData.title || 'Slide title preview'}
                  </span>
                  <span className="text-[10px] text-stone-200 line-clamp-1">
                    {formData.subtitle || 'Subtitle preview'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">Tag / Kicker</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="e.g. FRESH OFFERS"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14] uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Title <span className="text-[#A80C14]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="The big headline"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14] font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Supporting line under the title"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Image URL <span className="text-[#A80C14]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <input
                    type="url"
                    required
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="/api/images/… or any image URL"
                    className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14]"
                  />
                  <ImageUploader
                    folder="hero"
                    label="Upload"
                    onUploaded={(results) => {
                      if (results[0]?.url) {
                        setFormData((prev) => ({ ...prev, image: results[0].url }));
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-stone-400">
                  Upload directly to the database or paste a URL — embedded (base64) images are not stored.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">CTA Text</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">CTA Link</label>
                  <input
                    type="text"
                    list="cta-targets"
                    value={formData.ctaLink}
                    onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14] font-mono"
                  />
                  <datalist id="cta-targets">
                    {CTA_SUGGESTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-stone-400">Internal path (/shop) or https:// URL.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#A80C14] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">Visibility</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      formData.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}
                  >
                    {formData.isActive ? '✓ Active on storefront' : 'Hidden from storefront'}
                  </button>
                </div>
              </div>

              {actionError && (
                <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {actionError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#A80C14] hover:bg-[#8C0A10] text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : editingSlide ? 'Save Changes' : 'Create Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl w-fit">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Delete this slide?</h3>
              <p className="text-xs text-stone-500 mt-1">
                “{deletingTitle}” will be removed from the home page carousel. If its image lives in our
                Cloudinary space, that asset is deleted too.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setDeletingId(null);
                  setDeletingTitle('');
                }}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Delete Slide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
