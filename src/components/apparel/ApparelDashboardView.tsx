import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ApparelOrder,
  ApparelProduct,
  ApparelRoute,
  Transaction,
  UserAccount,
} from '../../types/apparel';
import {
  formatDateTime,
  formatInr,
  isOngoingOrder,
  isSameLocalDay,
} from '../../utils/apparelFormatters';
import { OrderStatusText, TransactionStatusText } from './ApparelStatusText';

interface ApparelDashboardViewProps {
  orders: ApparelOrder[];
  transactions: Transaction[];
  products: ApparelProduct[];
  accounts: UserAccount[];
  onNavigate: (route: ApparelRoute) => void;
  onSelectOrder: (order: ApparelOrder) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export function ApparelDashboardView({
  orders,
  transactions,
  products,
  accounts,
  onNavigate,
  onSelectOrder,
  onSelectTransaction,
}: ApparelDashboardViewProps) {
  const [salesView, setSalesView] = useState<'daily' | 'monthly'>('daily');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const analytics = useMemo(() => {
    const settledTx = transactions.filter(
      (t) => t.status === 'success' || t.status === 'partially_refunded'
    );
    const todayNet = settledTx
      .filter((t) => isSameLocalDay(t.createdAt))
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);

    const totalCash = settledTx
      .filter((t) => t.paymentMethod === 'Cash')
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);

    const totalOnline = settledTx
      .filter((t) => t.paymentMethod !== 'Cash')
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);

    const totalRefunds = transactions.reduce((s, t) => s + t.refundedAmount, 0);

    const pendingAmount = transactions
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + t.amount, 0);

    const nonCancelled = orders.filter(
      (o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected'
    );
    const aov =
      nonCancelled.length > 0
        ? nonCancelled.reduce((s, o) => s + o.totalAmount, 0) / nonCancelled.length
        : 0;

    const cancelledCount = orders.filter(
      (o) => o.orderStatus === 'cancelled' || o.orderStatus === 'rejected'
    ).length;
    const cancellationRate = orders.length > 0 ? (cancelledCount / orders.length) * 100 : 0;

    const completedWithTime = orders.filter((o) => o.completedAt);
    const avgProcessingMins =
      completedWithTime.length > 0
        ? Math.round(
            completedWithTime.reduce((sum, o) => {
              const diff =
                (new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime()) /
                60_000;
              return sum + Math.max(1, diff);
            }, 0) / completedWithTime.length
          )
        : null;

    const methodCounts = new Map<string, number>();
    for (const tx of transactions) {
      methodCounts.set(tx.paymentMethod, (methodCounts.get(tx.paymentMethod) ?? 0) + 1);
    }
    let mostUsedMethod: string | null = null;
    let highestCount = 0;
    for (const [method, cnt] of methodCounts.entries()) {
      if (cnt > highestCount) {
        highestCount = cnt;
        mostUsedMethod = method;
      }
    }

    return {
      todayNet,
      totalCash,
      totalOnline,
      totalRefunds,
      pendingAmount,
      aov,
      cancellationRate,
      avgProcessingMins,
      mostUsedMethod,
      mostUsedCount: highestCount,
    };
  }, [orders, transactions]);

  const chartSeries = useMemo(() => {
    const now = new Date();
    const settledTx = transactions.filter(
      (t) => t.status === 'success' || t.status === 'partially_refunded'
    );

    if (salesView === 'daily') {
      const buckets: Array<{ label: string; revenue: number; orders: number }> = [];
      for (let offset = 6; offset >= 0; offset--) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const label =
          offset === 0
            ? 'Today'
            : day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const dayRev = settledTx
          .filter((t) => isSameLocalDay(t.createdAt, day))
          .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);
        const dayOrders = orders.filter((o) => isSameLocalDay(o.createdAt, day)).length;
        buckets.push({ label, revenue: dayRev, orders: dayOrders });
      }
      return buckets;
    }

    const monthlyBuckets: Array<{ label: string; revenue: number; orders: number }> = [];
    for (let offset = 5; offset >= 0; offset--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      const label = monthDate.toLocaleDateString('en-IN', { month: 'short' });
      const monthRev = settledTx
        .filter((t) => {
          const d = new Date(t.createdAt);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);
      const monthOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      monthlyBuckets.push({ label, revenue: monthRev, orders: monthOrders });
    }
    return monthlyBuckets;
  }, [salesView, orders, transactions]);

  const chartW = 780;
  const chartH = 220;
  const padX = 52;
  const padTop = 18;
  const padBot = 28;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padTop - padBot;
  const hasAnyRevenue = chartSeries.some((p) => p.revenue > 0);
  const maxRev = hasAnyRevenue ? Math.max(...chartSeries.map((p) => p.revenue)) * 1.15 : 10000;

  const ongoingOrders = useMemo(
    () => orders.filter((o) => isOngoingOrder(o.orderStatus)).slice(0, 5),
    [orders]
  );
  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions]);
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.lowStockThreshold),
    [products]
  );

  const activeBar =
    hoveredIdx !== null ? chartSeries[hoveredIdx] : chartSeries[chartSeries.length - 1];

  return (
    <div className="space-y-6">
      {/* Executive KPI Strip */}
      <section aria-label="Store Key Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="rounded-xl border border-line bg-surface p-5 text-left hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-ink-muted">
              Today&apos;s Net Revenue
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-ink tabular-nums">
              {formatInr(analytics.todayNet)}
            </p>
            <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
              Online {formatInr(analytics.totalOnline)} · Cash {formatInr(analytics.totalCash)}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('live_orders')}
            className="rounded-xl border border-line bg-surface p-5 text-left hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-ink-muted">
              Avg Order Value &amp; Fulfillment
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-ink tabular-nums">
              {formatInr(analytics.aov)}
            </p>
            <p className="mt-1.5 text-xs text-ink-muted font-mono tabular-nums">
              Avg dispatch:{' '}
              {analytics.avgProcessingMins !== null ? `${analytics.avgProcessingMins} mins` : '—'} ·{' '}
              {analytics.cancellationRate.toFixed(1)}% cancel
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="rounded-xl border border-line bg-surface p-5 text-left hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-ink-muted">
              Pending Payments &amp; Refunds
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {formatInr(analytics.pendingAmount)}
            </p>
            <p className="mt-1.5 text-xs text-ink-muted font-mono tabular-nums">
              Refunds issued: {formatInr(analytics.totalRefunds)}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="rounded-xl border border-line bg-surface p-5 text-left hover:border-accent/50 transition-colors"
          >
            <p className="text-xs font-medium text-ink-muted">
              User Accounts &amp; Top Method
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-ink tabular-nums">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
            </p>
            <p className="mt-1.5 text-xs text-ink-muted font-mono tabular-nums">
              {analytics.mostUsedMethod
                ? `Top method: ${analytics.mostUsedMethod} (${analytics.mostUsedCount} txns)`
                : 'No transactions yet'}
            </p>
          </button>
        </div>
      </section>

      {/* Sales Trajectory + Apparel Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line-subtle pb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">
                {salesView === 'daily' ? 'Sales by Day' : 'Sales by Month'}
              </h2>
              {activeBar && (
                <p className="mt-0.5 font-mono text-xs text-ink-muted tabular-nums">
                  {activeBar.label} · {formatInr(activeBar.revenue)} · {activeBar.orders}{' '}
                  {activeBar.orders === 1 ? 'order' : 'orders'}
                </p>
              )}
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-subtle p-1 self-start">
              <button
                type="button"
                onClick={() => setSalesView('daily')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  salesView === 'daily'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                By Day
              </button>
              <button
                type="button"
                onClick={() => setSalesView('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  salesView === 'monthly'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                By Month
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[460px] h-56 select-none"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padTop + plotH - ratio * plotH;
                const val = Math.round(maxRev * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={padX}
                      x2={chartW - padX}
                      y1={y}
                      y2={y}
                      className="stroke-line-subtle"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-ink-muted text-[10px] font-mono tabular-nums"
                    >
                      {formatInr(val, true)}
                    </text>
                  </g>
                );
              })}

              {chartSeries.map((pt, idx) => {
                const slotW = plotW / chartSeries.length;
                const barW = Math.min(44, slotW * 0.55);
                const x = padX + idx * slotW + (slotW - barW) / 2;
                const barH = pt.revenue > 0 ? Math.max(4, (pt.revenue / maxRev) * plotH) : 2;
                const y = padTop + plotH - barH;
                const selected =
                  hoveredIdx === idx ||
                  (hoveredIdx === null && idx === chartSeries.length - 1);

                return (
                  <g
                    key={pt.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={4}
                      className={
                        selected && pt.revenue > 0
                          ? 'fill-accent transition-colors'
                          : 'fill-chart-muted transition-colors'
                      }
                    />
                    <text
                      x={x + barW / 2}
                      y={chartH - 7}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        selected ? 'fill-accent-text font-semibold' : 'fill-ink-muted'
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Low Stock SKU Alerts */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-xl border border-line bg-surface p-6">
          <div>
            <div className="flex items-center justify-between border-b border-line-subtle pb-4">
              <h2 className="font-display text-base font-semibold text-ink">
                Low-Stock SKUs
              </h2>
              <button
                type="button"
                onClick={() => onNavigate(products.length === 0 ? 'website_upload' : 'inventory')}
                className="text-xs font-semibold text-accent-text hover:underline"
              >
                {products.length === 0 ? 'Add Products' : 'Manage Stock'}
              </button>
            </div>

            {products.length === 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-ink-muted">
                  No products in your catalog yet. Upload your first product to track inventory thresholds.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('website_upload')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
                >
                  <span>Upload to Website</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ) : lowStockItems.length === 0 ? (
              <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-400">
                All {products.length} SKUs are adequately stocked.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-line-subtle">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">
                        {item.name}
                      </p>
                      <p className="font-mono text-[11px] text-ink-muted">{item.sku}</p>
                    </div>
                    <span className="font-mono font-semibold text-red-700 dark:text-red-400 shrink-0 tabular-nums">
                      {item.stockQuantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-line-subtle pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">Total Cash Collected</span>
              <span className="font-mono font-semibold text-ink tabular-nums">
                {formatInr(analytics.totalCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Total Online Payments</span>
              <span className="font-mono font-semibold text-ink tabular-nums">
                {formatInr(analytics.totalOnline)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Live Orders Snapshot & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-line-subtle px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-ink">
              Ongoing Orders
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('live_orders')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
            >
              <span>Live Orders Board</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          {ongoingOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs font-medium text-ink">No ongoing orders</p>
              <p className="mt-1 text-xs text-ink-muted">
                Active storefront orders in fulfillment will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line-subtle">
              {ongoingOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelectOrder(o)}
                  className="w-full px-5 py-3 text-left flex items-center justify-between gap-3 hover:bg-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-ink">
                      {o.orderNumber} · {o.customerName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-secondary truncate">
                      {o.items.map((i) => `${i.quantity}× ${i.name} (${i.variant})`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <OrderStatusText status={o.orderStatus} />
                    <p className="mt-0.5 font-mono text-xs font-semibold text-ink tabular-nums">
                      {formatInr(o.totalAmount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-line-subtle px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-ink">
              Recent Transactions
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
            >
              <span>All Transactions</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          {recentTx.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs font-medium text-ink">No transactions recorded yet</p>
              <p className="mt-1 text-xs text-ink-muted">
                Payment gateway settlements and cash records will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line-subtle">
              {recentTx.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="w-full px-5 py-3 text-left flex items-center justify-between gap-3 hover:bg-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-ink">
                      {tx.id} · {tx.orderNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {tx.customerName} · {tx.paymentMethod} · {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <TransactionStatusText status={tx.status} />
                    <p className="mt-0.5 font-mono text-xs font-semibold text-ink tabular-nums">
                      {formatInr(tx.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
