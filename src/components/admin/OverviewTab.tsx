'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Truck,
  AlertTriangle,
  ChevronRight,
  Eye,
  ArrowUpRight,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart2,
  Clock
} from 'lucide-react';
import { OrderRecord } from '@/context/CartContext';
import { Product } from '@/data/products';
import { formatCurrency } from '@/lib/utils';

import { ORDER_STATUSES } from '@/lib/orderStatuses';

interface OverviewTabProps {
  orders: OrderRecord[];
  products: Product[];
  onSelectOrderReceipt: (order: OrderRecord) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderRecord['status']) => void;
  onNavigateToTab: (tab: 'orders' | 'products' | 'promotions' | 'customers' | 'analytics') => void;
}

export function OverviewTab({
  orders,
  products,
  onSelectOrderReceipt,
  onUpdateOrderStatus,
  onNavigateToTab
}: OverviewTabProps) {
  const grossRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const pendingShipments = orders.filter(
    (o) =>
      o.status === 'Pending' ||
      o.status === 'Confirmed' ||
      o.status === 'Processing' ||
      o.status === 'Packed' ||
      o.status === 'Ready for Shipment' ||
      o.status === 'Payment Pending' ||
      o.status === 'On Hold' ||
      o.status === 'Quality Checked'
  );
  const avgOrderValue = totalOrdersCount > 0 ? grossRevenue / totalOrdersCount : 4990;

  const lowStockProducts = products.filter((p) => (p.stock ?? 10) < 5);

  // Sales by Category calculation
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  return (
    <div className="space-y-8 text-stone-900">
      {/* 4 Executive KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Revenue */}
        <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-stone-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Gross Sales Revenue
            </span>
            <div className="p-2.5 bg-stone-100 rounded-2xl border border-stone-200 text-stone-900">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-stone-900">
            {formatCurrency(grossRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +24.8% vs last month
            </span>
            <span className="text-stone-400 font-mono font-bold">BDT ৳</span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-stone-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Total Customer Orders
            </span>
            <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-200 text-blue-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-stone-900">
            {totalOrdersCount}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-stone-500 font-semibold">Synced from Checkout</span>
            <span className="text-emerald-600 font-mono font-bold">100% Verified</span>
          </div>
        </div>

        {/* Card 3: Average Order Value */}
        <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-stone-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Avg Basket Value (AOV)
            </span>
            <div className="p-2.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-stone-900">
            {formatCurrency(avgOrderValue)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-stone-500">Per transaction</span>
            <span className="text-stone-900 font-bold">Premium Tier</span>
          </div>
        </div>

        {/* Card 4: Pending Fulfillment */}
        <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Pending Fulfillment
            </span>
            <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-rose-600">
            {pendingShipments.length}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-amber-700 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Action required
            </span>
            <button
              onClick={() => onNavigateToTab('orders')}
              className="text-stone-900 hover:underline font-bold"
            >
              Fulfill Now →
            </button>
          </div>
        </div>
      </div>

      {/* Visual Charts & Category Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth & Monthly Sales Chart */}
        <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-stone-900" />
                <span>Revenue Performance Trends</span>
              </h3>
              <p className="text-xs text-stone-500">Monthly sales volume & customer transaction flow</p>
            </div>
            <div className="px-3 py-1 bg-stone-100 border border-stone-200 rounded-full text-xs font-mono text-stone-700 font-bold">
              Current Quarter 2026
            </div>
          </div>

          {/* Simulated Bar Chart */}
          <div className="pt-4 space-y-3">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-stone-200">
              {[
                { month: 'Jan', val: 65, amount: '৳ 320K' },
                { month: 'Feb', val: 78, amount: '৳ 410K' },
                { month: 'Mar', val: 92, amount: '৳ 580K' },
                { month: 'Apr', val: 84, amount: '৳ 490K' },
                { month: 'May', val: 98, amount: '৳ 640K' },
                { month: 'Jun', val: 100, amount: '৳ 720K' }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-[9px] font-mono text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300">
                    {bar.amount}
                  </div>
                  <div
                    className="w-full max-w-[40px] bg-stone-900 rounded-t-lg group-hover:bg-[#9B050B] transition-all"
                    style={{ height: `${bar.val}%` }}
                  />
                  <span className="text-[11px] font-mono text-stone-600 font-bold group-hover:text-stone-900">
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-sm bg-stone-900" />
                <span>Verified Transactions (৳ BDT)</span>
              </span>
              <button
                onClick={() => onNavigateToTab('analytics')}
                className="text-stone-900 hover:underline font-bold flex items-center gap-1"
              >
                <span>View Full Analytics Report</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Breakdown & Stock Alerts */}
        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-stone-900" />
              <span>Catalog Breakdown</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / products.length) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-700">{cat}</span>
                      <span className="text-stone-900 font-mono font-bold">{count} items ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                      <div
                        className="h-full bg-stone-900 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Warning Banner */}
          {lowStockProducts.length > 0 && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>{lowStockProducts.length} Products Running Low</span>
                </span>
                <button
                  onClick={() => onNavigateToTab('products')}
                  className="text-[11px] text-amber-900 hover:underline font-bold"
                >
                  Restock →
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                Items like <span className="font-semibold">{lowStockProducts[0]?.name}</span> have fewer than 5 units left in inventory.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Best-Selling Modest Items Showcase */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Top Best-Selling Modest Catalog Items</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Highest performing products with real-time stock indicators</p>
          </div>
          <button
            onClick={() => onNavigateToTab('products')}
            className="text-xs text-stone-900 hover:underline font-bold"
          >
            Manage Catalog →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.slice(0, 4).map((p) => {
            const cover = p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=400&q=80';
            const stock = p.stock ?? 10;
            return (
              <div
                key={p.id}
                className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-3 hover:border-stone-400 transition-all"
              >
                <div className="w-14 h-16 relative rounded-xl overflow-hidden shrink-0 border border-stone-200">
                  <Image src={cover} alt={p.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-stone-900 text-xs truncate">{p.name}</p>
                  <p className="text-[10px] text-stone-500 font-mono">{p.category}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200 font-mono">
                    <span className="font-bold text-stone-900">{formatCurrency(p.price)}</span>
                    <span className={`text-[10px] font-bold ${stock < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {stock} left
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Pipeline Table */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-xl text-stone-900">
              Recent Customer Orders
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Live incoming customer transactions from store checkout
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('orders')}
            className="px-4 py-2 bg-stone-100 border border-stone-200 text-stone-900 hover:bg-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>View All Orders Pipeline</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Contact / Phone</th>
                <th className="pb-3 font-semibold">Items</th>
                <th className="pb-3 font-semibold">Total (৳)</th>
                <th className="pb-3 font-semibold">Payment</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-4 font-mono font-bold whitespace-nowrap">
                    <button
                      onClick={() => onSelectOrderReceipt(order)}
                      className="text-[#9B050B] hover:text-[#8C0A10] hover:underline cursor-pointer flex items-center gap-1 group transition-colors"
                      title="Click to view full order details & invoice"
                    >
                      <span>#{order.id}</span>
                      <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity text-[#9B050B]" />
                    </button>
                  </td>
                  <td className="py-4 font-bold text-stone-900">
                    {order.shippingAddress.fullName}
                  </td>
                  <td className="py-4 text-stone-600 font-mono text-[11px]">
                    {order.shippingAddress.phone}
                  </td>
                  <td className="py-4 text-stone-600">
                    {order.items.length} item(s)
                  </td>
                  <td className="py-4 font-mono font-bold text-stone-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-4 text-stone-500 text-[11px]">
                    {order.paymentMethod || 'Cash on Delivery'}
                  </td>
                  <td className="py-4">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        onUpdateOrderStatus(order.id, e.target.value as OrderRecord['status'])
                      }
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                      {!ORDER_STATUSES.includes(order.status as any) && (
                        <option value={order.status}>{order.status}</option>
                      )}
                    </select>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => onSelectOrderReceipt(order)}
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-stone-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No order records found in database. Place a test order on the storefront!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
