'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Download, Eye, Printer, Phone, MapPin, PlusCircle,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Copy, Check, Truck, Package, ShoppingBag, DollarSign, Clock, X, Loader2,
} from 'lucide-react';
import { OrderRecord } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/orderStatuses';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';

interface OrdersTabProps {
  onSelectOrderReceipt: (order: OrderRecord) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderRecord['status']) => void;
  onUpdatePaymentStatus: (orderId: string, paymentStatus: string) => void;
  onOpenCreateOrderModal?: () => void;
  /** Global search from the admin header — merged with the local search box. */
  searchQuery: string;
  /** Context order-feed length; a change (socket alert / POS order) refetches the page. */
  ordersFeedCount: number;
  /** Realtime arrivals (socket / POS) — prepended instantly, like the pre-pagination table. */
  incomingOrderSignal: { order: OrderRecord; seq: number } | null;
}

interface OrdersPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface OrdersCounts extends Record<string, number> {
  All: number;
  'Unverified Payments': number;
}

interface OrdersStats {
  totalOrders: number;
  pendingFulfillment: number;
  delivered: number;
  revenue: number;
}

type SortKey = 'date' | 'total';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [8, 16, 24];
const STATUS_PILLS = [
  'All',
  'Unverified Payments',
  'Pending Payment',
  'Processing',
  'On Hold',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled',
  'Refunded',
  'Failed',
] as const;

// ─── Small building blocks ────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'stone',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'stone' | 'amber' | 'emerald' | 'rose';
}) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-[#9B050B] border-rose-200',
  } as const;

  return (
    <div className="p-4 sm:p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2 hover:border-stone-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className={`w-8 h-8 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-mono font-bold text-xl sm:text-2xl text-stone-900 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-stone-500 font-medium truncate">{sub}</p>}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = activeKey === sortKey;
  return (
    <th className={`pb-3 pr-4 font-semibold whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-stone-900 transition-colors cursor-pointer ${isActive ? 'text-stone-900' : ''
          }`}
        title={`Sort by ${label.toLowerCase()}`}
      >
        <span>{label}</span>
        {isActive ? (
          dir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#9B050B]" /> : <ArrowDown className="w-3 h-3 text-[#9B050B]" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

function pageWindow(current: number, total: number, span = 5): (number | '…')[] {
  if (total <= span + 2) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, current - Math.floor((span - 2) / 2));
  const end = Math.min(total - 1, start + span - 3);
  const middle: number[] = [];
  for (let p = start; p <= end; p++) middle.push(p);
  return [1, start > 2 ? '…' : null, ...middle, end < total - 1 ? '…' : null, total].filter(
    (p): p is number | '…' => p !== null
  );
}

const statusBadgeStyle = (status: OrderRecord['status']) => {
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
};

const formatDate = (value: string | number | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function OrdersTab({
  onSelectOrderReceipt,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
  onOpenCreateOrderModal,
  searchQuery,
  ordersFeedCount,
  incomingOrderSignal,
}: OrdersTabProps) {
  // Server-side pagination state — every change below refetches /api/orders.
  const [localQuery, setLocalQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // API response state
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [pagination, setPagination] = useState<OrdersPagination>({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    totalItems: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = useState<OrdersCounts | null>(null);
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // UI state
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // The header search takes precedence when active, like the previous merge logic.
  const effectiveQuery = searchQuery || localQuery;

  const buildParams = useCallback(
    (overrides?: { pageSize?: number }) =>
      new URLSearchParams({
        page: String(page),
        pageSize: String(overrides?.pageSize ?? pageSize),
        status: statusFilter,
        query: debouncedQuery,
        sort: sortKey,
        dir: sortDir,
      }),
    [page, pageSize, statusFilter, debouncedQuery, sortKey, sortDir]
  );

  const fetchOrders = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/orders?${buildParams()}`, { signal, cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

        setOrders(data.orders || []);
        setPagination(data.pagination);
        setCounts(data.counts);
        setStats(data.stats);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[OrdersTab] fetch failed', err);
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [buildParams]
  );

  // Fetch whenever any pagination/filter/sort param changes. An AbortController
  // cancels the stale request when params change again mid-flight.
  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchOrders flips isLoading synchronously before its first await
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [fetchOrders]);

  // Debounce the merged search so we hit the API once typing settles, not per key.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(effectiveQuery), 300);
    return () => clearTimeout(t);
  }, [effectiveQuery]);

  // Live-ness: when the layout's order feed changes length (socket alert, POS
  // order, 30s sync picking up external changes), refetch the current page.
  const lastFeedCountRef = useRef(ordersFeedCount);
  useEffect(() => {
    if (lastFeedCountRef.current === ordersFeedCount) return;
    lastFeedCountRef.current = ordersFeedCount;
    fetchOrders();
  }, [ordersFeedCount, fetchOrders]);

  // Instant update / prepend: when a realtime order arrives or updates
  const lastSignalSeqRef = useRef(incomingOrderSignal?.seq ?? 0);
  useEffect(() => {
    if (!incomingOrderSignal || incomingOrderSignal.seq === lastSignalSeqRef.current) return;
    lastSignalSeqRef.current = incomingOrderSignal.seq;

    const { order } = incomingOrderSignal;
    if (!order || !order.id) return;

    // 1. If order already exists in current page view, update it in place without reload
    const existingIndex = orders.findIndex((o) => o.id === order.id);
    if (existingIndex !== -1) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))
      );
      return;
    }

    // 2. If it's a new order, prepend if viewing page 1 and matches filter/search
    const matchesFilter =
      statusFilter === 'All' ||
      order.status === statusFilter ||
      (statusFilter === 'Unverified Payments' &&
        order.paymentMethod === 'bKash Send Money (Manual)' &&
        order.paymentStatus === 'Pending');
    const matchesSearch =
      !debouncedQuery.trim() ||
      [
        order.id,
        order.shippingAddress?.phone || '',
        order.shippingAddress?.fullName || '',
        order.shippingAddress?.district || order.shippingAddress?.city || '',
      ].some((h) => h.toLowerCase().includes(debouncedQuery.trim().toLowerCase()));

    if (pagination.page === 1 && sortKey === 'date' && sortDir === 'desc' && matchesFilter && matchesSearch) {
      setOrders((prev) =>
        prev.some((o) => o.id === order.id) ? prev : [order, ...prev.slice(0, pageSize - 1)]
      );
      setPagination((prev) => ({ ...prev, totalItems: prev.totalItems + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingOrderSignal]);

  // Param setters that also reset to the first page.
  const applyLocalQuery = (value: string) => {
    setLocalQuery(value);
    setPage(1);
  };

  const applyStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const applyPageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const copyPhone = async (phone: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  // Optimistic row update + context handler (emits socket event to all clients)
  const handleStatusChange = async (orderId: string, status: OrderRecord['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    await onUpdateOrderStatus(orderId, status);
  };

  const handlePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus } : o)));
    await onUpdatePaymentStatus(orderId, paymentStatus);
  };

  // CSV export re-queries with the same filter/search/sort but a large page.
  const exportToCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/orders?${buildParams({ pageSize: 500 })}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      const rows: string[][] = (data.orders as OrderRecord[]).map((o) => [
        o.id,
        `"${o.shippingAddress.fullName}"`,
        `"${o.shippingAddress.phone}"`,
        `"${o.shippingAddress.district || o.shippingAddress.city || 'Dhaka'}"`,
        String(o.items.length),
        String(o.total),
        `"${o.paymentMethod || 'Cash on Delivery'}"`,
        `"${o.paymentStatus || '—'}"`,
        `"${o.status}"`,
        `"${formatDate(o.createdAt)}"`,
      ]);
      if (rows.length === 0) return;

      const headers = ['Order ID', 'Customer Name', 'Phone', 'District', 'Items Count', 'Total BDT', 'Payment Method', 'Payment Status', 'Status', 'Date'];
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `Falak_Closet_Orders_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[OrdersTab] export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Order ID (not snapshot) so the modal re-renders with live status/payment edits.
  const detailsOrder = detailsOrderId
    ? orders.find((o) => o.id === detailsOrderId) || null
    : null;

  const showSkeleton = isLoading && orders.length === 0;
  const showEmpty = !isLoading && orders.length === 0;

  const tableRows = (order: OrderRecord) => (
    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
      {/* Order ID + date */}
      <td className="py-4 pr-4 whitespace-nowrap">
        <button
          onClick={() => setDetailsOrderId(order.id)}
          className="text-[#9B050B] hover:text-[#8C0A10] hover:underline cursor-pointer flex items-center gap-1 group transition-colors"
          title="Click to view order details"
        >
          <span className="font-mono font-bold">#{order.id}</span>
          <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity text-[#9B050B]" />
        </button>
        <span className="block text-[10px] text-stone-400 font-mono mt-0.5">{formatDate(order.createdAt)}</span>
      </td>

      {/* Customer */}
      <td className="py-4 pr-4 space-y-0.5">
        <p className="font-bold text-stone-900">{order.shippingAddress.fullName}</p>
        <button
          type="button"
          onClick={() => copyPhone(order.shippingAddress.phone)}
          className="text-[11px] text-stone-500 font-mono flex items-center gap-1 cursor-pointer group"
          title="Click to copy phone number"
        >
          <Phone className="w-3 h-3 text-stone-400" />
          {order.shippingAddress.phone}
          {copiedPhone === order.shippingAddress.phone ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3 text-stone-300 group-hover:text-stone-600 transition-colors" />
          )}
        </button>
      </td>

      {/* Location */}
      <td className="py-4 pr-4 text-stone-700">
        <p className="flex items-center gap-1 font-semibold text-[11px]">
          <MapPin className="w-3 h-3 text-rose-500" />
          {order.shippingAddress.district || order.shippingAddress.city || 'Dhaka'}
        </p>
        <p className="text-[10px] text-stone-500 truncate max-w-[140px]">
          {order.shippingAddress.fullAddress || order.shippingAddress.street || 'Dhaka, Bangladesh'}
        </p>
      </td>

      {/* Order summary */}
      <td className="py-4 pr-4 text-stone-700">
        <p className="font-semibold text-stone-900">{order?.items?.length} item(s)</p>
        <p className="text-[10px] text-stone-500 truncate max-w-[140px]">
          {order.items.map((i) => i.product?.name || (i as { name?: string }).name || 'Modest Fashion Item').join(', ')}
        </p>
        {order.promoCode && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold uppercase mt-1 font-mono">
            🎟 {order.promoCode}
          </span>
        )}
      </td>

      {/* Amount */}
      <td className="py-4 pr-4 font-mono font-bold text-stone-900 whitespace-nowrap tabular-nums text-right">
        {formatCurrency(order.total)}
      </td>

      {/* Payment */}
      <td className="py-4 pr-4 text-[11px] space-y-1">
        <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-md font-mono font-medium text-stone-800 inline-block">
          {order.paymentMethod || 'Cash on Delivery'}
        </span>
        {order.paymentMethod === 'bKash Send Money (Manual)' && (
          <div className="space-y-0.5 text-[10px] bg-stone-50 border border-stone-200 p-1.5 rounded-lg max-w-[155px]">
            <p className="font-semibold text-stone-500">
              Sender: <span className="font-mono font-bold text-stone-900">{order.paymentSenderNumber}</span>
            </p>
            <p className="font-semibold text-stone-500">
              TrxID: <span className="font-mono font-bold text-[#9B050B]">{order.paymentTrxId}</span>
            </p>
            <p className="flex items-center gap-1 font-bold pt-0.5">
              <span>Payment:</span>
              {order.paymentStatus === 'Verified' ? (
                <span className="text-emerald-700 uppercase tracking-wider text-[8px] font-sans">Verified</span>
              ) : order.paymentStatus === 'Rejected' ? (
                <span className="text-rose-700 uppercase tracking-wider text-[8px] font-sans">Rejected</span>
              ) : (
                <span className="text-amber-700 uppercase tracking-wider text-[8px] font-sans animate-pulse">Pending</span>
              )}
            </p>
          </div>
        )}
      </td>

      {/* Status pipeline */}
      <td className="py-4 pr-4">
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderRecord['status'])}
          className={`border rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer ${statusBadgeStyle(order.status)}`}
        >
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-white text-stone-800">
              {st}
            </option>
          ))}
          {!ORDER_STATUSES.includes(order.status as any) && (
            <option value={order.status} className="bg-white text-stone-800">
              {order.status}
            </option>
          )}
        </select>
      </td>

      {/* Actions */}
      <td className="py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {order.paymentMethod === 'bKash Send Money (Manual)' && order.paymentStatus === 'Pending' && (
            <>
              <button
                onClick={() => handlePaymentStatus(order.id, 'Verified')}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer text-[10px] font-bold shadow-xs border border-emerald-700"
                title="Verify Payment"
              >
                Verify
              </button>
              <button
                onClick={() => handlePaymentStatus(order.id, 'Rejected')}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition-colors cursor-pointer text-[10px] font-bold"
                title="Reject Payment"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => onSelectOrderReceipt(order)}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-stone-200"
            title="View & print receipt"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  const mobileCards = (order: OrderRecord) => (
    <div key={order.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
      {/* ID + date + amount */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setDetailsOrderId(order.id)}
          className="text-[#9B050B] font-mono font-bold cursor-pointer hover:underline text-left"
          title="View order details"
        >
          #{order.id}
          <span className="block text-[10px] text-stone-400 font-normal mt-0.5">{formatDate(order.createdAt)}</span>
        </button>
        <p className="font-mono font-bold text-stone-900 tabular-nums">{formatCurrency(order.total)}</p>
      </div>

      {/* Customer + location */}
      <div className="space-y-1 text-[11px]">
        <p className="font-bold text-stone-900">{order.shippingAddress.fullName}</p>
        <button
          type="button"
          onClick={() => copyPhone(order.shippingAddress.phone)}
          className="text-stone-500 font-mono flex items-center gap-1 cursor-pointer"
        >
          <Phone className="w-3 h-3 text-stone-400" /> {order.shippingAddress.phone}
          {copiedPhone === order.shippingAddress.phone && <Check className="w-3 h-3 text-emerald-600" />}
        </button>
        <p className="flex items-center gap-1 font-semibold text-stone-700">
          <MapPin className="w-3 h-3 text-rose-500" />
          {order.shippingAddress.district || order.shippingAddress.city || 'Dhaka'}
        </p>
        <p className="flex items-center gap-1 text-stone-500">
          <Package className="w-3 h-3 text-stone-400" />
          {order.items.length} item(s)
          {order.promoCode && <span className="text-emerald-700 font-mono">🎟 {order.promoCode}</span>}
        </p>
      </div>

      {/* Payment */}
      <span className="inline-block px-2 py-0.5 bg-white border border-stone-200 rounded-md font-mono font-medium text-stone-800 text-[10px]">
        {order.paymentMethod || 'Cash on Delivery'}
        {order.paymentMethod === 'bKash Send Money (Manual)' && order.paymentStatus && (
          <span className={`ml-1 font-sans font-bold ${order.paymentStatus === 'Verified' ? 'text-emerald-700' : order.paymentStatus === 'Rejected' ? 'text-rose-700' : 'text-amber-700'}`}>
            · {order.paymentStatus}
          </span>
        )}
      </span>

      {/* Status + actions */}
      <div className="flex items-center gap-2">
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderRecord['status'])}
          className={`flex-1 border rounded-xl px-2.5 py-2 text-[11px] font-bold focus:outline-none cursor-pointer ${statusBadgeStyle(order.status)}`}
        >
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-white text-stone-800">
              {st}
            </option>
          ))}
          {!ORDER_STATUSES.includes(order.status as any) && (
            <option value={order.status} className="bg-white text-stone-800">
              {order.status}
            </option>
          )}
        </select>
        {order.paymentMethod === 'bKash Send Money (Manual)' && order.paymentStatus === 'Pending' && (
          <button
            onClick={() => handlePaymentStatus(order.id, 'Verified')}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-bold cursor-pointer"
          >
            Verify
          </button>
        )}
        <button
          onClick={() => onSelectOrderReceipt(order)}
          className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl cursor-pointer"
          title="View & print receipt"
        >
          <Printer className="w-4 h-4 text-stone-900" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-stone-900">
      {/* KPI strip (server-aggregated) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Orders" value={stats?.totalOrders ?? '—'} sub="all time" />
        <StatCard
          icon={Clock}
          label="Fulfillment"
          value={stats?.pendingFulfillment ?? '—'}
          sub="pending → quality check"
          tone="amber"
        />
        <StatCard
          icon={Truck}
          label="Delivered"
          value={stats?.delivered ?? '—'}
          sub="completed shipments"
          tone="emerald"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={stats ? formatCurrency(stats.revenue) : '—'}
          sub="gross, all statuses"
          tone="rose"
        />
      </div>

      {/* Filter & search controls */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Status filter pills (server-counted) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto text-xs font-bold scrollbar-none">
            {STATUS_PILLS.map((st) => (
              <button
                key={st}
                onClick={() => applyStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${statusFilter === st
                    ? 'bg-stone-900 text-white shadow-sm font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                  }`}
              >
                <span>{st}</span>
                <span className="text-[10px] font-mono opacity-80">({counts?.[st] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Search, POS, export */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={localQuery}
                onChange={(e) => applyLocalQuery(e.target.value)}
                placeholder="Search phone, name, district..."
                className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={() => applyLocalQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOpenCreateOrderModal && (
              <button
                onClick={onOpenCreateOrderModal}
                className="px-4 py-2 bg-[#9B050B] hover:bg-[#800409] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">+ POS</span>
              </button>
            )}

            <button
              onClick={exportToCSV}
              disabled={isExporting || pagination.totalItems === 0}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Export the current filtered view to CSV"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 text-[#F2C76E] animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[#F2C76E]" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'Exporting…' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        {/* Result count + rows-per-page */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-xs font-mono text-stone-500">
            Showing{' '}
            <strong className="text-stone-900">
              {pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}
            </strong>{' '}
            of {pagination.totalItems} order{pagination.totalItems !== 1 ? 's' : ''}
            {statusFilter !== 'All' && stats && (
              <span className="text-stone-400"> (filtered from {stats.totalOrders})</span>
            )}
          </span>

          <label className="flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase tracking-wide">
            Rows
            <select
              value={pageSize}
              onChange={(e) => applyPageSize(Number(e.target.value))}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
              title="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Loading skeleton (first load) */}
        {showSkeleton ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(pageSize)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-stone-200 rounded w-24" />
                  <div className="h-2 bg-stone-100 rounded w-16" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-stone-200 rounded w-32" />
                  <div className="h-2 bg-stone-100 rounded w-24" />
                </div>
                <div className="h-3 bg-stone-100 rounded w-16" />
                <div className="h-6 bg-stone-100 rounded-lg w-24" />
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          /* Empty state */
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-stone-400" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-stone-900">No orders found</p>
              <p className="text-xs text-stone-500">
                {effectiveQuery.trim()
                  ? `No orders match "${effectiveQuery.trim()}"${statusFilter !== 'All' ? ' with the selected filter' : ''}.`
                  : 'Orders will appear here as customers check out.'}
              </p>
            </div>
            {(effectiveQuery.trim() || statusFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  applyLocalQuery('');
                  applyStatusFilter('All');
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table — dimmed during background refetches */}
            <div className={`hidden lg:block overflow-x-auto transition-opacity ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <SortableHeader label="Order" sortKey="date" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="pb-3 pr-4 font-semibold">Customer Details</th>
                    <th className="pb-3 pr-4 font-semibold">Location</th>
                    <th className="pb-3 pr-4 font-semibold">Order Summary</th>
                    <SortableHeader label="Amount (৳)" sortKey="total" activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                    <th className="pb-3 pr-4 font-semibold">Payment</th>
                    <th className="pb-3 pr-4 font-semibold">Status Pipeline</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {orders.map(tableRows)}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className={`lg:hidden space-y-3 transition-opacity ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
              {orders.map(mobileCards)}
            </div>

            {/* Server-side pagination — always rendered; buttons disable at edges. */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
              <span className="text-[10px] font-mono text-stone-400">
                Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {pagination.totalPages > 1 &&
                  pageWindow(pagination.page, pagination.totalPages).map((p, idx) =>
                    p === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-stone-400 text-xs font-mono">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`min-w-8 h-8 px-2 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${p === pagination.page
                            ? 'bg-stone-900 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                          }`}
                        aria-current={p === pagination.page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Next page"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order Details Modal (opened by clicking an order ID) */}
      {detailsOrder && (
        <OrderDetailsModal
          order={detailsOrder}
          onClose={() => setDetailsOrderId(null)}
          onUpdateOrderStatus={handleStatusChange}
          onUpdatePaymentStatus={handlePaymentStatus}
          onPrintReceipt={(o) => {
            setDetailsOrderId(null);
            onSelectOrderReceipt(o);
          }}
        />
      )}
    </div>
  );
}
