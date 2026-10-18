'use client';

/**
 * OrderDetailsModal.tsx — full order details overlay for the admin orders table.
 *
 * Opened by clicking an order ID in OrdersTab. Shows customer, shipping,
 * payment, line items and totals, plus inline actions (status pipeline,
 * manual payment verification, print receipt, and Pathao dispatch configuration modal).
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Phone,
  MapPin,
  User,
  CreditCard,
  ShoppingBag,
  Calendar,
  Truck,
  Tag,
  Package,
  ExternalLink,
  Loader2,
  AlertCircle,
  Zap,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { OrderRecord } from '@/context/CartContext';
import { formatCurrency, getProductVariationPrice, getProductVariationImage, getProductVariationColorHex } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/orderStatuses';
import { getSearchableTerms, calculateShippingFee } from '@/lib/shipping/locationBilingual';
import { useToast } from '@/components/ui/Toast';

interface OrderDetailsModalProps {
  order: OrderRecord;
  onClose: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderRecord['status']) => void;
  onUpdatePaymentStatus: (orderId: string, paymentStatus: string) => void;
  onPrintReceipt: (order: OrderRecord) => void;
}

const STATUS_OPTIONS: OrderRecord['status'][] = [...ORDER_STATUSES];

function statusBadgeStyle(status: OrderRecord['status']) {
  switch (status) {
    case 'Delivered':
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Shipped':
    case 'Out for Delivery':
    case 'Ready for Shipment':
    case 'Packed':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'Confirmed':
    case 'Processing':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Pending':
    case 'Payment Pending':
    case 'Refund Processing':
    case 'Return Requested':
    case 'On Hold':
    case 'Quality Checked':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Cancelled':
    case 'Payment Failed':
    case 'Failed Delivery':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'Returned':
    case 'Refunded':
      return 'bg-stone-200 text-stone-800 border-stone-400';
    default:
      return 'bg-stone-100 text-stone-800 border-stone-300';
  }
}

/**
 * AdminSearchableSelect — Interactive searchable select dropdown for City, Zone, and Area
 * supporting both English and Bengali fuzzy search.
 */
function AdminSearchableSelect({
  label,
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  loading = false,
}: {
  label: string;
  id: string;
  options: Array<{ value: number; label: string }>;
  value: number | null;
  onChange: (val: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((o) => {
      const terms = getSearchableTerms(o.label);
      return terms.some((t) => t.toLowerCase().includes(q));
    });
  }, [options, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1 relative">
      <label htmlFor={id} className="block text-[11px] font-bold text-stone-700 flex items-center justify-between">
        <span>
          {label} {required && <span className="text-rose-600">*</span>}
          {loading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-rose-600" />}
        </span>
        {selectedOption && <span className="text-[10px] text-emerald-600 font-semibold">✓</span>}
      </label>

      <button
        type="button"
        id={id}
        disabled={disabled || loading}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchQuery('');
        }}
        className={`w-full min-h-[40px] px-3 bg-white border rounded-xl text-xs text-left flex items-center justify-between gap-2 transition-all ${isOpen
            ? 'border-rose-600 ring-2 ring-rose-600/20 shadow-xs'
            : 'border-stone-200 hover:border-stone-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${selectedOption ? 'font-bold text-stone-900' : 'text-stone-400'}`}>
          {loading ? 'Loading options…' : selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-rose-600' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-70 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                placeholder={`Search ${label.toLowerCase()} (EN/বাংলা)…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-3 pr-7 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-600 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-stone-50 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-stone-400 text-[11px] font-medium">
                No matching option found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${isSelected
                        ? 'bg-rose-50 text-rose-900 font-bold'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PathaoDispatchModal — Modal for configuring & customizing Pathao Courier shipment details
 * before dispatching the order to Pathao Courier API.
 */
interface PathaoDispatchModalProps {
  order: OrderRecord;
  onClose: () => void;
  onSuccess: (consignmentId: string, updatedOrder?: any) => void;
}

function PathaoDispatchModal({ order, onClose, onSuccess }: PathaoDispatchModalProps) {
  const sh = order.shippingAddress ?? {};
  const totalItemsCount = order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);

  // Pre-fill Customer Details
  const [recipientName, setRecipientName] = useState(sh.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState(sh.phone || '');
  const [recipientAddress, setRecipientAddress] = useState(sh.fullAddress || sh.street || '');

  // Pathao Locations State
  const [cities, setCities] = useState<Array<{ city_id: number; city_name: string }>>([]);
  const [zones, setZones] = useState<Array<{ zone_id: number; zone_name: string }>>([]);
  const [areas, setAreas] = useState<Array<{ area_id: number; area_name: string }>>([]);

  const [selectedCityId, setSelectedCityId] = useState<number | null>(sh.pathaoCityId || 1);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(sh.pathaoZoneId || null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(sh.pathaoAreaId || null);

  // Pathao Courier Options
  const [deliveryType, setDeliveryType] = useState<number>(48); // 48: Normal (48h), 12: Express / On-Demand (12h)
  const [itemType, setItemType] = useState<number>(2); // 2: Parcel, 1: Document
  const [itemQuantity, setItemQuantity] = useState<number>(Math.max(1, totalItemsCount));
  const [itemWeight, setItemWeight] = useState<number>(0.5);

  const isPrepaid =
    order.paymentMethod?.toLowerCase().includes('bkash') &&
    order.paymentStatus === 'Verified';

  const [amountToCollect, setAmountToCollect] = useState<number>(isPrepaid ? 0 : order.total);
  const [itemDescription, setItemDescription] = useState<string>(`Order ${order.id} - ${totalItemsCount} item(s)`);
  const [specialInstruction, setSpecialInstruction] = useState<string>('Handle with care. Call recipient before delivery.');

  // UI Loading & Quote States
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Load Pathao Cities
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        const res = await fetch('/api/shipping/pathao/cities');
        const data = await res.json();
        if (data.success && Array.isArray(data.cities)) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('Failed to load Pathao cities:', err);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Fetch Zones when City changes
  useEffect(() => {
    if (!selectedCityId) {
      setZones([]);
      setSelectedZoneId(null);
      return;
    }
    const fetchZones = async () => {
      setIsLoadingZones(true);
      try {
        const res = await fetch(`/api/shipping/pathao/zones?cityId=${selectedCityId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.zones)) {
          setZones(data.zones);
          if (!selectedZoneId || !data.zones.some((z: any) => z.zone_id === selectedZoneId)) {
            setSelectedZoneId(data.zones.length > 0 ? data.zones[0].zone_id : null);
          }
        }
      } catch (err) {
        console.error('Failed to load Pathao zones:', err);
      } finally {
        setIsLoadingZones(false);
      }
    };
    fetchZones();
  }, [selectedCityId]);

  // Fetch Areas when Zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setAreas([]);
      setSelectedAreaId(null);
      return;
    }
    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const res = await fetch(`/api/shipping/pathao/areas?zoneId=${selectedZoneId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.areas)) {
          setAreas(data.areas);
          if (!selectedAreaId || !data.areas.some((a: any) => a.area_id === selectedAreaId)) {
            setSelectedAreaId(data.areas.length > 0 ? data.areas[0].area_id : null);
          }
        }
      } catch (err) {
        console.error('Failed to load Pathao areas:', err);
      } finally {
        setIsLoadingAreas(false);
      }
    };
    fetchAreas();
  }, [selectedZoneId]);

  // Fetch Live Price Quote Preview
  useEffect(() => {
    if (!selectedCityId || !selectedZoneId) return;

    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      try {
        const res = await fetch('/api/shipping/pathao/price-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cityId: selectedCityId,
            zoneId: selectedZoneId,
            areaId: selectedAreaId || undefined,
            weight: itemWeight,
            deliveryType,
            itemType,
          }),
        });
        const data = await res.json();
        if (data.success && data.quote) {
          setEstimatedFee(data.quote.final_price);
        }
      } catch (err) {
        console.error('Failed to calculate price quote:', err);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    fetchQuote();
  }, [selectedCityId, selectedZoneId, selectedAreaId, itemWeight, deliveryType, itemType]);

  const selectedCityObj = cities.find((c) => c.city_id === selectedCityId);
  const selectedZoneObj = zones.find((z) => z.zone_id === selectedZoneId);
  const selectedAreaObj = areas.find((a) => a.area_id === selectedAreaId);

  const localTierFee = useMemo(() => {
    return calculateShippingFee({
      city: selectedCityObj?.city_name || sh.city,
      address: recipientAddress,
      zoneName: selectedZoneObj?.zone_name,
      areaName: selectedAreaObj?.area_name,
    });
  }, [selectedCityObj, selectedZoneObj, selectedAreaObj, recipientAddress, sh.city]);

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCityId || !selectedZoneId) {
      setDispatchError('Please select a valid Pathao City and Zone.');
      return;
    }

    setIsSubmitting(true);
    setDispatchError(null);

    const selectedCityObj = cities.find((c) => c.city_id === selectedCityId);
    const selectedZoneObj = zones.find((z) => z.zone_id === selectedZoneId);
    const selectedAreaObj = areas.find((a) => a.area_id === selectedAreaId);

    try {
      const res = await fetch('/api/admin/orders/dispatch-pathao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          recipientName,
          recipientPhone,
          recipientAddress,
          recipientCityId: selectedCityId,
          recipientZoneId: selectedZoneId,
          recipientAreaId: selectedAreaId || undefined,
          recipientCityName: selectedCityObj?.city_name || undefined,
          recipientZoneName: selectedZoneObj?.zone_name || undefined,
          recipientAreaName: selectedAreaObj?.area_name || undefined,
          deliveryType,
          itemType,
          itemQuantity,
          itemWeight,
          amountToCollect,
          itemDescription,
          specialInstruction,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.consignmentId, data.order);
      } else {
        setDispatchError(data.error || 'Failed to dispatch order to Pathao Courier');
      }
    } catch (err: any) {
      setDispatchError(err.message || 'Network error while dispatching to Pathao Courier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-5 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header - Improved Mobile Layout */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-rose-950 via-rose-900 to-stone-900 text-white flex items-start justify-between gap-3 shadow-sm shrink-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-800/80 border border-rose-700/50 flex items-center justify-center text-rose-200 font-bold shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <Truck className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-stone-100 truncate">
                  Configure Pathao Dispatch
                </h3>
                <span className="px-2 py-0.5 bg-rose-500/30 text-rose-200 text-[10px] font-mono font-bold rounded-full border border-rose-400/40 uppercase shrink-0">
                  #{order.id}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-rose-200/80 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-none">
                Verify recipient information, location IDs, and Pathao delivery speed options.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-rose-200 hover:text-white rounded-full hover:bg-rose-800/50 transition-colors shrink-0 -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleConfirmDispatch} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {dispatchError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Dispatch Error</p>
                <p className="mt-0.5">{dispatchError}</p>
              </div>
            </div>
          )}

          {/* Customer / Recipient Info */}
          <section className="bg-stone-50/80 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-600" /> 1. Recipient Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-rose-600"
                  placeholder="Recipient Name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Phone Number (11 digits) *</label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-rose-600"
                  placeholder="01700000000"
                />
              </div>
            </div>
          </section>

          {/* Delivery Location Selectors (Searchable) */}
          <section className="bg-stone-50/80 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" /> 2. Delivery Location (Pathao Mapping)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Searchable City */}
              <AdminSearchableSelect
                label="Pathao City"
                id="modal-pathao-city"
                required
                loading={isLoadingCities}
                options={cities.map((c) => ({ value: c.city_id, label: c.city_name }))}
                value={selectedCityId}
                placeholder="-- Search City --"
                onChange={(val) => setSelectedCityId(val)}
              />

              {/* Searchable Zone */}
              <AdminSearchableSelect
                label="Pathao Zone / Sub-Area"
                id="modal-pathao-zone"
                required
                disabled={!selectedCityId}
                loading={isLoadingZones}
                options={zones.map((z) => ({ value: z.zone_id, label: z.zone_name }))}
                value={selectedZoneId}
                placeholder="-- Search Zone --"
                onChange={(val) => setSelectedZoneId(val)}
              />

              {/* Searchable Area */}
              <AdminSearchableSelect
                label="Pathao Area (Optional)"
                id="modal-pathao-area"
                disabled={!selectedZoneId || areas.length === 0}
                loading={isLoadingAreas}
                options={areas.map((a) => ({ value: a.area_id, label: a.area_name }))}
                value={selectedAreaId}
                placeholder="-- Search Area --"
                onChange={(val) => setSelectedAreaId(val)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Full Street Address *</label>
              <textarea
                rows={2}
                required
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                placeholder="House 12, Road 5, Sector 4, Uttara, Dhaka"
              />
            </div>
          </section>

          {/* Pathao Courier Options */}
          <section className="bg-stone-50/80 p-3.5 sm:p-4 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-600" /> 3. Pathao Delivery Options & Speed
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delivery Speed / Type */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Delivery Speed / Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType(48)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${deliveryType === 48
                        ? 'bg-rose-50 border-rose-600 text-[#9B050B] font-bold shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-rose-600" /> Standard
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">48 Hours</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType(12)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${deliveryType === 12
                        ? 'bg-rose-50 border-rose-600 text-[#9B050B] font-bold shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Express / On Demand
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">12 Hours</span>
                  </button>
                </div>
              </div>

              {/* Item Type */}
              {/* <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Shipment Item Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType(2)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      itemType === 2
                        ? 'bg-rose-50 border-rose-600 text-[#9B050B] font-bold shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold">
                      <Package className="w-3.5 h-3.5 text-rose-600" /> Parcel
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Apparel / Goods</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemType(1)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      itemType === 1
                        ? 'bg-rose-50 border-rose-600 text-[#9B050B] font-bold shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold">
                      <FileText className="w-3.5 h-3.5 text-stone-600" /> Document
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Paperwork Only</span>
                  </button>
                </div>
              </div> */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Item Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Package Weight (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={10}
                  required
                  value={itemWeight}
                  onChange={(e) => setItemWeight(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Amount to Collect (COD ৳)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={amountToCollect}
                  onChange={(e) => setAmountToCollect(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-rose-600"
                />
                {isPrepaid && <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ Verified bKash Prepaid (0 ৳ COD)</span>}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Special Delivery Instructions</label>
              <input
                type="text"
                value={specialInstruction}
                onChange={(e) => setSpecialInstruction(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                placeholder="e.g. Call recipient before delivery, deliver in afternoon"
              />
            </div>
          </section>

          {/* Live Estimated Fee Banner & Actions */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
            <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 flex items-center gap-3">
              <Truck className="w-5 h-5 text-rose-700 shrink-0" />
              <div>
                <p className="text-[10px] font-mono font-bold uppercase text-stone-500">Calculated Delivery Rate</p>
                <p className="text-xs font-black text-stone-900 font-mono flex items-center flex-wrap gap-1.5">
                  <span>৳ {localTierFee.fee} BDT</span>
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md border border-rose-200">
                    {localTierFee.reason}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-stone-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedCityId || !selectedZoneId}
                className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching…
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" /> Confirm & Dispatch to Pathao
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrderDetailsModal({
  order,
  onClose,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
  onPrintReceipt,
}: OrderDetailsModalProps) {
  const { showToast } = useToast();
  const [isPathaoModalOpen, setIsPathaoModalOpen] = useState(false);

  /* ESC to close + lock body scroll while open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPathaoModalOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, isPathaoModalOpen]);

  const sh = order.shippingAddress ?? {
    fullName: 'Valued Customer',
    phone: 'N/A',
    street: '',
    city: '',
    district: '',
    fullAddress: '',
  };

  const isManualBkash = order.paymentMethod === 'bKash Send Money (Manual)';
  const isPendingPayment = isManualBkash && order.paymentStatus === 'Pending';
  const paymentStatusLabel = order.paymentStatus || (isManualBkash ? 'Pending' : 'Verified');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-50 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9B050B]/10 text-[#9B050B] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base text-stone-900">
                  Order Details #{order.id}
                </h2>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${statusBadgeStyle(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-stone-400" />
                {new Date(order.date || order.createdAt || Date.now()).toLocaleString('en-BD', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Customer / Shipping / Payment grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Customer
              </p>
              <p className="font-bold text-sm text-stone-900">{sh.fullName}</p>
              <p className="text-[11px] text-stone-600 font-mono flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-stone-400" /> {sh.phone}
              </p>
            </div>

            {/* Shipping address */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Shipping Address
              </p>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                {sh.fullAddress || sh.street || '—'}
              </p>
              <p className="text-[11px] text-stone-600 font-semibold">
                {[sh.city, sh.district, sh.country || 'Bangladesh'].filter(Boolean).join(', ')}
                {sh.postalCode ? ` ${sh.postalCode}` : ''}
              </p>
              {(order.deliveryZone || order.deliverySubArea || sh.pathaoZoneName || sh.pathaoAreaName) && (
                <div className="pt-1.5 border-t border-stone-100 space-y-1">
                  <p className="text-[10px] text-stone-500 flex items-center gap-1.5 font-bold">
                    <Truck className="w-3 h-3 text-[#9B050B]" /> Delivery Zone / Sub-Area:
                  </p>
                  <span className="inline-block px-2.5 py-1 bg-rose-50 border border-rose-200 text-[#9B050B] rounded-lg text-[10px] font-bold">
                    {[
                      sh.pathaoCityName || sh.city,
                      sh.pathaoZoneName || order.deliveryZone,
                      sh.pathaoAreaName || order.deliverySubArea
                    ]
                      .filter(Boolean)
                      .join(' › ')}
                  </span>
                </div>
              )}
              {order.consignmentId && (
                <div className="pt-1">
                  <a
                    href={`https://merchant.pathao.com/courier/orders/${order.consignmentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#9B050B] rounded-lg text-[11px] font-mono font-bold transition-colors group"
                    title="View order in Pathao Merchant Portal"
                  >
                    <Truck className="w-3 h-3 text-[#9B050B]" />
                    <span>Pathao: {order.consignmentId}</span>
                    <ExternalLink className="w-3 h-3 text-[#9B050B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payment
              </p>
              <p className="text-[11px] font-bold text-stone-900">
                {order.paymentMethod || 'Cash on Delivery'}
              </p>
              {isManualBkash && (
                <div className="text-[11px] text-stone-600 space-y-1 pt-0.5">
                  <p>
                    Sender: <span className="font-mono font-bold text-stone-900">{order.paymentSenderNumber || 'N/A'}</span>
                  </p>
                  <p>
                    TrxID: <span className="font-mono font-bold text-[#9B050B]">{order.paymentTrxId || 'N/A'}</span>
                  </p>
                </div>
              )}
              <p className="text-[11px] flex items-center gap-1.5">
                <span className="text-stone-500">Status:</span>
                <span
                  className={`font-black uppercase tracking-wide text-[10px] ${order.paymentStatus === 'Verified'
                      ? 'text-emerald-700'
                      : order.paymentStatus === 'Rejected'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                >
                  {paymentStatusLabel}
                </span>
              </p>
              {isPendingPayment && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(order.id, 'Verified')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors border border-emerald-800"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(order.id, 'Rejected')}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors border border-rose-800"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-stone-600" /> Ordered Items ({order.items?.length || 0})
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {order.items?.map((item: any, idx: number) => {
                const prod = item.product || {};
                const name = prod.name || 'Product';
                const price = getProductVariationPrice(prod, item.selectedColor, item.selectedSize);
                const lineTotal = price * (item.quantity || 1);
                const itemImg = getProductVariationImage(prod, item.selectedColor);
                const colorHex = getProductVariationColorHex(prod, item.selectedColor);

                return (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {itemImg && (
                        // eslint-disable-next-javascript-element-type/no-img-element
                        <img
                          src={itemImg}
                          alt={name}
                          className="w-11 h-13 object-cover rounded-lg border border-stone-200 shrink-0 shadow-2xs"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-stone-900 leading-snug">{name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-stone-600">
                          {item.selectedColor ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/90 text-stone-800 font-sans font-medium">
                              {colorHex && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: colorHex }}
                                  title={`${item.selectedColor} (${colorHex})`}
                                />
                              )}
                              <span>{item.selectedColor}</span>
                            </span>
                          ) : (
                            <span className="text-stone-400">N/A</span>
                          )}
                          {item.selectedSize && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="text-stone-500">{item.selectedSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <p className="font-bold text-stone-900">{formatCurrency(lineTotal)}</p>
                      <p className="text-[10px] text-stone-500">
                        {formatCurrency(price)} × {item.quantity || 1}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 max-w-sm ml-auto space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-stone-900">{formatCurrency(order.subtotal || 0)}</span>
            </div>
            {(order.discount || 0) > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span className="flex items-center gap-1 font-semibold">
                  <Tag className="w-3 h-3" /> Discount {order.promoCode ? `(${order.promoCode})` : ''}
                </span>
                <span className="font-mono font-bold">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-stone-600">
              <span>Shipping Fee</span>
              <span className="font-mono font-bold text-stone-900">
                {order.shippingFee === 0 ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Free Delivery
                  </span>
                ) : (
                  formatCurrency(order.shippingFee || 0)
                )}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-900 font-black text-sm">
              <span>Total</span>
              <span className="font-mono text-[#9B050B]">{formatCurrency(order.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-500 font-mono uppercase tracking-wider">
              Status:
            </span>
            <select
              value={order.status}
              onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderRecord['status'])}
              className={`border rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer ${statusBadgeStyle(order.status)}`}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st} className="bg-white text-stone-800">
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {order.consignmentId ? (
              <a
                href={`https://merchant.pathao.com/courier/orders/${order.consignmentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#9B050B] rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors group"
                title="Open order in Pathao Merchant Portal"
              >
                <Truck className="w-3.5 h-3.5 text-[#9B050B]" />
                <span>Pathao: {order.consignmentId}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9B050B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsPathaoModalOpen(true)}
                id={`btn-pathao-dispatch-${order.id}`}
                className="px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" /> Send to Pathao
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-stone-200"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onPrintReceipt(order)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#9B050B] hover:bg-[#800409] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Pathao Dispatch Modal Overlay */}
      {isPathaoModalOpen && (
        <PathaoDispatchModal
          order={order}
          onClose={() => setIsPathaoModalOpen(false)}
          onSuccess={(consignmentId) => {
            showToast({
              type: 'info',
              title: 'Dispatched to Pathao',
              subtitle: `Order successfully dispatched! Consignment ID: ${consignmentId}`
            });
            onUpdateOrderStatus(order.id, 'Shipped');
            setIsPathaoModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
