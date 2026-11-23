import {
  Ban,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Phone,
  Printer,
  Save,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  ApparelOrder,
  OrderActivityLog,
  OrderStatus,
  OrderStatusHistoryItem,
  Transaction,
} from '../../types/apparel';
import {
  formatDateTime,
  formatInr,
  getMinutesElapsed,
  isOngoingOrder,
  ORDER_STATUS_LABELS,
} from '../../utils/apparelFormatters';
import { OrderStatusText, PaymentStateText } from './ApparelStatusText';

interface ApparelOrderDrawerProps {
  order: ApparelOrder | null;
  transactions: Transaction[];
  statusHistory: OrderStatusHistoryItem[];
  activityLogs: OrderActivityLog[];
  onClose: () => void;
  onUpdateStatus: (order: ApparelOrder, nextStatus: OrderStatus, note?: string) => void;
  onCancelOrder: (order: ApparelOrder, reason: string, isReject?: boolean) => void;
  onSaveStaffNotes: (orderId: string, notes: string) => void;
  onOpenTransaction: (tx: Transaction) => void;
  onPrintDocument: (order: ApparelOrder, docType: 'packing_slip' | 'invoice') => void;
}

const WORKFLOW_STEPS: OrderStatus[] = [
  'new_order',
  'confirmed',
  'packing',
  'ready',
  'out_for_delivery',
  'completed',
];

export function ApparelOrderDrawer({
  order,
  transactions,
  statusHistory,
  activityLogs,
  onClose,
  onUpdateStatus,
  onCancelOrder,
  onSaveStaffNotes,
  onOpenTransaction,
  onPrintDocument,
}: ApparelOrderDrawerProps) {
  const [notesDraft, setNotesDraft] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (order) {
      setNotesDraft(order.staffNotes);
      setCancelOpen(false);
      setCancelReason('');
    }
  }, [order]);

  if (!order) return null;

  const linkedTx = transactions.filter((t) => t.orderId === order.id);
  const orderHistory = statusHistory.filter((h) => h.orderId === order.id);
  const orderLogs = activityLogs.filter((l) => l.orderId === order.id);
  const ongoing = isOngoingOrder(order.orderStatus);
  const elapsedMinutes = getMinutesElapsed(
    order.createdAt,
    order.completedAt ? new Date(order.completedAt).getTime() : Date.now()
  );

  const visibleSteps =
    order.orderType === 'Store Pickup'
      ? WORKFLOW_STEPS.filter((s) => s !== 'out_for_delivery')
      : WORKFLOW_STEPS;

  const cleanPhone = order.customerPhone.replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${order.customerName}, your Kova Studio order ${order.orderNumber} is currently ${ORDER_STATUS_LABELS[order.orderStatus]}.`
  )}`;

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    onCancelOrder(order, cancelReason.trim(), order.orderStatus === 'new_order');
    setCancelOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order details for ${order.orderNumber}`}
        className="relative z-50 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111827] overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                {order.orderNumber}
              </h2>
              <OrderStatusText status={order.orderStatus} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {order.orderType} · Received {formatDateTime(order.createdAt)} · Processing time:{' '}
              {elapsedMinutes}m
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order drawer"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Print & Customer Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintDocument(order, 'packing_slip')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Print Packing Slip</span>
            </button>
            <button
              type="button"
              onClick={() => onPrintDocument(order, 'invoice')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Print Customer Invoice</span>
            </button>
            <a
              href={`tel:${order.customerPhone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Call</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>WhatsApp Update</span>
            </a>
          </div>

          {/* Fulfillment Workflow Stepper */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Fulfillment Workflow
              </h3>
              {ongoing && !cancelOpen && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{order.orderStatus === 'new_order' ? 'Reject / Cancel' : 'Cancel Order'}</span>
                </button>
              )}
            </div>

            {order.orderStatus === 'cancelled' || order.orderStatus === 'rejected' ? (
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <p className="font-semibold">
                  Order {ORDER_STATUS_LABELS[order.orderStatus]}
                </p>
                {order.cancellationReason && (
                  <p className="mt-1">Reason: {order.cancellationReason}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleSteps.map((step) => {
                  const isCurrent = order.orderStatus === step;
                  const currentIdx = visibleSteps.indexOf(order.orderStatus);
                  const stepIdx = visibleSteps.indexOf(step);
                  const isCompleted = stepIdx < currentIdx || order.orderStatus === 'completed';

                  return (
                    <button
                      key={step}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => onUpdateStatus(order, step)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : isCompleted
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted && !isCurrent && (
                        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                      <span>{ORDER_STATUS_LABELS[step]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {cancelOpen && (
              <form
                onSubmit={handleCancelSubmit}
                className="mt-3 border-t border-slate-200 pt-3 space-y-2.5 dark:border-slate-800"
              >
                <label className="block text-xs font-medium text-slate-900 dark:text-slate-100">
                  Cancellation / Rejection Reason *
                </label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Requested size out of stock, customer requested cancellation..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="px-3 py-1 text-xs text-slate-500"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Customer & Shipping */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-500 dark:text-slate-400">Customer</h3>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {order.customerName}
              </p>
              <p className="mt-0.5 font-mono text-slate-700 dark:text-slate-300">
                {order.customerPhone}
              </p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">{order.customerEmail}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-500 dark:text-slate-400">
                Fulfillment ({order.orderType})
              </h3>
              <p className="mt-1 text-slate-900 dark:text-slate-100">
                {order.orderType === 'Delivery'
                  ? order.deliveryAddress ?? 'Address pending'
                  : 'Lavelle Road Flagship Pickup Desk'}
              </p>
              {order.customerInstructions && (
                <p className="mt-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  Note: &ldquo;{order.customerInstructions}&rdquo;
                </p>
              )}
            </div>
          </section>

          {/* Garments & Invoice Breakdown */}
          <section className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
              Garments & Sizing
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {item.quantity}×
                    </span>{' '}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.sku} · {item.variant}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatInr(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 space-y-1 text-xs dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatInr(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST</span>
                <span className="font-mono tabular-nums">{formatInr(order.tax)}</span>
              </div>
              {order.shippingFee > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Shipping Fee</span>
                  <span className="font-mono tabular-nums">{formatInr(order.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                <span>Total Payable</span>
                <span className="font-mono text-sm tabular-nums">
                  {formatInr(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Linked Transactions */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Payment & Traceable Transactions
              </h3>
              <PaymentStateText state={order.paymentStatus} />
            </div>

            {linkedTx.length === 0 ? (
              <p className="text-xs text-slate-500">No transaction record linked.</p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {linkedTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {tx.id} · {tx.paymentMethod} ({tx.gatewayProvider})
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Ref: {tx.gatewayReference ?? 'Pending'} · Status: {tx.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenTransaction(tx)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <span>Open Txn</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Internal Staff Notes */}
          <section className="space-y-2">
            <label
              htmlFor="apparel-staff-notes"
              className="block text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              Internal Warehouse / Stylist Notes
            </label>
            <div className="flex gap-2">
              <input
                id="apparel-staff-notes"
                type="text"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add tailoring, QC, or courier handoff note..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onSaveStaffNotes(order.id, notesDraft)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save</span>
              </button>
            </div>
          </section>

          {/* Status History & Logs */}
          <section className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Status History & Activity Log
            </h3>
            <div className="space-y-2 text-xs">
              {orderHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {h.previousStatus === 'none'
                        ? `Created → ${ORDER_STATUS_LABELS[h.newStatus]}`
                        : `${ORDER_STATUS_LABELS[h.previousStatus]} → ${ORDER_STATUS_LABELS[h.newStatus]}`}
                    </span>
                    <span className="ml-2 text-slate-500">by {h.changedBy}</span>
                    {h.note && <p className="text-[11px] text-slate-600 dark:text-slate-400">{h.note}</p>}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatDateTime(h.timestamp)}
                  </span>
                </div>
              ))}
              {orderLogs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {l.action}:
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{l.details}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatDateTime(l.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
