import { Plus, Radio, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ApparelOrder, OrderStatus } from '../../types/apparel';
import {
  formatInr,
  formatTimeOnly,
  getMinutesElapsed,
  isOngoingOrder,
} from '../../utils/apparelFormatters';
import { OrderStatusText, PaymentStateText } from './ApparelStatusText';

interface ApparelLiveOrdersViewProps {
  orders: ApparelOrder[];
  realtimeEnabled: boolean;
  onToggleRealtime: () => void;
  onSimulateOrder: () => void;
  onAdvanceOrderStatus: (order: ApparelOrder, nextStatus: OrderStatus) => void;
  onSelectOrder: (order: ApparelOrder) => void;
}

type LiveStageFilter = 'all' | 'new_order' | 'packing' | 'ready' | 'out_for_delivery';

function getNextWorkflowStep(order: ApparelOrder): { next: OrderStatus; label: string } | null {
  switch (order.orderStatus) {
    case 'new_order':
      return { next: 'confirmed', label: 'Confirm' };
    case 'confirmed':
      return { next: 'packing', label: 'Start Packing' };
    case 'packing':
      return { next: 'ready', label: 'Mark Ready' };
    case 'ready':
      return order.orderType === 'Delivery'
        ? { next: 'out_for_delivery', label: 'Dispatch' }
        : { next: 'completed', label: 'Complete Pickup' };
    case 'out_for_delivery':
      return { next: 'completed', label: 'Mark Delivered' };
    default:
      return null;
  }
}

export function ApparelLiveOrdersView({
  orders,
  realtimeEnabled,
  onToggleRealtime,
  onSimulateOrder,
  onAdvanceOrderStatus,
  onSelectOrder,
}: ApparelLiveOrdersViewProps) {
  const [stageFilter, setStageFilter] = useState<LiveStageFilter>('all');
  const [search, setSearch] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const ongoingOrders = useMemo(
    () =>
      orders
        .filter((o) => isOngoingOrder(o.orderStatus))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );

  const counts = useMemo(() => {
    return {
      new_order: ongoingOrders.filter((o) => o.orderStatus === 'new_order').length,
      packing: ongoingOrders.filter(
        (o) => o.orderStatus === 'confirmed' || o.orderStatus === 'packing'
      ).length,
      ready: ongoingOrders.filter((o) => o.orderStatus === 'ready').length,
      out_for_delivery: ongoingOrders.filter((o) => o.orderStatus === 'out_for_delivery').length,
    };
  }, [ongoingOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ongoingOrders.filter((o) => {
      if (stageFilter === 'new_order' && o.orderStatus !== 'new_order') return false;
      if (
        stageFilter === 'packing' &&
        o.orderStatus !== 'confirmed' &&
        o.orderStatus !== 'packing'
      ) {
        return false;
      }
      if (stageFilter === 'ready' && o.orderStatus !== 'ready') return false;
      if (stageFilter === 'out_for_delivery' && o.orderStatus !== 'out_for_delivery') {
        return false;
      }
      if (q) {
        const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.items
          .map((i) => `${i.name} ${i.sku} ${i.variant}`)
          .join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ongoingOrders, stageFilter, search]);

  const stageCards: Array<{
    id: Exclude<LiveStageFilter, 'all'>;
    label: string;
    subtitle: string;
    count: number;
  }> = [
    {
      id: 'new_order',
      label: 'New Orders',
      subtitle: 'Awaiting confirmation',
      count: counts.new_order,
    },
    {
      id: 'packing',
      label: 'Packing & QC',
      subtitle: 'Steaming, tagging & boxing',
      count: counts.packing,
    },
    {
      id: 'ready',
      label: 'Ready for Dispatch / Pickup',
      subtitle: 'Awaiting courier or collection',
      count: counts.ready,
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      subtitle: 'In transit with courier',
      count: counts.out_for_delivery,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live Stream Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleRealtime}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              realtimeEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400'
            }`}
          >
            <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Realtime Feed: {realtimeEnabled ? 'Active' : 'Paused'}</span>
          </button>

          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {ongoingOrders.length} active order{ongoingOrders.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, garment, SKU..."
              aria-label="Search live orders"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={onSimulateOrder}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Incoming Order</span>
          </button>
        </div>
      </div>

      {/* Live Fulfillment Stage Cards */}
      <section aria-label="Live order fulfillment stages">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stageCards.map((card) => {
            const selected = stageFilter === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  setStageFilter((prev) => (prev === card.id ? 'all' : card.id))
                }
                className={`rounded-xl border p-5 text-left transition-colors ${
                  selected
                    ? 'border-slate-900 bg-slate-100/70 dark:border-slate-200 dark:bg-slate-800/70'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#111827] dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {card.label}
                  </span>
                  {selected && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Filtered
                    </span>
                  )}
                </div>
                <p className="mt-2 font-mono text-3xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {card.count}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ongoing Orders Table */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {stageFilter === 'all'
                ? 'No ongoing orders in fulfillment'
                : 'No ongoing orders in this stage'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              New clothing orders will appear here in real time as customers check out.
            </p>
            {stageFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Show All Ongoing Orders
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-3">Garments & Sizes</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Order Amount</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order Time</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((order) => {
                  const elapsed = getMinutesElapsed(order.createdAt, nowMs);
                  const nextStep = getNextWorkflowStep(order);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 pl-5 pr-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer whitespace-nowrap"
                      >
                        {order.orderNumber}
                      </td>
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 px-3 cursor-pointer whitespace-nowrap"
                      >
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {order.customerName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {order.customerPhone}
                        </p>
                      </td>
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 px-3 cursor-pointer max-w-[270px]"
                      >
                        <p className="text-xs text-slate-900 dark:text-slate-100 truncate">
                          {order.items
                            .map((i) => `${i.quantity}× ${i.name} (${i.variant})`)
                            .join(', ')}
                        </p>
                        {order.customerInstructions && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Note: {order.customerInstructions}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                        {formatInr(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <PaymentStateText state={order.paymentStatus} />
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {order.orderType}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <OrderStatusText status={order.orderStatus} />
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap tabular-nums">
                        <span className="block text-slate-900 dark:text-slate-100">
                          {formatTimeOnly(order.createdAt)}
                        </span>
                        <span
                          className={`text-[11px] ${
                            elapsed >= 45
                              ? 'font-semibold text-red-700 dark:text-red-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {elapsed}m elapsed
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {nextStep && (
                            <button
                              type="button"
                              onClick={() => onAdvanceOrderStatus(order, nextStep.next)}
                              className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            >
                              {nextStep.label}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
