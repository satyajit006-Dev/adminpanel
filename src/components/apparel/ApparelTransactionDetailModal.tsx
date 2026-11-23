import { CheckCircle2, Download, ExternalLink, Printer, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ApparelOrder, PaymentEvent, RefundRecord, Transaction } from '../../types/apparel';
import { formatDateTime, formatInr } from '../../utils/apparelFormatters';
import { TransactionStatusText } from './ApparelStatusText';

interface ApparelTransactionDetailModalProps {
  transaction: Transaction | null;
  order: ApparelOrder | null;
  paymentEvents: PaymentEvent[];
  refunds: RefundRecord[];
  onClose: () => void;
  onOpenOrder: (order: ApparelOrder) => void;
  onPrintInvoice: (order: ApparelOrder) => void;
  onVerifyWebhookPayment: (tx: Transaction) => void;
  onConfirmCashCollected: (tx: Transaction) => void;
  onIssueRefund: (tx: Transaction, amount: number, reason: string) => void;
}

export function ApparelTransactionDetailModal({
  transaction,
  order,
  paymentEvents,
  refunds,
  onClose,
  onOpenOrder,
  onPrintInvoice,
  onVerifyWebhookPayment,
  onConfirmCashCollected,
  onIssueRefund,
}: ApparelTransactionDetailModalProps) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (transaction) {
      const remaining = Math.max(0, transaction.amount - transaction.refundedAmount);
      setRefundAmount(String(remaining));
      setRefundReason('');
      setRefundOpen(false);
    }
  }, [transaction]);

  if (!transaction) return null;

  const remainingRefundable = Math.max(0, transaction.amount - transaction.refundedAmount);
  const canRefund =
    (transaction.status === 'success' || transaction.status === 'partially_refunded') &&
    remainingRefundable > 0;

  const events = paymentEvents.filter((e) => e.transactionId === transaction.id);
  const txRefunds = refunds.filter((r) => r.transactionId === transaction.id);

  const handleDownloadReceipt = () => {
    const lines = [
      'KOVA STUDIO — PAYMENT RECEIPT',
      '==============================',
      `Transaction ID : ${transaction.id}`,
      `Order Number   : ${transaction.orderNumber}`,
      `Customer       : ${transaction.customerName}`,
      `Method         : ${transaction.paymentMethod} (${transaction.gatewayProvider})`,
      `Gateway Ref    : ${transaction.gatewayReference ?? 'N/A'}`,
      `Amount         : ${formatInr(transaction.amount)}`,
      `Refunded       : ${formatInr(transaction.refundedAmount)}`,
      `Status         : ${transaction.status.toUpperCase()}`,
      `Webhook Valid  : ${transaction.verifiedByWebhook ? 'Verified' : 'Unverified'}`,
      `Date           : ${formatDateTime(transaction.createdAt)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transaction.id}-receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(refundAmount);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > remainingRefundable) return;
    if (!refundReason.trim()) return;
    onIssueRefund(transaction, numeric, refundReason.trim());
    setRefundOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Transaction details for ${transaction.id}`}
        className="relative z-10 w-full max-w-2xl rounded-xl border border-line bg-surface shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-base font-bold text-ink">
                {transaction.id}
              </h2>
              <TransactionStatusText status={transaction.status} />
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {transaction.customerName} · {transaction.paymentMethod} via{' '}
              {transaction.gatewayProvider}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction modal"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-hover hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Action Strip */}
          <div className="flex flex-wrap items-center gap-2">
            {order && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrder(order);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink"
              >
                <span>View Order {order.orderNumber}</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Receipt</span>
            </button>
            {order && (
              <button
                type="button"
                onClick={() => onPrintInvoice(order)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Print Invoice</span>
              </button>
            )}
            {transaction.status === 'pending' && transaction.paymentMethod === 'Cash' && (
              <button
                type="button"
                onClick={() => onConfirmCashCollected(transaction)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Confirm Cash Collected</span>
              </button>
            )}
            {transaction.status === 'pending' && transaction.paymentMethod !== 'Cash' && (
              <button
                type="button"
                onClick={() => onVerifyWebhookPayment(transaction)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Verify Gateway Webhook</span>
              </button>
            )}
            {canRefund && !refundOpen && (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Process Refund</span>
              </button>
            )}
          </div>

          {/* Refund Form */}
          {refundOpen && (
            <form
              onSubmit={handleRefundSubmit}
              className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3 dark:border-red-900/50 dark:bg-red-950/20"
            >
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Issue Refund against {transaction.id} (Max refundable:{' '}
                {formatInr(remainingRefundable)})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary">
                    Refund Amount (INR)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={remainingRefundable}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-ink-secondary">
                    Return / Refund Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Size exchange unavailable, garment returned unworn..."
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundOpen(false)}
                  className="px-3 py-1 text-xs text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Refund
                </button>
              </div>
            </form>
          )}

          {/* Core Verification Metadata */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl border border-line p-4 text-xs">
            <div>
              <dt className="text-ink-muted">Amount</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold text-ink tabular-nums">
                {formatInr(transaction.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Refunded</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-ink tabular-nums">
                {formatInr(transaction.refundedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Gateway Verification</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {transaction.verifiedByWebhook ? 'Verified Webhook' : 'Pending Verification'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Gateway Reference</dt>
              <dd className="mt-0.5 font-mono text-ink">
                {transaction.gatewayReference ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Created At</dt>
              <dd className="mt-0.5 font-mono text-ink">
                {formatDateTime(transaction.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Updated At</dt>
              <dd className="mt-0.5 font-mono text-ink">
                {formatDateTime(transaction.updatedAt)}
              </dd>
            </div>
          </dl>

          {/* Refund History */}
          {txRefunds.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink mb-2">
                Linked Refunds
              </h3>
              <div className="divide-y divide-line-subtle rounded-xl border border-line">
                {txRefunds.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                    <div>
                      <p className="font-mono font-semibold text-ink">
                        {r.id} · {formatInr(r.amount)}
                      </p>
                      <p className="text-ink-muted">
                        {r.reason} · by {r.processedBy}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">
                      {formatDateTime(r.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gateway Payment Events */}
          <div>
            <h3 className="text-xs font-semibold text-ink mb-2">
              Gateway Payment Events
            </h3>
            {events.length === 0 ? (
              <p className="text-xs text-ink-muted">No gateway events recorded.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-subtle px-3 py-2"
                  >
                    <div>
                      <span className="font-mono font-semibold text-ink">
                        {evt.eventType}
                      </span>
                      <span className="ml-2 text-ink-muted">({evt.gateway})</span>
                      <p className="text-[11px] text-ink-secondary">
                        {evt.payloadSummary}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-ink-muted shrink-0">
                      {formatDateTime(evt.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
