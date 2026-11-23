import { Download, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ApparelOrder, OrderType } from '../../types/apparel';
import {
  exportOrdersCsv,
  formatDateTime,
  formatInr,
  isOngoingOrder,
} from '../../utils/apparelFormatters';
import { OrderStatusText, PaymentStateText } from './ApparelStatusText';

export type OrdersHistoryTab = 'all' | 'ongoing' | 'completed' | 'cancelled' | 'refunded';

interface ApparelAllOrdersViewProps {
  orders: ApparelOrder[];
  initialTab?: OrdersHistoryTab;
  onSelectOrder: (order: ApparelOrder) => void;
  onNotify: (msg: string) => void;
}

export function ApparelAllOrdersView({
  orders,
  initialTab = 'all',
  onSelectOrder,
  onNotify,
}: ApparelAllOrdersViewProps) {
  const [tab, setTab] = useState<OrdersHistoryTab>(initialTab);
  const [typeFilter, setTypeFilter] = useState<OrderType | 'All'>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    return {
      all: orders.length,
      ongoing: orders.filter((o) => isOngoingOrder(o.orderStatus)).length,
      completed: orders.filter((o) => o.orderStatus === 'completed').length,
      cancelled: orders.filter(
        (o) => o.orderStatus === 'cancelled' || o.orderStatus === 'rejected'
      ).length,
      refunded: orders.filter(
        (o) =>
          o.paymentStatus === 'Refunded' || o.paymentStatus === 'Partially Refunded'
      ).length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((o) => {
        if (tab === 'ongoing' && !isOngoingOrder(o.orderStatus)) return false;
        if (tab === 'completed' && o.orderStatus !== 'completed') return false;
        if (
          tab === 'cancelled' &&
          o.orderStatus !== 'cancelled' &&
          o.orderStatus !== 'rejected'
        ) {
          return false;
        }
        if (
          tab === 'refunded' &&
          o.paymentStatus !== 'Refunded' &&
          o.paymentStatus !== 'Partially Refunded'
        ) {
          return false;
        }
        if (typeFilter !== 'All' && o.orderType !== typeFilter) return false;
        if (q) {
          const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.items
            .map((i) => `${i.name} ${i.sku} ${i.variant}`)
            .join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [orders, tab, typeFilter, search]);

  const tabs: Array<{ id: OrdersHistoryTab; label: string }> = [
    { id: 'all', label: 'All Orders' },
    { id: 'ongoing', label: 'Ongoing Orders' },
    { id: 'completed', label: 'Completed Orders' },
    { id: 'cancelled', label: 'Cancelled Orders' },
    { id: 'refunded', label: 'Refunded Orders' },
  ];

  const handleExport = () => {
    exportOrdersCsv(filtered, `kova-studio-${tab}-orders.csv`);
    onNotify(`Exported ${filtered.length} apparel orders to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Order history tabs"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#111827] self-start"
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 whitespace-nowrap shrink-0 self-start"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, customer, garment, or SKU..."
            aria-label="Search orders"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="sm:col-span-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OrderType | 'All')}
            aria-label="Filter by fulfillment type"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200"
          >
            <option value="All">All Fulfillment Types</option>
            <option value="Delivery">Delivery</option>
            <option value="Store Pickup">Store Pickup</option>
          </select>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              No orders found
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try clearing your search or switching to another order tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-3">Garments</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 pl-5 pr-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {order.customerName}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {order.customerPhone}
                      </p>
                    </td>
                    <td className="py-3 px-3 max-w-[270px]">
                      <p className="text-xs text-slate-900 dark:text-slate-100 truncate">
                        {order.items
                          .map((i) => `${i.quantity}× ${i.name} (${i.variant})`)
                          .join(', ')}
                      </p>
                      {order.cancellationReason && (
                        <p className="text-[11px] text-red-700 dark:text-red-400 truncate">
                          Reason: {order.cancellationReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                      {formatInr(order.totalAmount)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PaymentStateText state={order.paymentStatus} />
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {order.orderType}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <OrderStatusText status={order.orderStatus} />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
