/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toast, type ToastMessage } from './components/Toast';
import {
  ApparelAccountDrawer,
  ApparelAccountsView,
  ApparelCreateAccountModal,
} from './components/apparel/ApparelAccountsView';
import { ApparelAllOrdersView } from './components/apparel/ApparelAllOrdersView';
import { ApparelDashboardView } from './components/apparel/ApparelDashboardView';
import {
  ApparelFinancialReportsView,
  ApparelRefundsView,
} from './components/apparel/ApparelFinanceSubViews';
import { ApparelLiveOrdersView } from './components/apparel/ApparelLiveOrdersView';
import { ApparelOrderDrawer } from './components/apparel/ApparelOrderDrawer';
import { ApparelSidebar } from './components/apparel/ApparelSidebar';
import {
  ApparelCategoriesView,
  ApparelDeliveryView,
  ApparelInventoryView,
  ApparelProductsView,
  ApparelSettingsView,
  ApparelStaffView,
} from './components/apparel/ApparelStoreViews';
import { ApparelTopBar } from './components/apparel/ApparelTopBar';
import { ApparelTransactionDetailModal } from './components/apparel/ApparelTransactionDetailModal';
import { ApparelTransactionsView } from './components/apparel/ApparelTransactionsView';
import { PrintApparelDocumentModal } from './components/apparel/PrintApparelDocumentModal';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CASH_COLLECTIONS,
  INITIAL_CATEGORIES,
  INITIAL_DELIVERY_ZONES,
  INITIAL_ORDERS,
  INITIAL_PAYMENT_EVENTS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_PRODUCTS,
  INITIAL_REFUNDS,
  INITIAL_SETTINGS,
  INITIAL_STAFF,
  INITIAL_STATUS_HISTORY,
  INITIAL_TRANSACTIONS,
} from './data/apparelSeedData';
import type {
  AccountStatus,
  ApparelCategory,
  ApparelOrder,
  ApparelProduct,
  ApparelRoute,
  BusinessSettings,
  CashCollectionRecord,
  LiveNotification,
  LoyaltyTier,
  OrderActivityLog,
  OrderStatus,
  OrderStatusHistoryItem,
  PaymentEvent,
  PaymentMethodConfig,
  PaymentMethodType,
  RefundRecord,
  ShippingZone,
  StaffMember,
  Transaction,
  UserAccount,
} from './types/apparel';
import {
  formatInr,
  getNowTimestamp,
  isOngoingOrder,
  ORDER_STATUS_LABELS,
} from './utils/apparelFormatters';

const STORAGE_PREFIX = 'kova_apparel_admin_v1_';

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

const GARMENT_VARIANTS = [
  'Camel · Size M',
  'Charcoal · Size L',
  'Ecru · Size S',
  'Raw Indigo · 32x30',
  'Ivory · Size M',
  'Espresso · EU 39',
];

export default function App() {
  const [activeRoute, setActiveRoute] = useState<ApparelRoute>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + 'theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Core Clothing Business Database Entities
  const [accounts, setAccounts] = useState<UserAccount[]>(() =>
    loadState('accounts', INITIAL_ACCOUNTS)
  );
  const [orders, setOrders] = useState<ApparelOrder[]>(() => loadState('orders', INITIAL_ORDERS));
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadState('transactions', INITIAL_TRANSACTIONS)
  );
  const [refunds, setRefunds] = useState<RefundRecord[]>(() =>
    loadState('refunds', INITIAL_REFUNDS)
  );
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>(() =>
    loadState('payment_events', INITIAL_PAYMENT_EVENTS)
  );
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryItem[]>(() =>
    loadState('status_history', INITIAL_STATUS_HISTORY)
  );
  const [activityLogs, setActivityLogs] = useState<OrderActivityLog[]>(() =>
    loadState('activity_logs', INITIAL_ACTIVITY_LOGS)
  );
  const [cashCollections, setCashCollections] = useState<CashCollectionRecord[]>(() =>
    loadState('cash_collections', INITIAL_CASH_COLLECTIONS)
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() =>
    loadState('payment_methods', INITIAL_PAYMENT_METHODS)
  );

  // Catalog & Operations Entities
  const [products, setProducts] = useState<ApparelProduct[]>(() =>
    loadState('products', INITIAL_PRODUCTS)
  );
  const [categories, setCategories] = useState<ApparelCategory[]>(() =>
    loadState('categories', INITIAL_CATEGORIES)
  );
  const [deliveryZones, setDeliveryZones] = useState<ShippingZone[]>(() =>
    loadState('delivery_zones', INITIAL_DELIVERY_ZONES)
  );
  const [staff, setStaff] = useState<StaffMember[]>(() => loadState('staff', INITIAL_STAFF));
  const [settings, setSettings] = useState<BusinessSettings>(() =>
    loadState('settings', INITIAL_SETTINGS)
  );

  // Realtime Feed & Drawers/Modals
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<{
    order: ApparelOrder;
    docType: 'packing_slip' | 'invoice';
  } | null>(null);

  const [notifications, setNotifications] = useState<LiveNotification[]>([
    {
      id: 'notif-1',
      orderId: 'ord-5091',
      orderNumber: 'ORD-8491',
      title: 'New Delivery Order ORD-8491',
      subtitle: 'Aarav Mehta · ₹22,288 · Paid via UPI',
      timestamp: INITIAL_ORDERS[0].createdAt,
      read: false,
    },
    {
      id: 'notif-2',
      orderId: 'ord-5090',
      orderNumber: 'ORD-8490',
      title: 'Pending UPI Verification ORD-8490',
      subtitle: 'Diya Nair · ₹12,544 · Awaiting gateway webhook',
      timestamp: INITIAL_ORDERS[1].createdAt,
      read: false,
    },
  ]);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = useCallback((message: string) => {
    setToast({ id: String(Date.now()), message });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    saveState('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => saveState('accounts', accounts), [accounts]);
  useEffect(() => saveState('orders', orders), [orders]);
  useEffect(() => saveState('transactions', transactions), [transactions]);
  useEffect(() => saveState('refunds', refunds), [refunds]);
  useEffect(() => saveState('payment_events', paymentEvents), [paymentEvents]);
  useEffect(() => saveState('status_history', statusHistory), [statusHistory]);
  useEffect(() => saveState('activity_logs', activityLogs), [activityLogs]);
  useEffect(() => saveState('cash_collections', cashCollections), [cashCollections]);
  useEffect(() => saveState('payment_methods', paymentMethods), [paymentMethods]);
  useEffect(() => saveState('products', products), [products]);
  useEffect(() => saveState('categories', categories), [categories]);
  useEffect(() => saveState('delivery_zones', deliveryZones), [deliveryZones]);
  useEffect(() => saveState('staff', staff), [staff]);
  useEffect(() => saveState('settings', settings), [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Simulate incoming real-time apparel order + linked transaction + payment event + account spend update
  const handleSimulateIncomingOrder = useCallback(() => {
    const nowIso = new Date().toISOString();
    const nextSeq = 8492 + orders.length;
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORD-${nextSeq}`;

    const eligibleAccounts = accounts.filter((a) => a.status === 'Active' && a.segment !== 'Staff');
    const buyer =
      eligibleAccounts[Math.floor(Math.random() * eligibleAccounts.length)] ?? accounts[0];
    const availableProds = products.filter((p) => p.isAvailable);
    const pick1 = availableProds[Math.floor(Math.random() * availableProds.length)] ?? products[0];
    const pick2 = availableProds[Math.floor(Math.random() * availableProds.length)] ?? products[1];
    const var1 = GARMENT_VARIANTS[Math.floor(Math.random() * GARMENT_VARIANTS.length)];
    const var2 = GARMENT_VARIANTS[Math.floor(Math.random() * GARMENT_VARIANTS.length)];

    const items =
      pick1.id === pick2.id
        ? [
            {
              id: `oi-${Date.now()}`,
              productId: pick1.id,
              sku: pick1.sku,
              name: pick1.name,
              variant: var1,
              quantity: 1,
              unitPrice: pick1.price,
            },
          ]
        : [
            {
              id: `oi-${Date.now()}-1`,
              productId: pick1.id,
              sku: pick1.sku,
              name: pick1.name,
              variant: var1,
              quantity: 1,
              unitPrice: pick1.price,
            },
            {
              id: `oi-${Date.now()}-2`,
              productId: pick2.id,
              sku: pick2.sku,
              name: pick2.name,
              variant: var2,
              quantity: 1,
              unitPrice: pick2.price,
            },
          ];

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const tax = Math.round(subtotal * (settings.gstRatePct / 100));
    const orderType = Math.random() > 0.4 ? 'Delivery' : 'Store Pickup';
    const shippingFee = orderType === 'Delivery' && subtotal < 5000 ? 150 : 0;
    const totalAmount = subtotal + tax + shippingFee;

    const methodPool: PaymentMethodType[] = ['UPI', 'Card', 'Cash'];
    const paymentMethod = methodPool[Math.floor(Math.random() * methodPool.length)];
    const isOnlinePaid = paymentMethod !== 'Cash' && Math.random() > 0.2;

    const newOrder: ApparelOrder = {
      id: orderId,
      orderNumber,
      accountId: buyer.id,
      customerName: buyer.fullName,
      customerPhone: buyer.phone,
      customerEmail: buyer.email,
      deliveryAddress:
        orderType === 'Delivery' ? `14 Residency Rd, ${buyer.city}, ${buyer.country}` : undefined,
      orderType,
      items,
      subtotal,
      tax,
      shippingFee,
      totalAmount,
      paymentStatus: isOnlinePaid ? 'Paid' : 'Unpaid',
      paymentMethod,
      orderStatus: 'new_order',
      staffNotes: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const txId = `TXN-${90522 + transactions.length}`;
    const newTx: Transaction = {
      id: txId,
      orderId,
      orderNumber,
      accountId: buyer.id,
      customerName: buyer.fullName,
      paymentMethod,
      amount: totalAmount,
      refundedAmount: 0,
      currency: 'INR',
      status: isOnlinePaid ? 'success' : 'pending',
      gatewayReference:
        paymentMethod === 'Cash'
          ? `COD-${nextSeq}`
          : `pay_Rzp${Math.floor(100000 + Math.random() * 899999)}`,
      gatewayProvider: paymentMethod === 'Cash' ? 'Cash Drawer' : 'Razorpay',
      verifiedByWebhook: isOnlinePaid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newEvent: PaymentEvent = {
      id: `EVT-${Date.now()}`,
      transactionId: txId,
      orderId,
      eventType: isOnlinePaid ? 'webhook.verified' : 'payment.authorized',
      gateway: newTx.gatewayProvider,
      payloadSummary: isOnlinePaid
        ? `Webhook verified ${paymentMethod} payment (${formatInr(totalAmount)})`
        : `${paymentMethod} payment awaiting verification/collection (${formatInr(totalAmount)})`,
      verified: isOnlinePaid,
      timestamp: nowIso,
    };

    const historyEntry: OrderStatusHistoryItem = {
      id: `OSH-${Date.now()}`,
      orderId,
      previousStatus: 'none',
      newStatus: 'new_order',
      changedBy: 'Online Storefront',
      note: `Incoming ${orderType} apparel order received`,
      timestamp: nowIso,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);
    setPaymentEvents((prev) => [newEvent, ...prev]);
    setStatusHistory((prev) => [historyEntry, ...prev]);
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === buyer.id
          ? {
              ...a,
              totalOrders: a.totalOrders + 1,
              lifetimeSpend: isOnlinePaid ? a.lifetimeSpend + totalAmount : a.lifetimeSpend,
              lastActive: getNowTimestamp(),
            }
          : a
      )
    );
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        orderId,
        orderNumber,
        title: `New ${orderType} Order ${orderNumber}`,
        subtitle: `${buyer.fullName} · ${formatInr(totalAmount)} · ${
          isOnlinePaid ? `Paid (${paymentMethod})` : `Pending (${paymentMethod})`
        }`,
        timestamp: nowIso,
        read: false,
      },
      ...prev,
    ]);
    notify(`Incoming order ${orderNumber} from ${buyer.fullName} (${formatInr(totalAmount)})`);
  }, [orders.length, transactions.length, accounts, products, settings.gstRatePct, notify]);

  useEffect(() => {
    if (!realtimeEnabled) return;
    const interval = window.setInterval(() => {
      handleSimulateIncomingOrder();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [realtimeEnabled, handleSimulateIncomingOrder]);

  const handleUpdateOrderStatus = (
    order: ApparelOrder,
    nextStatus: OrderStatus,
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          orderStatus: nextStatus,
          updatedAt: nowIso,
          confirmedAt: nextStatus === 'confirmed' && !o.confirmedAt ? nowIso : o.confirmedAt,
          completedAt: nextStatus === 'completed' ? nowIso : o.completedAt,
        };
      })
    );
    setStatusHistory((prev) => [
      {
        id: `OSH-${Date.now()}`,
        orderId: order.id,
        previousStatus: order.orderStatus,
        newStatus: nextStatus,
        changedBy: 'Claire Vance',
        note: note ?? `Moved to ${ORDER_STATUS_LABELS[nextStatus]}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId: order.id,
        actor: 'Claire Vance',
        action: 'Status Updated',
        details: `${order.orderNumber} updated from ${ORDER_STATUS_LABELS[order.orderStatus]} to ${ORDER_STATUS_LABELS[nextStatus]}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    notify(`${order.orderNumber} marked as ${ORDER_STATUS_LABELS[nextStatus]}`);
  };

  const handleCancelOrder = (order: ApparelOrder, reason: string, isReject = false) => {
    const nowIso = new Date().toISOString();
    const terminal: OrderStatus = isReject ? 'rejected' : 'cancelled';
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              orderStatus: terminal,
              cancellationReason: reason,
              updatedAt: nowIso,
            }
          : o
      )
    );
    setStatusHistory((prev) => [
      {
        id: `OSH-${Date.now()}`,
        orderId: order.id,
        previousStatus: order.orderStatus,
        newStatus: terminal,
        changedBy: 'Claire Vance',
        note: reason,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId: order.id,
        actor: 'Claire Vance',
        action: isReject ? 'Order Rejected' : 'Order Cancelled',
        details: `${order.orderNumber}: ${reason}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    notify(`${order.orderNumber} ${isReject ? 'rejected' : 'cancelled'}`);
  };

  const handleSaveStaffNotes = (orderId: string, notes: string) => {
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, staffNotes: notes, updatedAt: nowIso } : o))
    );
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId,
        actor: 'Claire Vance',
        action: 'Staff Note Saved',
        details: notes || 'Cleared staff note',
        timestamp: nowIso,
      },
      ...prev,
    ]);
    notify('Internal warehouse / stylist note saved');
  };

  const handleSettleTransaction = (tx: Transaction) => {
    const nowIso = new Date().toISOString();
    const isCash = tx.paymentMethod === 'Cash';

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === tx.id
          ? { ...t, status: 'success', verifiedByWebhook: true, updatedAt: nowIso }
          : t
      )
    );
    setOrders((prev) =>
      prev.map((o) =>
        o.id === tx.orderId ? { ...o, paymentStatus: 'Paid', updatedAt: nowIso } : o
      )
    );
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === tx.accountId ? { ...a, lifetimeSpend: a.lifetimeSpend + tx.amount } : a
      )
    );
    setPaymentEvents((prev) => [
      {
        id: `EVT-${Date.now()}`,
        transactionId: tx.id,
        orderId: tx.orderId,
        eventType: isCash ? 'cash.collected' : 'webhook.verified',
        gateway: tx.gatewayProvider,
        payloadSummary: isCash
          ? `Cash collection verified (${formatInr(tx.amount)})`
          : `Gateway webhook signature verified (${formatInr(tx.amount)})`,
        verified: true,
        timestamp: nowIso,
      },
      ...prev,
    ]);

    if (isCash) {
      setCashCollections((prev) => [
        {
          id: `CSH-${Date.now()}`,
          orderId: tx.orderId,
          orderNumber: tx.orderNumber,
          transactionId: tx.id,
          collectedBy: 'Claire Vance',
          amount: tx.amount,
          registerShift: 'Flagship Active Shift',
          collectedAt: nowIso,
        },
        ...prev,
      ]);
    }

    notify(
      isCash
        ? `Cash collected for ${tx.orderNumber} (${formatInr(tx.amount)})`
        : `Webhook verified & ${tx.orderNumber} marked Paid`
    );
  };

  const handleIssueRefund = (tx: Transaction, amount: number, reason: string) => {
    const nowIso = new Date().toISOString();
    const newRefundTotal = tx.refundedAmount + amount;
    const isFull = newRefundTotal >= tx.amount;

    const refundRecord: RefundRecord = {
      id: `RFD-${305 + refunds.length}`,
      transactionId: tx.id,
      orderId: tx.orderId,
      orderNumber: tx.orderNumber,
      customerName: tx.customerName,
      amount,
      reason,
      status: 'processed',
      processedBy: 'Claire Vance (Admin)',
      createdAt: nowIso,
    };

    setRefunds((prev) => [refundRecord, ...prev]);
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === tx.id
          ? {
              ...t,
              refundedAmount: newRefundTotal,
              status: isFull ? 'refunded' : 'partially_refunded',
              updatedAt: nowIso,
            }
          : t
      )
    );
    setOrders((prev) =>
      prev.map((o) =>
        o.id === tx.orderId
          ? {
              ...o,
              paymentStatus: isFull ? 'Refunded' : 'Partially Refunded',
              updatedAt: nowIso,
            }
          : o
      )
    );
    setPaymentEvents((prev) => [
      {
        id: `EVT-${Date.now()}`,
        transactionId: tx.id,
        orderId: tx.orderId,
        eventType: 'refund.processed',
        gateway: tx.gatewayProvider,
        payloadSummary: `${isFull ? 'Full' : 'Partial'} refund ${refundRecord.id} issued (${formatInr(amount)}): ${reason}`,
        verified: true,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId: tx.orderId,
        actor: 'Claire Vance',
        action: 'Refund Processed',
        details: `${formatInr(amount)} refunded on ${tx.id} (${reason})`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    notify(`Processed ${formatInr(amount)} refund for ${tx.orderNumber}`);
  };

  // Account Handlers
  const handleUpdateAccount = (updated: UserAccount, auditSummary: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    notify(`${updated.fullName}: ${auditSummary}`);
  };

  const handleBulkUpdateStatus = (ids: string[], status: AccountStatus) => {
    const idSet = new Set(ids);
    setAccounts((prev) => prev.map((a) => (idSet.has(a.id) ? { ...a, status } : a)));
    notify(`Updated ${ids.length} account${ids.length > 1 ? 's' : ''} to ${status}`);
  };

  const handleBulkUpdateTier = (ids: string[], tier: LoyaltyTier) => {
    const idSet = new Set(ids);
    setAccounts((prev) => prev.map((a) => (idSet.has(a.id) ? { ...a, tier } : a)));
    notify(`Assigned ${tier} tier to ${ids.length} account${ids.length > 1 ? 's' : ''}`);
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccountId(null);
    if (target) notify(`Removed account ${target.fullName} (${target.id})`);
  };

  const handleCreateAccount = (newAccount: UserAccount) => {
    setAccounts((prev) => [newAccount, ...prev]);
    notify(`Created ${newAccount.segment.toLowerCase()} account for ${newAccount.fullName}`);
  };

  // Sidebar live badges
  const liveOrderCount = useMemo(
    () => orders.filter((o) => isOngoingOrder(o.orderStatus)).length,
    [orders]
  );
  const pendingTxCount = useMemo(
    () => transactions.filter((t) => t.status === 'pending').length,
    [transactions]
  );
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
    [products]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedTx = transactions.find((t) => t.id === selectedTxId) ?? null;
  const selectedTxOrder = selectedTx
    ? orders.find((o) => o.id === selectedTx.orderId) ?? null
    : null;
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <ApparelSidebar
        activeRoute={activeRoute}
        onSelectRoute={setActiveRoute}
        liveOrderCount={liveOrderCount}
        pendingTxCount={pendingTxCount}
        lowStockCount={lowStockCount}
        accountCount={accounts.length}
        realtimeConnected={realtimeEnabled}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        brandName={settings.brandName}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <ApparelTopBar
          activeRoute={activeRoute}
          isDark={isDark}
          onToggleTheme={() => setIsDark((p) => !p)}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onSimulateIncomingOrder={handleSimulateIncomingOrder}
          onOpenNewAccount={() => setCreateAccountOpen(true)}
          notifications={notifications}
          onMarkAllRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
          onSelectOrderFromNotification={(orderId) => {
            setNotifications((prev) =>
              prev.map((n) => (n.orderId === orderId ? { ...n, read: true } : n))
            );
            setSelectedOrderId(orderId);
          }}
        />

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-7 max-w-[1400px] w-full mx-auto">
          {activeRoute === 'dashboard' && (
            <ApparelDashboardView
              orders={orders}
              transactions={transactions}
              products={products}
              accounts={accounts}
              onNavigate={setActiveRoute}
              onSelectOrder={(o) => setSelectedOrderId(o.id)}
              onSelectTransaction={(tx) => setSelectedTxId(tx.id)}
            />
          )}

          {activeRoute === 'live_orders' && (
            <ApparelLiveOrdersView
              orders={orders}
              realtimeEnabled={realtimeEnabled}
              onToggleRealtime={() => setRealtimeEnabled((p) => !p)}
              onSimulateOrder={handleSimulateIncomingOrder}
              onAdvanceOrderStatus={(o, next) => handleUpdateOrderStatus(o, next)}
              onSelectOrder={(o) => setSelectedOrderId(o.id)}
            />
          )}

          {(activeRoute === 'all_orders' ||
            activeRoute === 'completed_orders' ||
            activeRoute === 'cancelled_orders') && (
            <ApparelAllOrdersView
              key={activeRoute}
              orders={orders}
              initialTab={
                activeRoute === 'completed_orders'
                  ? 'completed'
                  : activeRoute === 'cancelled_orders'
                    ? 'cancelled'
                    : 'all'
              }
              onSelectOrder={(o) => setSelectedOrderId(o.id)}
              onNotify={notify}
            />
          )}

          {activeRoute === 'transactions' && (
            <ApparelTransactionsView
              transactions={transactions}
              orders={orders}
              onSelectTransaction={(tx) => setSelectedTxId(tx.id)}
              onSelectOrderById={(orderId) => setSelectedOrderId(orderId)}
              onNotify={notify}
            />
          )}

          {activeRoute === 'refunds' && (
            <ApparelRefundsView
              refunds={refunds}
              onOpenTransactionById={(txId) => setSelectedTxId(txId)}
              onOpenOrderById={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activeRoute === 'financial_reports' && (
            <ApparelFinancialReportsView
              transactions={transactions}
              cashCollections={cashCollections}
              paymentMethods={paymentMethods}
              onTogglePaymentMethod={(id) => {
                setPaymentMethods((prev) =>
                  prev.map((pm) => (pm.id === id ? { ...pm, enabled: !pm.enabled } : pm))
                );
                notify('Updated payment method configuration');
              }}
            />
          )}

          {activeRoute === 'accounts' && (
            <ApparelAccountsView
              accounts={accounts}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              onBulkUpdateTier={handleBulkUpdateTier}
              onOpenNewAccount={() => setCreateAccountOpen(true)}
              onNotify={notify}
            />
          )}

          {activeRoute === 'products' && (
            <ApparelProductsView
              products={products}
              categories={categories}
              onToggleAvailability={(id) => {
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === id ? { ...p, isAvailable: !p.isAvailable } : p
                  )
                );
                notify('Updated garment catalog availability');
              }}
              onAddProduct={(prod) => {
                setProducts((prev) => [prod, ...prev]);
                notify(`Added ${prod.name} (${prod.sku}) to catalog`);
              }}
            />
          )}

          {activeRoute === 'categories' && (
            <ApparelCategoriesView
              categories={categories}
              products={products}
              onToggleCategory={(id) => {
                setCategories((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
                );
                notify('Updated apparel category visibility');
              }}
            />
          )}

          {activeRoute === 'inventory' && (
            <ApparelInventoryView
              products={products}
              onAdjustStock={(id, delta) => {
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === id
                      ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + delta) }
                      : p
                  )
                );
                notify('Warehouse garment stock adjusted');
              }}
            />
          )}

          {activeRoute === 'delivery' && (
            <ApparelDeliveryView
              zones={deliveryZones}
              onToggleZone={(id) => {
                setDeliveryZones((prev) =>
                  prev.map((z) => (z.id === id ? { ...z, active: !z.active } : z))
                );
                notify('Updated shipping zone status');
              }}
            />
          )}

          {activeRoute === 'staff' && (
            <ApparelStaffView
              staff={staff}
              onToggleStaffStatus={(id) => {
                setStaff((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' }
                      : s
                  )
                );
                notify('Updated staff access status');
              }}
            />
          )}

          {activeRoute === 'settings' && (
            <ApparelSettingsView
              settings={settings}
              onSaveSettings={(next) => {
                setSettings(next);
                notify('Saved Kova Studio apparel settings');
              }}
            />
          )}
        </main>
      </div>

      <ApparelOrderDrawer
        order={selectedOrder}
        transactions={transactions}
        statusHistory={statusHistory}
        activityLogs={activityLogs}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={handleUpdateOrderStatus}
        onCancelOrder={handleCancelOrder}
        onSaveStaffNotes={handleSaveStaffNotes}
        onOpenTransaction={(tx) => setSelectedTxId(tx.id)}
        onPrintDocument={(order, docType) => setPrintPreview({ order, docType })}
      />

      <ApparelTransactionDetailModal
        transaction={selectedTx}
        order={selectedTxOrder}
        paymentEvents={paymentEvents}
        refunds={refunds}
        onClose={() => setSelectedTxId(null)}
        onOpenOrder={(order) => setSelectedOrderId(order.id)}
        onPrintInvoice={(order) => setPrintPreview({ order, docType: 'invoice' })}
        onVerifyWebhookPayment={handleSettleTransaction}
        onConfirmCashCollected={handleSettleTransaction}
        onIssueRefund={handleIssueRefund}
      />

      <ApparelAccountDrawer
        account={selectedAccount}
        orders={orders}
        onClose={() => setSelectedAccountId(null)}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
        onResetPassword={(acc) => notify(`Password reset link sent to ${acc.email}`)}
        onSelectOrder={(o) => setSelectedOrderId(o.id)}
      />

      <ApparelCreateAccountModal
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        onCreate={handleCreateAccount}
      />

      <PrintApparelDocumentModal
        order={printPreview?.order ?? null}
        docType={printPreview?.docType ?? null}
        settings={settings}
        onClose={() => setPrintPreview(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
