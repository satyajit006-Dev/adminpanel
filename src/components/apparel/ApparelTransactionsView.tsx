import { Download, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ApparelOrder,
  PaymentMethodType,
  Transaction,
  TransactionStatus,
} from '../../types/apparel';
import {
  exportTransactionsCsv,
  formatDateTime,
  formatInr,
  isSameLocalDay,
} from '../../utils/apparelFormatters';
import { TransactionStatusText } from './ApparelStatusText';

interface ApparelTransactionsViewProps {
  transactions: Transaction[];
  orders: ApparelOrder[];
  onSelectTransaction: (tx: Transaction) => void;
  onSelectOrderById: (orderId: string) => void;
  onNotify: (msg: string) => void;
}

type StatusFilter = 'all' | TransactionStatus;
type MethodFilter = 'all' | PaymentMethodType;
type DateFilter = 'all' | 'today' | '7d' | '30d';

export function ApparelTransactionsView({
  transactions,
  onSelectTransaction,
  onSelectOrderById,
  onNotify,
}: ApparelTransactionsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const summary = useMemo(() => {
    const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
    const successful = transactions.filter(
      (t) => t.status === 'success' || t.status === 'partially_refunded'
    );
    const pending = transactions.filter((t) => t.status === 'pending');
    const failed = transactions.filter((t) => t.status === 'failed');
    const refundedAmount = transactions.reduce((s, t) => s + t.refundedAmount, 0);
    const cashCollected = successful
      .filter((t) => t.paymentMethod === 'Cash')
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);
    const onlineCollection = successful
      .filter((t) => t.paymentMethod !== 'Cash')
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);
    const todayRevenue = successful
      .filter((t) => isSameLocalDay(t.createdAt))
      .reduce((s, t) => s + (t.amount - t.refundedAmount), 0);

    return {
      totalAmount,
      successfulCount: successful.length,
      successfulAmount: successful.reduce((s, t) => s + t.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, t) => s + t.amount, 0),
      failedCount: failed.length,
      failedAmount: failed.reduce((s, t) => s + t.amount, 0),
      refundedAmount,
      cashCollected,
      onlineCollection,
      todayRevenue,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((tx) => {
        if (statusFilter !== 'all') {
          if (statusFilter === 'refunded') {
            if (tx.status !== 'refunded' && tx.status !== 'partially_refunded') return false;
          } else if (tx.status !== statusFilter) {
            return false;
          }
        }
        if (methodFilter !== 'all' && tx.paymentMethod !== methodFilter) return false;
        if (dateFilter === 'today' && !isSameLocalDay(tx.createdAt)) return false;
        if (dateFilter === '7d' && now - new Date(tx.createdAt).getTime() > 7 * 86_400_000) {
          return false;
        }
        if (dateFilter === '30d' && now - new Date(tx.createdAt).getTime() > 30 * 86_400_000) {
          return false;
        }
        if (q) {
          const hay = `${tx.id} ${tx.orderNumber} ${tx.customerName} ${
            tx.gatewayReference ?? ''
          }`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [transactions, statusFilter, methodFilter, dateFilter, searchQuery]);

  const handleExport = () => {
    exportTransactionsCsv(filtered);
    onNotify(`Exported ${filtered.length} transactions to CSV`);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setMethodFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const cards = [
    {
      label: 'Total Transaction Volume',
      value: formatInr(summary.totalAmount),
      sub: `${transactions.length} total records`,
      onClick: () => setStatusFilter('all'),
    },
    {
      label: 'Successful Transactions',
      value: formatInr(summary.successfulAmount),
      sub: `${summary.successfulCount} settled payments`,
      onClick: () => setStatusFilter('success'),
    },
    {
      label: 'Pending Transactions',
      value: formatInr(summary.pendingAmount),
      sub: `${summary.pendingCount} awaiting verification`,
      tone: 'amber' as const,
      onClick: () => setStatusFilter('pending'),
    },
    {
      label: 'Failed Transactions',
      value: formatInr(summary.failedAmount),
      sub: `${summary.failedCount} unsuccessful attempts`,
      tone: 'red' as const,
      onClick: () => setStatusFilter('failed'),
    },
    {
      label: 'Refunded Amount',
      value: formatInr(summary.refundedAmount),
      sub: 'Full & partial apparel refunds',
      onClick: () => setStatusFilter('refunded'),
    },
    {
      label: 'Cash Collected',
      value: formatInr(summary.cashCollected),
      sub: 'Flagship POS & COD drawer',
      onClick: () => setMethodFilter('Cash'),
    },
    {
      label: 'Online Collection',
      value: formatInr(summary.onlineCollection),
      sub: 'UPI, Card & Net Banking',
      onClick: () => setMethodFilter('UPI'),
    },
    {
      label: "Today's Settled Revenue",
      value: formatInr(summary.todayRevenue),
      sub: 'Net of today’s refunds',
      tone: 'green' as const,
      onClick: () => setDateFilter('today'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 8 Summary Cards */}
      <section aria-label="Transaction summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="rounded-xl border border-line bg-surface p-4 text-left hover:border-accent/50 transition-colors"
            >
              <p className="text-xs font-medium text-ink-muted">
                {card.label}
              </p>
              <p
                className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${
                  card.tone === 'green'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : card.tone === 'amber'
                      ? 'text-amber-700 dark:text-amber-400'
                      : card.tone === 'red'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-ink'
                }`}
              >
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {card.sub}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Filters & CSV Export */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1 self-start">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'success', label: 'Successful' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' },
              { id: 'refunded', label: 'Refunded' },
            ] as const
          ).map((item) => {
            const active = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-hover hover:text-ink disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search, Method, Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Transaction ID, Order ID, customer, or gateway ref..."
            aria-label="Search transactions"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-8 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear transaction search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="sm:col-span-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
            aria-label="Filter by payment method"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary focus:border-accent focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Net Banking">Net Banking</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            aria-label="Filter by date range"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary focus:border-accent focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Transaction History Table */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-semibold text-ink">
              No transactions match your filters
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs font-medium text-ink-muted">
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment Method</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Transaction Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Gateway Reference</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-sm">
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-hover transition-colors"
                  >
                    <td className="py-3 pl-5 pr-3 font-mono text-xs font-bold text-ink whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectOrderById(tx.orderId)}
                        className="font-mono text-xs font-semibold text-accent-text hover:underline"
                      >
                        {tx.orderNumber}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs font-medium text-ink whitespace-nowrap">
                      {tx.customerName}
                    </td>
                    <td className="py-3 px-3 text-xs text-ink-secondary whitespace-nowrap">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-ink tabular-nums whitespace-nowrap">
                      {formatInr(tx.amount)}
                      {tx.refundedAmount > 0 && (
                        <span className="block text-[10px] font-normal text-ink-muted">
                          -{formatInr(tx.refundedAmount)} refunded
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <TransactionStatusText status={tx.status} />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-ink-muted whitespace-nowrap tabular-nums">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-ink-secondary whitespace-nowrap">
                      {tx.gatewayReference ?? '—'}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectTransaction(tx)}
                        className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink"
                      >
                        View Details
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
