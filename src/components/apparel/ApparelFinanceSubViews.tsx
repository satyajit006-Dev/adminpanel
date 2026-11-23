import { useMemo } from 'react';
import type {
  CashCollectionRecord,
  PaymentMethodConfig,
  RefundRecord,
  Transaction,
} from '../../types/apparel';
import { formatDateTime, formatInr } from '../../utils/apparelFormatters';

interface ApparelRefundsViewProps {
  refunds: RefundRecord[];
  onOpenTransactionById: (txId: string) => void;
  onOpenOrderById: (orderId: string) => void;
}

export function ApparelRefundsView({
  refunds,
  onOpenTransactionById,
  onOpenOrderById,
}: ApparelRefundsViewProps) {
  const totalRefunded = useMemo(
    () => refunds.reduce((sum, r) => sum + r.amount, 0),
    [refunds]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs font-medium text-ink-muted">
            Total Refunded Amount
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-ink tabular-nums">
            {formatInr(totalRefunded)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs font-medium text-ink-muted">
            Processed Refunds
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-ink tabular-nums">
            {refunds.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs font-medium text-ink-muted">
            Ledger Traceability
          </p>
          <p className="mt-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            100% Linked to Original Txn &amp; Order
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-subtle text-xs font-medium text-ink-muted">
                <th className="py-3 pl-5 pr-3">Refund ID</th>
                <th className="py-3 px-3">Transaction</th>
                <th className="py-3 px-3">Order</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Processed By</th>
                <th className="py-3 pl-3 pr-5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle text-xs">
              {refunds.map((r) => (
                <tr key={r.id} className="hover:bg-hover transition-colors">
                  <td className="py-3 pl-5 pr-3 font-mono font-bold text-ink">
                    {r.id}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onOpenTransactionById(r.transactionId)}
                      className="font-mono font-semibold text-accent-text hover:underline"
                    >
                      {r.transactionId}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onOpenOrderById(r.orderId)}
                      className="font-mono font-semibold text-accent-text hover:underline"
                    >
                      {r.orderNumber}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-medium text-ink">
                    {r.customerName}
                  </td>
                  <td className="py-3 px-3 text-ink-secondary max-w-xs">
                    {r.reason}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-red-700 dark:text-red-400 tabular-nums">
                    -{formatInr(r.amount)}
                  </td>
                  <td className="py-3 px-3 text-ink-muted">{r.processedBy}</td>
                  <td className="py-3 pl-3 pr-5 text-right font-mono text-ink-muted whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

interface ApparelFinancialReportsViewProps {
  transactions: Transaction[];
  cashCollections: CashCollectionRecord[];
  paymentMethods: PaymentMethodConfig[];
  onTogglePaymentMethod: (id: string) => void;
}

export function ApparelFinancialReportsView({
  transactions,
  cashCollections,
  paymentMethods,
  onTogglePaymentMethod,
}: ApparelFinancialReportsViewProps) {
  const breakdown = useMemo(() => {
    const map = new Map<string, { count: number; gross: number; refunded: number }>();
    for (const tx of transactions) {
      if (tx.status === 'failed' || tx.status === 'pending') continue;
      const cur = map.get(tx.paymentMethod) ?? { count: 0, gross: 0, refunded: 0 };
      cur.count += 1;
      cur.gross += tx.amount;
      cur.refunded += tx.refundedAmount;
      map.set(tx.paymentMethod, cur);
    }
    return Array.from(map.entries()).map(([method, stats]) => ({
      method,
      ...stats,
      net: stats.gross - stats.refunded,
    }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Payment Method Breakdown */}
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-base font-semibold text-ink">
          Settled Apparel Collection by Payment Method
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {breakdown.map((row) => (
            <div
              key={row.method}
              className="rounded-lg border border-line p-4"
            >
              <p className="text-xs font-semibold text-ink">
                {row.method}
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-ink tabular-nums">
                {formatInr(row.net)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted font-mono">
                {row.count} txns · Gross {formatInr(row.gross)} · Refunds {formatInr(row.refunded)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Collections Ledger */}
        <section className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="border-b border-line-subtle px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-ink">
              Cash Collections Ledger (Flagship POS &amp; COD)
            </h2>
          </div>
          <div className="divide-y divide-line-subtle">
            {cashCollections.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                <div>
                  <p className="font-mono font-semibold text-ink">
                    {c.orderNumber} · {c.transactionId}
                  </p>
                  <p className="text-ink-muted">
                    {c.registerShift} · Collected by {c.collectedBy}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatInr(c.amount)}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {formatDateTime(c.collectedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Payment Methods */}
        <section className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="border-b border-line-subtle px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-ink">
              Supported Payment Methods
            </h2>
          </div>
          <div className="divide-y divide-line-subtle">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-ink">{pm.name}</p>
                  <p className="text-ink-muted">
                    {pm.provider} · Settlement: {pm.settlementWindow}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePaymentMethod(pm.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    pm.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-subtle text-ink-muted'
                  }`}
                >
                  {pm.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
