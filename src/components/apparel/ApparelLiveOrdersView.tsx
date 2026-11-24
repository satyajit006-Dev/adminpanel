import { Search } from 'lucide-react';
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
      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs text-ink-muted tabular-nums">
          {ongoingOrders.length} active order{ongoingOrders.length === 1 ? '' : 's'} in fulfillment
        </span>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, garment, SKU..."
            aria-label="Search live orders"
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
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
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface hover:border-accent/50'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">
                    {card.label}
                  </span>
                  {selected && (
                    <span className="text-[11px] font-medium text-accent-text">
                      Filtered
                    </span>
                  )}
                </div>
                <p className="mt-2 font-mono text-3xl font-bold text-ink tabular-nums">
                  {card.count}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ongoing Orders Table */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-ink">
              {stageFilter === 'all'
                ? 'No ongoing orders in fulfillment'
                : 'No ongoing orders in this stage'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Incoming storefront orders will appear here as customers check out.
            </p>
            {stageFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover"
              >
                Show All Ongoing Orders
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs font-medium text-ink-muted">
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-3">Garments &amp; Sizes</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Order Amount</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order Time</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-sm">
                {filtered.map((order) => {
                  const elapsed = getMinutesElapsed(order.createdAt, nowMs);
                  const nextStep = getNextWorkflowStep(order);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-hover transition-colors"
                    >
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 pl-5 pr-3 font-mono text-xs font-bold text-ink cursor-pointer whitespace-nowrap"
                      >
                        {order.orderNumber}
                      </td>
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 px-3 cursor-pointer whitespace-nowrap"
                      >
                        <p className="text-xs font-semibold text-ink">
                          {order.customerName}
                        </p>
                        <p className="font-mono text-[11px] text-ink-muted">
                          {order.customerPhone}
                        </p>
                      </td>
                      <td
                        onClick={() => onSelectOrder(order)}
                        className="py-3.5 px-3 cursor-pointer max-w-[270px]"
                      >
                        <p className="text-xs text-ink truncate">
                          {order.items
                            .map((i) => `${i.quantity}× ${i.name} (${i.variant})`)
                            .join(', ')}
                        </p>
                        {order.customerInstructions && (
                          <p className="text-[11px] text-ink-muted truncate">
                            Note: {order.customerInstructions}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold text-ink tabular-nums whitespace-nowrap">
                        {formatInr(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <PaymentStateText state={order.paymentStatus} />
                        <span className="block text-[11px] text-ink-muted">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-medium text-ink-secondary whitespace-nowrap">
                        {order.orderType}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <OrderStatusText status={order.orderStatus} />
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap tabular-nums">
                        <span className="block text-ink">
                          {formatTimeOnly(order.createdAt)}
                        </span>
                        <span
                          className={`text-[11px] ${
                            elapsed >= 45
                              ? 'font-semibold text-red-700 dark:text-red-400'
                              : 'text-ink-muted'
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
                              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
                            >
                              {nextStep.label}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink"
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
