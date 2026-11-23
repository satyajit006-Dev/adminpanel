import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react';
import type {
  AccountStatus,
  OrderPaymentState,
  OrderStatus,
  TransactionStatus,
} from '../../types/apparel';
import { ORDER_STATUS_LABELS, TX_STATUS_LABELS } from '../../utils/apparelFormatters';

export function OrderStatusText({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'new_order':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'packing':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
          <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <PackageCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'out_for_delivery':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap">
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'cancelled':
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap">
          <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{ORDER_STATUS_LABELS[status]}</span>
        </span>
      );
  }
}

export function TransactionStatusText({ status }: { status: TransactionStatus }) {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{TX_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{TX_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{TX_STATUS_LABELS[status]}</span>
        </span>
      );
    case 'refunded':
    case 'partially_refunded':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{TX_STATUS_LABELS[status]}</span>
        </span>
      );
  }
}

export function PaymentStateText({ state }: { state: OrderPaymentState }) {
  if (state === 'Paid') {
    return (
      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        Paid
      </span>
    );
  }
  if (state === 'Unpaid') {
    return (
      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        Unpaid
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
      {state}
    </span>
  );
}

export function AccountStatusText({ status }: { status: AccountStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Pending</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap">
      <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Suspended</span>
    </span>
  );
}
