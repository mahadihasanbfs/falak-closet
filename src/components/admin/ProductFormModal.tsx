'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Check,
  Wand2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  DollarSign,
  Package,
  Image as ImageIcon,
  Tag,
  Star,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Pipette,
  Palette,
  Search,
  Heart
} from 'lucide-react';
import { Product, WORK_TYPES, OCCASIONS, MATERIALS, WEATHER_TYPES, ProductVariation, ProductColor } from '@/data/products';
import { useCategories } from '@/lib/useCategories';
import { FASHION_COLORS_50, autoDetectColor, getColorNameFromHex, ColorOption } from '@/data/colors';
import { formatCurrency } from '@/lib/utils';
import { ImageColorPickerModal } from './ImageColorPickerModal';
import { uploadImages, deleteCloudinaryImage, cloudinaryPublicIdFromUrl } from '@/lib/cloudinary';
import { useToast } from '@/components/ui/Toast';

export interface DetailedColorVariation {
  id: string;
  name: string;
  hex: string;
  stock?: number;
  images: string[];
  mainImageIndex: number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves to `false` when the save failed — the modal then stays open with the data intact. */
  onSaveProduct: (productData: Partial<Product>) => Promise<boolean>;
  editingProduct?: Product | null;
  /** Live catalog, used to suggest existing material / work-type / occasion values. */
  existingProducts?: Product[];
}

/** Seed values merged with whatever the live catalog already uses, de-duplicated. */
function suggestionsFor(products: Product[] = [], key: 'material' | 'workType' | 'occasion' | 'weather', seeds: readonly string[]) {
  const fromDb = (products || []).flatMap((p) => ((p[key] || '').split(',').map((s) => s.trim()))).filter(Boolean);
  return Array.from(new Set([...seeds, ...fromDb])).sort();
}

interface SearchableAttributeSelectProps {
  label: string;
  badge?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  dynamicOptions?: string[];
}

function SearchableAttributeSelect({
  label,
  badge = '',
  value,
  onChange,
  options,
  placeholder = 'Select or search…',
  dynamicOptions = []
}: SearchableAttributeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedList = React.useMemo(() => {
    return (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option: string) => {
    const normOpt = option.toLowerCase();
    let updated: string[];
    if (selectedList.some((item) => item.toLowerCase() === normOpt)) {
      updated = selectedList.filter((item) => item.toLowerCase() !== normOpt);
    } else {
      updated = [...selectedList, option];
    }
    onChange(updated.join(', '));
  };

  const handleRemove = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    const updated = selectedList.filter((item) => item.toLowerCase() !== option.toLowerCase());
    onChange(updated.join(', '));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const filteredOptions = options.filter((o) =>
    o.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="font-bold text-stone-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {label}
          {selectedList.length > 0 && (
            <span className="text-[10px] font-bold bg-[#9B050B]/10 text-[#9B050B] px-1.5 py-0.5 rounded-full">
              {selectedList.length} selected
            </span>
          )}
        </span>
        {badge && (
          <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {badge}
          </span>
        )}
      </label>

      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full min-h-[48px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-bold flex items-center justify-between gap-2 focus-within:ring-2 focus-within:ring-stone-900 cursor-pointer"
        >
          <div className="flex flex-wrap gap-1.5 items-center flex-1">
            {selectedList.length === 0 ? (
              <span className="text-stone-400 font-normal text-sm px-1">{placeholder}</span>
            ) : (
              selectedList.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-900 text-white rounded-lg text-xs font-semibold animate-in fade-in"
                >
                  {item}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, item)}
                    className="hover:text-amber-400 p-0.5 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search or type ${label.toLowerCase()}...`}
                autoFocus
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredOptions.map((o) => {
                const isDynamic = dynamicOptions.some((d) => d.toLowerCase() === o.toLowerCase());
                const isSelected = selectedList.some((item) => item.toLowerCase() === o.toLowerCase());
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => handleToggle(o)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#9B050B] text-white'
                        : 'text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-white bg-white/20'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{o}</span>
                    </div>
                    {isDynamic && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Dynamic
                      </span>
                    )}
                  </button>
                );
              })}

              {searchQuery.trim() &&
                !options.some((o) => o.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      const newCustom = searchQuery.trim();
                      if (!selectedList.some((item) => item.toLowerCase() === newCustom.toLowerCase())) {
                        onChange([...selectedList, newCustom].join(', '));
                      }
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-stone-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-between cursor-pointer"
                  >
                    <span>Add custom: "{searchQuery.trim()}"</span>
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                  </button>
                )}
            </div>

            {selectedList.length > 0 && (
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between px-1">
                <span className="text-[11px] text-stone-500 font-medium">
                  {selectedList.length} item{selectedList.length > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSaveProduct,
  editingProduct,
  existingProducts = []
}: ProductFormModalProps) {
  const { showToast } = useToast();

  // Active Wizard Tab (1: Basic, 2: Attributes & Occasion, 3: Pricing & Stock, 4: Colors & Photos, 5: Features & Care)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form Fields State.
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    subCategory: '',
    price: 0,
    buyingPrice: 0,
    originalPrice: 0,
    workType: 'Embroidery',
    occasion: 'Festive & Eid',
    material: 'Nida Silk',
    weather: '',
    isNew: false,
    stock: 0,
    description: '',
    featuresText: '',
    careText: '',
    freeDeliveryQuantity: 0
  });

  // Save failure message, shown inline so it cannot be missed behind the overlay.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Searchable Occasion Dropdown State
  const [occasionSearchOpen, setOccasionSearchOpen] = useState(false);
  const [occasionSearchQuery, setOccasionSearchQuery] = useState('');
  const occasionDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (occasionDropdownRef.current && !occasionDropdownRef.current.contains(event.target as Node)) {
        setOccasionSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Managed Categories & Occasions
  const { categories: availableCategories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  const mainCategories = availableCategories.filter((c) => !c.type || c.type === 'category');
  const dynamicOccasionCategories = availableCategories.filter((c) => c.type === 'occasion');
  const allOccasionOptions = Array.from(
    new Set([
      ...dynamicOccasionCategories.map((c) => c.name),
      ...suggestionsFor(existingProducts, 'occasion', OCCASIONS)
    ])
  ).filter(Boolean).sort();

  const materialOptions = suggestionsFor(existingProducts, 'material', MATERIALS);
  const workTypeOptions = suggestionsFor(existingProducts, 'workType', WORK_TYPES);
  const weatherOptions = suggestionsFor(existingProducts, 'weather', WEATHER_TYPES);


  // Color Variations State (Color-wise image arrays)
  const [colorVariations, setColorVariations] = useState<DetailedColorVariation[]>([]);

  // Per-color variation size input text state (e.g. { "Emerald Green": "52" })
  const [variationSizeInputs, setVariationSizeInputs] = useState<Record<string, string>>({});

  // Size Price Overrides map
  const [sizePriceAdjustments, setSizePriceAdjustments] = useState<Record<string, number>>({});

  // Product Variations List (Generated Color x Size items)
  const [variationsMatrix, setVariationsMatrix] = useState<ProductVariation[]>([]);

  // Interactive Eyedropper Modal State
  const [eyedropperImageUrl, setEyedropperImageUrl] = useState<string | null>(null);
  const [eyedropperTargetColorId, setEyedropperTargetColorId] = useState<string | null>(null);
  // Color variation currently uploading photos to Cloudinary (null = none).
  const [uploadingColorId, setUploadingColorId] = useState<string | null>(null);

  const handleOpenEyedropperForColor = (colorId: string, imgUrl: string) => {
    setEyedropperTargetColorId(colorId);
    setEyedropperImageUrl(imgUrl);
  };

  // Custom Hex Input State
  const [customHexInput, setCustomHexInput] = useState('#9B050B');
  const [customColorName, setCustomColorName] = useState('Royal Crimson');

  // Live Card Preview Swatch Selection
  const [previewColorIndex, setPreviewColorIndex] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Initial Product Data for Editing
  useEffect(() => {
    setSaveError(null);
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        code: editingProduct.code || '',
        category: editingProduct.category || '',
        subCategory: editingProduct.subCategory || '',
        price: editingProduct.price || 0,
        buyingPrice: editingProduct.buyingPrice || 0,
        originalPrice: editingProduct.originalPrice || Math.round((editingProduct.price || 0) * 1.25),
        workType: editingProduct.workType || 'Embroidery',
        occasion: editingProduct.occasion || 'Festive & Eid',
        material: editingProduct.material || 'Nida Silk',
        weather: editingProduct.weather || '',
        isNew: editingProduct.isNew ?? false,
        stock: editingProduct.stock ?? 10,
        description: editingProduct.description || 'Luxury modest ensemble.',
        featuresText: (editingProduct.features || []).join('\n'),
        careText: (editingProduct.careInstructions || []).join('\n'),
        freeDeliveryQuantity: editingProduct.freeDeliveryQuantity || 0
      });


      // Construct color variations array from editing product
      if (editingProduct.colors && editingProduct.colors.length > 0) {
        const constructed: DetailedColorVariation[] = editingProduct.colors.map((c, i) => {
          const colorImages = editingProduct.images && editingProduct.images.length > 0
            ? [editingProduct.images[c.imageIndex || i % editingProduct.images.length] || editingProduct.images[0]]
            : ['https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80'];

          return {
            id: `col-${Date.now()}-${i}-${Math.random()}`,
            name: c.name,
            hex: c.hex,
            images: (c as any).images || colorImages,
            mainImageIndex: 0
          };
        });
        setColorVariations(constructed);
      } else {
        // Default initial color variation
        setColorVariations([
          {
            id: `col-${Date.now()}`,
            name: 'Royal Crimson',
            hex: '#9B050B',
            images: editingProduct.images || ['https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80'],
            mainImageIndex: 0
          }
        ]);
      }

      if (editingProduct.variations && editingProduct.variations.length > 0) {
        // Deduplicate (normalized color+size, first occurrence wins) so legacy
        // duplicate rows never come back into the catalog on save.
        const seenVarKeys = new Set<string>();
        setVariationsMatrix(
          editingProduct.variations.filter((v) => {
            const key = `${(v.colorName || '').trim().toLowerCase()}|${(v.size || '').trim().toLowerCase()}`;
            if (seenVarKeys.has(key)) return false;
            seenVarKeys.add(key);
            return true;
          })
        );
      } else {
        const colors = editingProduct.colors && editingProduct.colors.length > 0
          ? editingProduct.colors
          : [{ name: 'Royal Crimson', hex: '#9B050B' }];
        const sizes = editingProduct.sizes && editingProduct.sizes.length > 0
          ? editingProduct.sizes
          : ['Free Size'];

        const initialMatrix: ProductVariation[] = [];
        colors.forEach((c) => {
          sizes.forEach((sz) => {
            initialMatrix.push({
              id: `var-${c.name}-${sz}-${Date.now()}`,
              colorName: c.name,
              colorHex: c.hex,
              size: sz,
              stock: editingProduct.stock ?? 10,
              imageUrl: editingProduct.images?.[0] || ''
            });
          });
        });
        setVariationsMatrix(initialMatrix);
      }
    } else {
      setFormData({
        name: '',
        code: '',
        category: '',
        subCategory: '',
        price: 0,
        buyingPrice: 0,
        originalPrice: 0,
        workType: 'Embroidery',
        occasion: 'Festive & Eid',
        material: 'Nida Silk',
        weather: '',
        isNew: true,
        stock: 0,
        description: '',
        featuresText: '',
        careText: '',
        freeDeliveryQuantity: 0
      });
      setColorVariations([
        {
          id: `col-${Date.now()}`,
          name: 'Emerald Green',
          hex: '#0B6623',
          images: [],
          mainImageIndex: 0
        }
      ]);
      setVariationsMatrix([
        {
          id: `var-Emerald Green-Free Size-${Date.now()}`,
          colorName: 'Emerald Green',
          colorHex: '#0B6623',
          size: 'Free Size',
          stock: 10,
          imageUrl: ''
        }
      ]);
    }
  }, [editingProduct, isOpen]);

  // Categories arrive asynchronously, so a new product's default category can
  // only be picked once they land. Deliberately no seed-list fallback: offering
  // a category the store does not manage produces an unfilterable product.
  useEffect(() => {
    if (formData.category || availableCategories.length === 0) return;
    const first = availableCategories[0];
    setFormData((prev) => ({
      ...prev,
      category: first.name,
      subCategory: first.subCategories?.[0]?.name || ''
    }));
  }, [availableCategories, formData.category]);

  // Update auto-detected color name when custom Hex input changes (e.g. #fff -> Pure White, #000 -> Midnight Black)
  const handleHexInputChange = (rawHex: string) => {
    setCustomHexInput(rawHex);
    if (rawHex.length >= 4) {
      const resolved = getColorNameFromHex(rawHex);
      setCustomColorName(resolved.name);
    }
  };


  if (!isOpen) return null;

  // Add a Color Variation from Preset or Eyedropper or Custom Hex
  const handleAddColorVariation = (name: string, hex: string, defaultImage?: string) => {
    const exists = colorVariations.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    setColorVariations((prev) => [
      ...prev,
      {
        id: `col-${Date.now()}-${Math.random()}`,
        name,
        hex,
        images: defaultImage ? [defaultImage] : [],
        mainImageIndex: 0
      }
    ]);

    setVariationsMatrix((prev) => [
      ...prev,
      {
        id: `var-${name}-Free Size-${Date.now()}`,
        colorName: name,
        colorHex: hex,
        size: 'Free Size',
        stock: 10,
        imageUrl: defaultImage || ''
      }
    ]);
  };

  // Remove Color Variation
  const handleRemoveColorVariation = (id: string) => {
    if (colorVariations.length === 1) return; // Keep at least 1 color variation
    const target = colorVariations.find((c) => c.id === id);
    setColorVariations((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      setVariationsMatrix((prev) => prev.filter((v) => v.colorName !== target.name));
    }
  };

  // Update Color Variation Name inline
  const handleUpdateColorName = (id: string, name: string) => {
    const oldColor = colorVariations.find((c) => c.id === id);
    setColorVariations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
    if (oldColor) {
      setVariationsMatrix((prev) =>
        prev.map((v) => (v.colorName === oldColor.name ? { ...v, colorName: name } : v))
      );
    }
  };

  // Update Color Variation Hex Code inline
  const handleUpdateColorHex = (id: string, hex: string) => {
    const oldColor = colorVariations.find((c) => c.id === id);
    setColorVariations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hex } : c))
    );
    if (oldColor) {
      setVariationsMatrix((prev) =>
        prev.map((v) => (v.colorName === oldColor.name ? { ...v, colorHex: hex } : v))
      );
    }
  };

  // Append new empty Color Variation card when clicking [ Add More ]
  const handleAddNewColorRow = () => {
    const defaultColors = [
      { name: 'Obsidian Black', hex: '#0B0B0B' },
      { name: 'Emerald Green', hex: '#0B6623' },
      { name: 'Royal Crimson', hex: '#9B050B' },
      { name: 'Champagne Gold', hex: '#F7E7CE' },
      { name: 'Midnight Navy', hex: '#00052C' },
      { name: 'Dusty Rose', hex: '#DCAE96' }
    ];
    const unused = defaultColors.find(
      (dc) => !colorVariations.some((c) => c.name.toLowerCase() === dc.name.toLowerCase())
    ) || { name: `New Color ${colorVariations.length + 1}`, hex: '#9B050B' };

    setColorVariations((prev) => [
      ...prev,
      {
        id: `col-${Date.now()}-${Math.random()}`,
        name: unused.name,
        hex: unused.hex,
        stock: 10,
        images: [],
        mainImageIndex: 0
      }
    ]);

    setVariationsMatrix((prev) => [
      ...prev,
      {
        id: `var-${unused.name}-Free Size-${Date.now()}`,
        colorName: unused.name,
        colorHex: unused.hex,
        size: 'Free Size',
        stock: 10,
        imageUrl: ''
      }
    ]);
  };

  // Upload images for a Color Variation → Cloudinary (used to be base64 → MongoDB bloat)
  const handleColorFileUpload = async (colorId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingColorId(colorId);
    try {
      const results = await uploadImages(Array.from(files), 'products');
      const urls = results.map((r) => r.url);
      setColorVariations((prev) =>
        prev.map((c) => (c.id === colorId ? { ...c, images: [...c.images, ...urls] } : c))
      );
    } catch (err) {
      showToast({
        type: 'info',
        title: 'Upload Failed',
        subtitle: err instanceof Error ? err.message : 'Image upload failed.'
      });
    } finally {
      setUploadingColorId(null);
      // Reset so picking the same file again re-triggers onChange.
      e.target.value = '';
    }
  };

  // Add Image URL to a specific Color Variation
  const handleAddColorImageUrl = (colorId: string, url: string) => {
    if (!url.trim()) return;
    setColorVariations((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, images: [...c.images, url.trim()] } : c))
    );
  };

  // Remove image from specific Color Variation
  const handleRemoveColorImage = (colorId: string, imgIdx: number) => {
    // Read from the current snapshot so the cleanup side-effect stays outside
    // the state updater (React StrictMode replays updaters in dev).
    const removed = colorVariations.find((c) => c.id === colorId)?.images[imgIdx];
    const publicId = removed ? cloudinaryPublicIdFromUrl(removed) : null;
    if (publicId?.startsWith('falak-closet/')) {
      deleteCloudinaryImage(publicId);
    }

    setColorVariations((prev) =>
      prev.map((c) => {
        if (c.id !== colorId) return c;
        const newImgs = c.images.filter((_, i) => i !== imgIdx);
        const newMainIdx = c.mainImageIndex >= imgIdx && c.mainImageIndex > 0 ? c.mainImageIndex - 1 : 0;
        return { ...c, images: newImgs, mainImageIndex: newMainIdx };
      })
    );
  };

  // Set cover photo for a specific Color Variation
  const handleSetColorMainImage = (colorId: string, imgIdx: number) => {
    setColorVariations((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, mainImageIndex: imgIdx } : c))
    );
  };

  // Handle Eyedropper Selection from Image Color Picker Modal
  const handleEyedropperColorSelected = (name: string, hex: string) => {
    if (eyedropperTargetColorId) {
      // Update existing variation card with sampled color data
      setColorVariations((prev) =>
        prev.map((c) => (c.id === eyedropperTargetColorId ? { ...c, name, hex } : c))
      );
    } else {
      handleAddColorVariation(name, hex, eyedropperImageUrl || undefined);
    }
    setEyedropperTargetColorId(null);
    setEyedropperImageUrl(null);
  };

  const handleAddSizeToVariation = (colorName: string, colorHex: string, rawSize: string) => {
    const sz = rawSize.trim();
    if (!sz) return;
    setVariationsMatrix((prev) => {
      const exists = prev.some(
        (v) => v.colorName === colorName && v.size.toLowerCase() === sz.toLowerCase()
      );
      if (exists) return prev;
      const colorObj = colorVariations.find((c) => c.name === colorName);
      const img = colorObj?.images[colorObj.mainImageIndex || 0] || colorObj?.images[0] || '';
      return [
        ...prev,
        {
          id: `var-${colorName}-${sz}-${Date.now()}`,
          colorName,
          colorHex,
          size: sz,
          stock: 10,
          price: formData.price || undefined,
          buyingPrice: formData.buyingPrice || undefined,
          isHidden: false,
          imageUrl: img
        }
      ];
    });
    setVariationSizeInputs((prev) => ({ ...prev, [colorName]: '' }));
  };

  const handleRemoveSizeFromVariation = (colorName: string, sizeName: string) => {
    setVariationsMatrix((prev) =>
      prev.filter((v) => !(v.colorName === colorName && v.size === sizeName))
    );
  };

  const handleUpdateSizeStock = (colorName: string, sizeName: string, stock: number) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName ? { ...v, stock: Math.max(0, stock) } : v
      )
    );
  };

  const handleUpdateSizePrice = (colorName: string, sizeName: string, price: number | undefined) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName
          ? { ...v, price: price !== undefined && !isNaN(price) ? Math.max(0, price) : undefined }
          : v
      )
    );
  };

  const handleUpdateSizeBuyingPrice = (colorName: string, sizeName: string, buyingPrice: number | undefined) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName
          ? { ...v, buyingPrice: buyingPrice !== undefined && !isNaN(buyingPrice) ? Math.max(0, buyingPrice) : undefined }
          : v
      )
    );
  };

  const handleUpdateSizeOriginalPrice = (colorName: string, sizeName: string, originalPrice: number | undefined) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName
          ? { ...v, originalPrice: originalPrice !== undefined && !isNaN(originalPrice) ? Math.max(0, originalPrice) : undefined }
          : v
      )
    );
  };

  const handleToggleVariationVisibility = (colorName: string, sizeName: string) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName ? { ...v, isHidden: !v.isHidden } : v
      )
    );
  };

  const handleUpdateSizeShortDetails = (colorName: string, sizeName: string, shortDetails: string) => {
    setVariationsMatrix((prev) =>
      prev.map((v) =>
        v.colorName === colorName && v.size === sizeName ? { ...v, shortDetails } : v
      )
    );
  };

  const handleFinalSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSaveError(null);

    if (!formData.category) {
      setSaveError('Pick a category first — none are loaded yet.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.name?.trim()) {
      setSaveError('Please enter a product title / name in Step 1.');
      setWizardStep(1);
      setIsSubmitting(false);
      return;
    }

    try {
      // Aggregate all images across all color variations for global product images array
      const allAggregatedImages: string[] = [];
      colorVariations.forEach((c) => {
        if (c.images.length > 0) {
          const cover = c.images[c.mainImageIndex || 0] || c.images[0];
          if (!allAggregatedImages.includes(cover)) {
            allAggregatedImages.push(cover);
          }
          c.images.forEach((img) => {
            if (!allAggregatedImages.includes(img)) {
              allAggregatedImages.push(img);
            }
          });
        }
      });

      // Map color variations for storing in DB
      const formattedColors: ProductColor[] = colorVariations.map((c, i) => ({
        name: c.name,
        hex: c.hex,
        imageIndex: i,
        images: c.images
      }));

      const features = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const careInstructions = formData.careText
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

      const aggregatedSizes = Array.from(
        new Set(variationsMatrix.map((v) => v.size).filter(Boolean))
      );
      const totalStockFromMatrix = variationsMatrix.reduce((sum, v) => sum + v.stock, 0);

      const varPrices = variationsMatrix
        .filter((v) => !v.isHidden)
        .map((v) => v.price)
        .filter((p): p is number => typeof p === 'number' && p > 0);
      const derivedPrice = varPrices.length > 0 ? Math.min(...varPrices) : (formData.price || 0);

      const varBuyingPrices = variationsMatrix
        .filter((v) => !v.isHidden)
        .map((v) => v.buyingPrice)
        .filter((bp): bp is number => typeof bp === 'number' && bp > 0);
      const derivedBuyingPrice = varBuyingPrices.length > 0 ? Math.min(...varBuyingPrices) : (formData.buyingPrice || 0);

      // Field-by-field, not `...formData`: the spread also carried `featuresText`
      // and `careText`, which are textarea scratch state with no column behind
      // them — Prisma rejects unknown fields, so the whole save 500'd.
      const saved = await onSaveProduct({
        name: formData.name,
        code: formData.code || undefined,
        category: formData.category,
        subCategory: formData.subCategory || undefined,
        price: derivedPrice,
        buyingPrice: derivedBuyingPrice,
        originalPrice: formData.originalPrice,
        workType: formData.workType,
        occasion: formData.occasion,
        material: formData.material,
        weather: formData.weather || undefined,
        isNew: formData.isNew,
        description: formData.description,
        colors: formattedColors,
        sizes: aggregatedSizes.length > 0 ? aggregatedSizes : ['Free Size'],
        images: allAggregatedImages.length > 0 ? allAggregatedImages : ['https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80'],
        variations: variationsMatrix,
        stock: totalStockFromMatrix > 0 ? totalStockFromMatrix : formData.stock,
        features,
        careInstructions,
        freeDeliveryQuantity: formData.freeDeliveryQuantity || undefined
      });

      // Only close on a confirmed write — otherwise the admin loses the whole form.
      if (saved) {
        onClose();
      } else {
        setSaveError('The store rejected this product. See the error notification for details.');
      }
    } catch (err) {
      setSaveError((err as Error).message || 'Unexpected error while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountPercentage = Math.round(
    ((formData.originalPrice - formData.price) / formData.originalPrice) * 100
  );

  // Determine cover image for live preview
  const currentPreviewColor = colorVariations[previewColorIndex] || colorVariations[0];
  const livePreviewImage = currentPreviewColor?.images[currentPreviewColor?.mainImageIndex || 0] || currentPreviewColor?.images[0] || 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="fixed h-full inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-6xl w-full h-full flex flex-col shadow-2xl relative text-stone-900 overflow-hidden">

        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 shrink-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#9B050B]/10 text-[#9B050B] rounded-xl border border-[#9B050B]/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900">
                {editingProduct ? 'Edit Product Item' : 'Color-Wise Variation & Product Builder'}
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                Upload images color-wise, pick color hex/name from photos with Eyedropper, & build size matrix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-stone-100 border border-stone-200 rounded-xl text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Wizard Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 text-xs font-bold scrollbar-none">
            {[
              { step: 1, label: '1. Basic Info', icon: Package },
              { step: 2, label: '2. Attributes & Occasion', icon: Tag },
              { step: 3, label: '3. Pricing & Stock', icon: DollarSign },
              { step: 4, label: '4. Colors & Photos', icon: Palette },
              { step: 5, label: '5. Features & Care', icon: Sparkles }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = wizardStep === tab.step;
              return (
                <button
                  key={tab.step}
                  type="button"
                  onClick={() => setWizardStep(tab.step as any)}
                  className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${isActive
                    ? 'bg-stone-900 text-white shadow-sm font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Split Screen Layout: Form Controls (Left) + Live Storefront Preview (Right) */}
          <div className="grid grid-cols-1 gap-8 items-start">

            {/* Left Column (7 cols): Step Form Controls */}
            <div className="h-full lg:col-span-7 space-y-6">
              <div className="space-y-6 text-xs font-sans">

                {/* STEP 1: BASIC INFO */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-bold text-stone-700">Product Title / Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Royal Emerald Silk Embroidered Abaya"
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-stone-700">SKU / Style Code</label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="FLK-AB-001"
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>
                    </div>

                    {categoriesError && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
                        Could not load categories: {categoriesError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Main Category *</label>
                      <select
                        value={formData.category}
                        disabled={categoriesLoading || mainCategories.length === 0}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-60"
                      >
                        {mainCategories.length === 0 ? (
                          <option value="">
                            {categoriesLoading ? 'Loading categories…' : 'No categories — create one in the Categories tab'}
                          </option>
                        ) : (
                          mainCategories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <label className="flex items-center gap-3 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isNew}
                        onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                        className="w-4 h-4 accent-stone-900"
                      />
                      <span className="font-bold text-stone-700">
                        Flag as New — shows the &ldquo;NEW&rdquo; badge on the storefront
                      </span>
                    </label>

                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Detailed Description</label>
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: ATTRIBUTES & OCCASION */}
                {wizardStep === 2 && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                      <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-700" /> Dynamic Attributes & Occasion Selection
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Search or pick attributes dynamically. Click any field to search existing values or type a custom entry.
                      </p>
                    </div> */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SearchableAttributeSelect
                        label="Target Occasion"
                        value={formData.occasion}
                        onChange={(val) => setFormData({ ...formData, occasion: val })}
                        options={allOccasionOptions}
                        dynamicOptions={dynamicOccasionCategories.map((c) => c.name)}
                        placeholder="Select or type occasion..."
                      />

                      <SearchableAttributeSelect
                        label="Material Fabric"
                        value={formData.material}
                        onChange={(val) => setFormData({ ...formData, material: val })}
                        options={materialOptions}
                        placeholder="Select or type fabric..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SearchableAttributeSelect
                        label="Season / Weather"
                        value={formData.weather}
                        onChange={(val) => setFormData({ ...formData, weather: val })}
                        options={weatherOptions}
                        placeholder="Select or type season..."
                      />

                      <SearchableAttributeSelect
                        label="Work Type & Detailing"
                        value={formData.workType}
                        onChange={(val) => setFormData({ ...formData, workType: val })}
                        options={workTypeOptions}
                        placeholder="Select or type detailing..."
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: PRICING & INVENTORY */}
                {wizardStep === 3 && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold">
                        ৳
                      </div>
                      <div>
                        <p className="font-extrabold text-stone-900 text-xs">Variation-Based Pricing Active</p>
                        <p className="text-stone-600 text-[11px] mt-0.5">
                          Sale prices and buying costs are now set per color & size variation in <strong>Step 4 (Variations & Sizes)</strong>. The product base display price will automatically be calculated from your variation prices.
                        </p>
                      </div>
                    </div>

                    {/* <div className="max-w-xs space-y-1.5">
                      <label className="font-bold text-stone-700">Original Strikethrough Price (৳ BDT)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                        placeholder="Optional MSRP / Strikethrough price"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-mono text-base focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div> */}

                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Default Total Stock Quantity</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                      <p className="text-[10px] text-stone-500">
                        Note: Setting color/size variation stock in Step 4 automatically updates the total stock.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Free Delivery Quantity (Buy X → Free Delivery)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.freeDeliveryQuantity || ''}
                        onChange={(e) => setFormData({ ...formData, freeDeliveryQuantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                      <p className="text-[10px] text-stone-500">
                        e.g. 3 = buying 3 or more pieces of this product makes delivery FREE. Leave empty or 0 to disable.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 4: COLOR-WISE VARIATION & IMAGE UPLOAD */}
                {wizardStep === 4 && (
                  <div className="space-y-6 animate-in fade-in">


                    {/* 2. Color Variations Cards matching exact wireframe sketch */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-extrabold text-stone-900 text-sm block">
                            Color Variations ({colorVariations.length})
                          </label>
                          <span className="text-xs text-stone-500 font-mono">
                            Configure images, sizes, stock, & prices color-wise
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddNewColorRow}
                          className="px-4 py-2 bg-[#9B050B] hover:bg-[#800409] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Color Variation</span>
                        </button>
                      </div>

                      {colorVariations.map((colorVar, cIdx) => (
                        <div
                          key={colorVar.id}
                          className="p-4 sm:p-5 bg-white border-2 border-stone-800 rounded-3xl shadow-sm space-y-4 relative group"
                        >
                          {/* Card Layout: Left Square Image Box + Right Inputs */}
                          <div className="grid grid-cols-12 gap-4 items-start">

                            {/* Left: Rounded Square Image Thumbnail & Uploader */}
                            <div className="col-span-12 sm:col-span-4 space-y-2">
                              <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-stone-400 bg-stone-50 overflow-hidden flex flex-col items-center justify-center text-center group/img hover:border-stone-900 transition-all">
                                {uploadingColorId === colorVar.id && (
                                  <div className="absolute inset-0 z-20 bg-stone-900/60 flex flex-col items-center justify-center gap-2">
                                    <span className="w-8 h-8 border-3 border-stone-300 border-t-white rounded-full animate-spin" />
                                    <span className="text-[11px] font-black text-white font-mono uppercase tracking-wider">
                                      Uploading to Cloud…
                                    </span>
                                  </div>
                                )}
                                {colorVar.images.length > 0 ? (
                                  <>
                                    <Image
                                      src={colorVar.images[colorVar.mainImageIndex || 0] || colorVar.images[0]}
                                      alt={colorVar.name}
                                      fill
                                      className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                      <span className="text-[11px] font-mono font-bold text-white bg-stone-900/80 px-2 py-0.5 rounded-md">
                                        {colorVar.images.length} Photos
                                      </span>
                                      <label className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-900 text-xs font-black rounded-xl cursor-pointer shadow-md transition-transform active:scale-95">
                                        Upload More
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          onChange={(e) => handleColorFileUpload(colorVar.id, e)}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>
                                  </>
                                ) : (
                                  <label className="w-full h-full flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-100/80 transition-colors">
                                    <Upload className="w-7 h-7 text-[#9B050B] mb-1" />
                                    <span className="font-extrabold text-xs text-stone-900">Upload Image</span>
                                    <span className="text-[10px] text-stone-500 font-mono">Click to browse</span>
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*"
                                      onChange={(e) => handleColorFileUpload(colorVar.id, e)}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>

                            </div>

                            {/* Right: Color Name, Color Code, Stock & Size Manager */}
                            <div className="col-span-12 sm:col-span-8 space-y-3">
                              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                                <span className="text-xs font-black text-stone-900 font-mono uppercase tracking-wider">
                                  Color Variant #{cIdx + 1}
                                </span>
                                {colorVariations.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorVariation(colorVar.id)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                    title="Remove Color Variant"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* 1. Color Name */}
                              <div className="space-y-1">
                                <label className="font-extrabold text-stone-900 text-xs flex items-center justify-between">
                                  <span>Color Name</span>
                                  <span className="text-[10px] text-stone-400 font-normal font-sans">(e.g. Obsidian Black)</span>
                                </label>
                                <input
                                  type="text"
                                  value={colorVar.name}
                                  onChange={(e) => handleUpdateColorName(colorVar.id, e.target.value)}
                                  placeholder="Color Name"
                                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-serif font-bold text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                                />
                              </div>

                              {/* 2. Color Code */}
                              <div className="space-y-1">
                                <label className="font-extrabold text-stone-900 text-xs flex items-center justify-between">
                                  <span>Color Code</span>
                                  <span className="text-[10px] text-stone-400 font-normal font-mono">(Hex Code)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-stone-400 shadow-2xs shrink-0">
                                    <input
                                      type="color"
                                      value={colorVar.hex}
                                      onChange={(e) => handleUpdateColorHex(colorVar.id, e.target.value)}
                                      className="absolute -inset-2 w-14 h-14 cursor-pointer"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={colorVar.hex}
                                    onChange={(e) => handleUpdateColorHex(colorVar.id, e.target.value)}
                                    placeholder="Color Code (#000000)"
                                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 uppercase"
                                  />
                                  {colorVar.images.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEyedropperForColor(colorVar.id, colorVar.images[0])}
                                      className="p-2.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-xl border border-stone-300 transition-colors shrink-0 cursor-pointer"
                                      title="Pick exact color hex from photo to update this color variation"
                                    >
                                      <Pipette className="w-4 h-4 text-amber-600" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Sizes & Stock Manager for this Color Variation */}
                              <div className="space-y-3 pt-3 border-t border-stone-200">
                                <div className="flex items-center justify-between">
                                  <label className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
                                    <span>Sizes & Stock for {colorVar.name}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-mono font-bold">
                                      {variationsMatrix.filter((v) => v.colorName === colorVar.name).length} sizes
                                    </span>
                                  </label>
                                </div>

                                {/* Quick Size Presets Chips */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                                    Quick Size Presets:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {['52', '54', '56', '58', '60', 'S', 'M', 'L', 'XL', 'Free Size'].map((chip) => {
                                      const isAdded = variationsMatrix.some(
                                        (v) => v.colorName === colorVar.name && v.size.toLowerCase() === chip.toLowerCase()
                                      );
                                      return (
                                        <button
                                          key={chip}
                                          type="button"
                                          onClick={() => {
                                            if (isAdded) {
                                              handleRemoveSizeFromVariation(colorVar.name, chip);
                                            } else {
                                              handleAddSizeToVariation(colorVar.name, colorVar.hex, chip);
                                            }
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer font-mono ${isAdded
                                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                                            }`}
                                        >
                                          {chip} {isAdded ? '✓' : '+'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Active Sizes List with Stock & Price Inputs */}
                                <div className="space-y-2">
                                  {variationsMatrix.filter((v) => v.colorName === colorVar.name).length === 0 ? (
                                    <p className="text-xs italic text-stone-400">
                                      No sizes added for this color yet. Click a preset above or type a size below to add.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {variationsMatrix
                                        .filter((v) => v.colorName === colorVar.name)
                                        .map((v) => (
                                          <div
                                            key={v.id || `${v.colorName}-${v.size}`}
                                            className={`p-3 border rounded-xl space-y-2.5 shadow-2xs transition-all ${v.isHidden
                                              ? 'bg-amber-50/70 border-amber-300 opacity-85'
                                              : 'bg-stone-50 border-stone-200'
                                              }`}
                                          >
                                            {/* Header Row: Size Name, Status Pill, and Actions */}
                                            <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-1.5">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-xs font-black font-mono text-stone-900 uppercase truncate">
                                                  Size: {v.size}
                                                </span>
                                                {v.isHidden ? (
                                                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                                                    Hidden
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                                                    Visible
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleVariationVisibility(colorVar.name, v.size)}
                                                  className={`p-1 rounded-lg transition-colors cursor-pointer ${v.isHidden
                                                    ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                                                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300 hover:text-stone-900'
                                                    }`}
                                                  title={v.isHidden ? 'Click to Show Variation on Storefront' : 'Click to Hide Variation from Storefront'}
                                                >
                                                  {v.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveSizeFromVariation(colorVar.name, v.size)}
                                                  className="w-5 h-5 rounded-full bg-stone-200 hover:bg-rose-500 hover:text-white text-stone-600 flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                                                  title={`Remove ${v.size} size`}
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            </div>

                                            {/* 4-Column Inputs Row: Stock, Price, Cost, Original Price */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                              <div>
                                                <label className="block text-[9px] font-black text-stone-600 mb-0.5 uppercase tracking-wider truncate">
                                                  Stock
                                                </label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={v.stock}
                                                  onChange={(e) =>
                                                    handleUpdateSizeStock(colorVar.name, v.size, Number(e.target.value))
                                                  }
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[9px] font-black text-stone-600 mb-0.5 uppercase tracking-wider truncate">
                                                  Price (৳)
                                                </label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={v.price !== undefined ? v.price : ''}
                                                  onChange={(e) =>
                                                    handleUpdateSizePrice(
                                                      colorVar.name,
                                                      v.size,
                                                      e.target.value === '' ? undefined : Number(e.target.value)
                                                    )
                                                  }
                                                  placeholder="0"
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[9px] font-black text-stone-600 mb-0.5 uppercase tracking-wider truncate">
                                                  Cost (৳)
                                                </label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={v.buyingPrice !== undefined ? v.buyingPrice : ''}
                                                  onChange={(e) =>
                                                    handleUpdateSizeBuyingPrice(
                                                      colorVar.name,
                                                      v.size,
                                                      e.target.value === '' ? undefined : Number(e.target.value)
                                                    )
                                                  }
                                                  placeholder="0"
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[9px] font-black text-stone-600 mb-0.5 uppercase tracking-wider truncate">
                                                  Original (৳)
                                                </label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={v.originalPrice !== undefined ? v.originalPrice : ''}
                                                  onChange={(e) =>
                                                    handleUpdateSizeOriginalPrice(
                                                      colorVar.name,
                                                      v.size,
                                                      e.target.value === '' ? undefined : Number(e.target.value)
                                                    )
                                                  }
                                                  placeholder="0"
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Add Custom Size Input */}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  value={variationSizeInputs[colorVar.name] || ''}
                                  onChange={(e) =>
                                    setVariationSizeInputs((prev) => ({
                                      ...prev,
                                      [colorVar.name]: e.target.value
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSizeToVariation(
                                        colorVar.name,
                                        colorVar.hex,
                                        variationSizeInputs[colorVar.name] || ''
                                      );
                                    }
                                  }}
                                  placeholder="Add custom size (e.g. 52, 54, S, M, XL, Free Size)..."
                                  className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddSizeToVariation(
                                      colorVar.name,
                                      colorVar.hex,
                                      variationSizeInputs[colorVar.name] || ''
                                    )
                                  }
                                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                                >
                                  + Add Size
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Extra Photo Thumbnails Row */}
                          {colorVar.images.length > 0 && (
                            <div className="pt-3 border-t border-stone-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-500 font-mono">
                                  Gallery Photos ({colorVar.images.length} photo{colorVar.images.length > 1 ? 's' : ''})
                                </span>
                                <span className="text-[10px] text-stone-400">Click photo to set as cover image</span>
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {colorVar.images.map((img, imgIdx) => {
                                  const isMain = (colorVar.mainImageIndex || 0) === imgIdx;
                                  return (
                                    <div
                                      key={imgIdx}
                                      className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 group ${isMain ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-stone-300'
                                        }`}
                                    >
                                      <Image src={img} alt={`${colorVar.name} ${imgIdx}`} fill className="object-cover" />
                                      {isMain ? (
                                        <div className="absolute top-0.5 left-0.5 px-1 bg-amber-400 text-stone-950 font-black text-[8px] rounded shadow-xs">
                                          Cover
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleSetColorMainImage(colorVar.id, imgIdx)}
                                          className="absolute inset-0 bg-stone-900/60 text-white font-bold text-[9px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                        >
                                          Set Cover
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveColorImage(colorVar.id, imgIdx)}
                                        className="absolute top-0.5 right-0.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg z-10 shadow-xs cursor-pointer"
                                        title="Delete Photo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Bottom Button: [ Add More Color Variation ] */}
                      <button
                        type="button"
                        onClick={handleAddNewColorRow}
                        className="w-full py-3 bg-white hover:bg-stone-50 text-stone-900 border-2 border-dashed border-stone-300 hover:border-stone-900 font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Plus className="w-4 h-4 text-[#9B050B]" />
                        <span>Add More Color Variation</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: FEATURES & CARE */}
                {wizardStep === 5 && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Key Features (One per line)</label>
                      <textarea
                        rows={4}
                        value={formData.featuresText}
                        onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                        placeholder="Premium modest tailoring&#10;Breathable fabric&#10;Includes matching scarf"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Care Instructions (One per line)</label>
                      <textarea
                        rows={4}
                        value={formData.careText}
                        onChange={(e) => setFormData({ ...formData, careText: e.target.value })}
                        placeholder="Dry clean recommended&#10;Steam iron on low heat"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}

                {/* Save failure banner — sits by the submit button, on every step */}
                {saveError && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
                    {saveError}
                  </div>
                )}

                {/* Wizard Navigation Footer */}
                <div className="pt-4 flex items-center justify-between border-t border-stone-200">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep - 1) as any)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous Step
                    </button>
                  ) : <div />}

                  {wizardStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep + 1) as any)}
                      className="px-5 py-2.5 bg-stone-900 text-white font-extrabold rounded-xl hover:bg-stone-800 flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#9B050B] to-[#C71B20] text-white font-black rounded-xl shadow-lg hover:from-[#B8000A] hover:to-[#E0242A] cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving Item...' : editingProduct ? 'Update Product Item' : 'Publish Product to Store'}
                    </button>
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Eyedropper Modal */}
      {eyedropperImageUrl && (
        <ImageColorPickerModal
          isOpen={!!eyedropperImageUrl}
          onClose={() => setEyedropperImageUrl(null)}
          imageUrl={eyedropperImageUrl}
          onSelectColor={handleEyedropperColorSelected}
        />
      )}
    </div>
  );
}
