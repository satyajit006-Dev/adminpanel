import type {
  ApparelOrder,
  OrderStatus,
  Transaction,
  TransactionStatus,
  UserAccount,
} from '../types/apparel';

export function formatInr(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getMinutesElapsed(iso: string, nowMs: number): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 60000));
}

export function getNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function isOngoingOrder(status: OrderStatus): boolean {
  return (
    status === 'new_order' ||
    status === 'confirmed' ||
    status === 'packing' ||
    status === 'ready' ||
    status === 'out_for_delivery'
  );
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new_order: 'New Order',
  confirmed: 'Confirmed',
  packing: 'Packing & QC',
  ready: 'Ready for Dispatch',
  out_for_delivery: 'Out for Delivery',
  completed: 'Delivered / Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export const TX_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pending',
  success: 'Success',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};

export function isSameLocalDay(iso: string, referenceDate = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === referenceDate.getFullYear() &&
    d.getMonth() === referenceDate.getMonth() &&
    d.getDate() === referenceDate.getDate()
  );
}

export function exportTransactionsCsv(
  transactions: Transaction[],
  filename = 'kova-studio-transactions.csv'
): void {
  const headers = [
    'Transaction ID',
    'Order Number',
    'Customer',
    'Payment Method',
    'Provider',
    'Amount (INR)',
    'Refunded (INR)',
    'Status',
    'Webhook Verified',
    'Gateway Reference',
    'Created At',
  ];
  const escape = (val: string | number | boolean | undefined) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = transactions.map((t) =>
    [
      t.id,
      t.orderNumber,
      t.customerName,
      t.paymentMethod,
      t.gatewayProvider,
      t.amount,
      t.refundedAmount,
      TX_STATUS_LABELS[t.status],
      t.verifiedByWebhook ? 'Yes' : 'No',
      t.gatewayReference ?? '',
      formatDateTime(t.createdAt),
    ]
      .map(escape)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportOrdersCsv(
  orders: ApparelOrder[],
  filename = 'kova-studio-orders.csv'
): void {
  const headers = [
    'Order Number',
    'Customer',
    'Phone',
    'Fulfillment Type',
    'Garments',
    'Total (INR)',
    'Payment Status',
    'Payment Method',
    'Order Status',
    'Created At',
  ];
  const escape = (val: string | number | undefined) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.customerName,
      o.customerPhone,
      o.orderType,
      o.items.map((i) => `${i.quantity}x ${i.name} (${i.variant})`).join('; '),
      o.totalAmount,
      o.paymentStatus,
      o.paymentMethod,
      ORDER_STATUS_LABELS[o.orderStatus],
      formatDateTime(o.createdAt),
    ]
      .map(escape)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAccountsCsv(
  accounts: UserAccount[],
  filename = 'kova-studio-accounts.csv'
): void {
  const headers = [
    'Account ID',
    'Full Name',
    'Email',
    'Phone',
    'Segment',
    'Role',
    'Tier',
    'Status',
    'City',
    'Country',
    'Total Orders',
    'Lifetime Spend (INR)',
    'Return Rate (%)',
    'Tops Size',
    'Bottoms Size',
    'Fit Preference',
  ];
  const escape = (val: string | number | undefined) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = accounts.map((acc) =>
    [
      acc.id,
      acc.fullName,
      acc.email,
      acc.phone,
      acc.segment,
      acc.role,
      acc.tier,
      acc.status,
      acc.city,
      acc.country,
      acc.totalOrders,
      acc.lifetimeSpend,
      acc.returnRate.toFixed(1),
      acc.sizeProfile.tops,
      acc.sizeProfile.bottoms,
      acc.sizeProfile.fitPreference,
    ]
      .map(escape)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
