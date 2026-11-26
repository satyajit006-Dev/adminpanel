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
import { ApparelAdminLoginGate } from './components/apparel/ApparelAdminLoginGate';
import { ApparelAllOrdersView } from './components/apparel/ApparelAllOrdersView';
import { ApparelDashboardView } from './components/apparel/ApparelDashboardView';
import {
  ApparelFinancialReportsView,
  ApparelRefundsView,
} from './components/apparel/ApparelFinanceSubViews';
import { ApparelLiveOrdersView } from './components/apparel/ApparelLiveOrdersView';
import { ApparelOrderDrawer } from './components/apparel/ApparelOrderDrawer';
import { ApparelSessionHistoryView } from './components/apparel/ApparelSessionHistoryView';
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
import { ApparelWebsiteUploadView } from './components/apparel/ApparelWebsiteUploadView';
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
  AdminRoleLabel,
  AdminSessionHistoryEntry,
  ApparelCategory,
  ApparelOrder,
  ApparelProduct,
  ApparelRoute,
  BackendWebsiteConfig,
  BusinessSettings,
  CashCollectionRecord,
  LiveNotification,
  LoyaltyTier,
  OrderActivityLog,
  OrderStatus,
  OrderStatusHistoryItem,
  PaymentEvent,
  PaymentMethodConfig,
  RefundRecord,
  ShippingZone,
  StaffMember,
  ThemePreset,
  Transaction,
  UserAccount,
} from './types/apparel';
import {
  formatInr,
  isOngoingOrder,
  ORDER_STATUS_LABELS,
} from './utils/apparelFormatters';

const STORAGE_PREFIX = 'apparel_admin_v2_';

function cleanupLegacyStorage(): void {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('kova_apparel_admin_v1_') || k.startsWith('kova_website_'))) {
        toDelete.push(k);
      }
    }
    for (const k of toDelete) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore storage errors
  }
}

cleanupLegacyStorage();

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

const IMMUTABLE_SESSION_HISTORY_KEY = 'apparel_admin_immutable_session_history_v1';

function loadImmutableSessionHistory(): AdminSessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(IMMUTABLE_SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminSessionHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function mergeSessionHistory(
  existing: AdminSessionHistoryEntry[],
  incoming: AdminSessionHistoryEntry[]
): AdminSessionHistoryEntry[] {
  const byId = new Map<string, AdminSessionHistoryEntry>();
  for (const item of existing) {
    if (item && item.id) byId.set(item.id, item);
  }
  for (const item of incoming) {
    if (item && item.id) byId.set(item.id, item);
  }
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 500);
}

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
  const [themePreset, setThemePreset] = useState<ThemePreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + 'theme_preset');
      if (saved === 'indigo' || saved === 'pine' || saved === 'burgundy' || saved === 'slate') {
        return saved;
      }
      return 'indigo';
    } catch {
      return 'indigo';
    }
  });

  // Core Business Database Entities
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

  // Drawers & Modals
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<{
    order: ApparelOrder;
    docType: 'packing_slip' | 'invoice';
  } | null>(null);

  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  // Admin session Bearer token is held strictly in JS/React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRoleLabel | null>(null);
  const [sessionHistory, setSessionHistory] = useState<AdminSessionHistoryEntry[]>(() =>
    loadImmutableSessionHistory()
  );
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);
  const [sessionHistoryTableMissing, setSessionHistoryTableMissing] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [backendConfig, setBackendConfig] = useState<BackendWebsiteConfig>({
    checked: false,
    serverConfigured: false,
    supabaseConfigured: false,
    tableName: 'products',
    storageBucketConfigured: false,
    targetOrigin: null,
    webhookOrigin: null,
    webhookConfigured: false,
    authConfigured: false,
    authRequired: true,
    authClaimed: false,
    ownerClaimed: false,
    cofounderClaimed: false,
    usingEnvPasscode: false,
    usingEnvUsername: false,
    usingEnvOwnerPasscode: false,
    usingEnvCofounderPasscode: false,
    usingEnvOwnerUsername: false,
    usingEnvCofounderUsername: false,
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = useCallback((message: string) => {
    setToast({ id: String(Date.now()), message });
  }, []);

  const refreshBackendConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/website/config');
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`Backend config endpoint returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as Partial<BackendWebsiteConfig>;
      setBackendConfig({
        checked: true,
        serverConfigured: Boolean(data.serverConfigured),
        supabaseConfigured: Boolean(data.supabaseConfigured),
        tableName: typeof data.tableName === 'string' && data.tableName ? data.tableName : 'products',
        storageBucketConfigured: Boolean(data.storageBucketConfigured),
        targetOrigin: data.targetOrigin ?? null,
        webhookOrigin: data.webhookOrigin ?? null,
        webhookConfigured: Boolean(data.webhookConfigured),
        authConfigured: Boolean(data.authConfigured),
        authRequired: data.authRequired !== false,
        authClaimed: Boolean(data.authClaimed),
        ownerClaimed: Boolean(data.ownerClaimed),
        cofounderClaimed: Boolean(data.cofounderClaimed),
        usingEnvPasscode: Boolean(data.usingEnvPasscode),
        usingEnvUsername: Boolean(data.usingEnvUsername),
        usingEnvOwnerPasscode: Boolean(data.usingEnvOwnerPasscode),
        usingEnvCofounderPasscode: Boolean(data.usingEnvCofounderPasscode),
        usingEnvOwnerUsername: Boolean(data.usingEnvOwnerUsername),
        usingEnvCofounderUsername: Boolean(data.usingEnvCofounderUsername),
        configError: undefined,
      });
    } catch (err) {
      setBackendConfig((prev) => ({
        ...prev,
        checked: true,
        serverConfigured: false,
        supabaseConfigured: false,
        configError:
          err instanceof Error ? err.message : 'Unable to reach /api/website/config',
      }));
    }
  }, []);

  useEffect(() => {
    void refreshBackendConfig();
  }, [refreshBackendConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(IMMUTABLE_SESSION_HISTORY_KEY, JSON.stringify(sessionHistory));
    } catch {
      // ignore storage quota errors
    }
  }, [sessionHistory]);

  const fetchSessionHistory = useCallback(
    async (tokenOverride?: string) => {
      const activeToken = tokenOverride ?? adminToken;
      if (!activeToken) return;
      setSessionHistoryLoading(true);
      try {
        const res = await fetch('/api/admin/session-history', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok || !contentType.includes('application/json')) return;
        const data = (await res.json()) as {
          ok?: boolean;
          tableMissing?: boolean;
          history?: AdminSessionHistoryEntry[];
        };
        if (data.ok && Array.isArray(data.history)) {
          setSessionHistoryTableMissing(Boolean(data.tableMissing));
          setSessionHistory((prev) => mergeSessionHistory(prev, data.history ?? []));
        }
      } catch {
        // Keep local immutable history if offline
      } finally {
        setSessionHistoryLoading(false);
      }
    },
    [adminToken]
  );

  const pullProductsFromSupabase = useCallback(
    async (tokenOverride?: string) => {
      const activeToken = tokenOverride ?? adminToken;
      if (!activeToken) return;

      setIsSyncingCatalog(true);
      try {
        const res = await fetch('/api/website/products', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          notify('Supabase API route is unavailable on this host.');
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          products?: ApparelProduct[];
          error?: string;
        };
        if (res.status === 401) {
          setAdminToken(null);
          notify(data.error ?? 'Admin authentication required.');
          return;
        }
        if (!res.ok || !data.ok) {
          if (res.status !== 503) {
            notify(data.error ?? 'Failed to load products from Supabase.');
          }
          return;
        }

        const remoteProducts = Array.isArray(data.products) ? data.products : [];
        setProducts((prev) => {
          const remoteSkus = new Set(remoteProducts.map((p) => p.sku));
          const unsyncedLocals = prev.filter(
            (p) => !remoteSkus.has(p.sku) && p.websiteSyncStatus !== 'synced'
          );
          return [...remoteProducts, ...unsyncedLocals];
        });
        notify(`Loaded ${remoteProducts.length} product${remoteProducts.length === 1 ? '' : 's'} from Supabase`);
      } catch {
        notify('Network error loading products from Supabase.');
      } finally {
        setIsSyncingCatalog(false);
      }
    },
    [adminToken, notify]
  );

  const syncAllFromSupabase = useCallback(
    async (tokenOverride?: string, silent = false) => {
      const activeToken = tokenOverride ?? adminToken;
      if (!activeToken) return;

      setIsSyncingCatalog(true);
      try {
        const headers = { Authorization: `Bearer ${activeToken}` };
        const [prodRes, ordRes, custRes, txRes] = await Promise.all([
          fetch('/api/website/products', { headers }),
          fetch('/api/admin/orders', { headers }),
          fetch('/api/admin/customers', { headers }),
          fetch('/api/admin/transactions', { headers }),
        ]);

        if (
          prodRes.status === 401 ||
          ordRes.status === 401 ||
          custRes.status === 401 ||
          txRes.status === 401
        ) {
          setAdminToken(null);
          notify('Session expired. Please sign in again.');
          return;
        }

        let loadedCounts: string[] = [];

        if (prodRes.ok && (prodRes.headers.get('content-type') ?? '').includes('application/json')) {
          const prodData = (await prodRes.json()) as {
            ok?: boolean;
            products?: ApparelProduct[];
          };
          if (prodData.ok && Array.isArray(prodData.products)) {
            const remoteProducts = prodData.products;
            setProducts((prev) => {
              const remoteSkus = new Set(remoteProducts.map((p) => p.sku));
              const unsyncedLocals = prev.filter(
                (p) => !remoteSkus.has(p.sku) && p.websiteSyncStatus !== 'synced'
              );
              return [...remoteProducts, ...unsyncedLocals];
            });
            loadedCounts.push(`${remoteProducts.length} products`);
          }
        }

        if (ordRes.ok && (ordRes.headers.get('content-type') ?? '').includes('application/json')) {
          const ordData = (await ordRes.json()) as {
            ok?: boolean;
            tableMissing?: boolean;
            orders?: ApparelOrder[];
          };
          if (ordData.ok && !ordData.tableMissing && Array.isArray(ordData.orders)) {
            setOrders(ordData.orders);
            loadedCounts.push(`${ordData.orders.length} orders`);
          }
        }

        if (custRes.ok && (custRes.headers.get('content-type') ?? '').includes('application/json')) {
          const custData = (await custRes.json()) as {
            ok?: boolean;
            tableMissing?: boolean;
            customers?: UserAccount[];
          };
          if (custData.ok && !custData.tableMissing && Array.isArray(custData.customers)) {
            setAccounts(custData.customers);
            loadedCounts.push(`${custData.customers.length} customers`);
          }
        }

        if (txRes.ok && (txRes.headers.get('content-type') ?? '').includes('application/json')) {
          const txData = (await txRes.json()) as {
            ok?: boolean;
            tableMissing?: boolean;
            transactions?: Transaction[];
          };
          if (txData.ok && !txData.tableMissing && Array.isArray(txData.transactions)) {
            setTransactions(txData.transactions);
            loadedCounts.push(`${txData.transactions.length} transactions`);
          }
        }

        if (!silent && loadedCounts.length > 0) {
          notify(`Synced from Supabase: ${loadedCounts.join(' · ')}`);
        }
      } catch {
        if (!silent) {
          notify('Could not complete Supabase sync.');
        }
      } finally {
        setIsSyncingCatalog(false);
      }
    },
    [adminToken, notify]
  );

  const syncSingleProductIfUnlocked = useCallback(
    async (updatedProduct: ApparelProduct) => {
      if (!adminToken || !backendConfig.supabaseConfigured) return;
      try {
        const res = await fetch('/api/website/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updatedProduct),
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) return;
        const data = (await res.json()) as { ok?: boolean; product?: ApparelProduct; error?: string };
        if (res.status === 401) {
          setAdminToken(null);
          return;
        }
        if (res.ok && data.ok && data.product) {
          setProducts((prev) => prev.map((p) => (p.sku === data.product!.sku ? data.product! : p)));
        }
      } catch {
        // Keep local update if background sync fails
      }
    },
    [adminToken, backendConfig.supabaseConfigured]
  );

  const persistOrderPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!adminToken || !backendConfig.supabaseConfigured) return;
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(patch),
        });
        if (res.status === 401) {
          setAdminToken(null);
        }
      } catch {
        // Keep local state if background request fails
      }
    },
    [adminToken, backendConfig.supabaseConfigured]
  );

  const persistTransactionPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!adminToken || !backendConfig.supabaseConfigured) return;
      try {
        const res = await fetch('/api/admin/transactions', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(patch),
        });
        if (res.status === 401) {
          setAdminToken(null);
        }
      } catch {
        // Keep local state if background request fails
      }
    },
    [adminToken, backendConfig.supabaseConfigured]
  );

  const persistCustomerUpsert = useCallback(
    async (customer: UserAccount) => {
      if (!adminToken || !backendConfig.supabaseConfigured) return;
      try {
        const res = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(customer),
        });
        if (res.status === 401) {
          setAdminToken(null);
        }
      } catch {
        // Keep local state if background request fails
      }
    },
    [adminToken, backendConfig.supabaseConfigured]
  );

  const persistCustomerDelete = useCallback(
    async (id: string) => {
      if (!adminToken || !backendConfig.supabaseConfigured) return;
      try {
        const res = await fetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status === 401) {
          setAdminToken(null);
        }
      } catch {
        // Keep local state if background request fails
      }
    },
    [adminToken, backendConfig.supabaseConfigured]
  );

  const operatorName = settings.adminName?.trim() || settings.brandName || 'Admin';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    saveState('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dataset.theme = themePreset;
    saveState('theme_preset', themePreset);
  }, [themePreset]);

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

  const handleUpdateOrderStatus = (
    order: ApparelOrder,
    nextStatus: OrderStatus,
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    const confirmedAt = nextStatus === 'confirmed' && !order.confirmedAt ? nowIso : order.confirmedAt;
    const completedAt = nextStatus === 'completed' ? nowIso : order.completedAt;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          orderStatus: nextStatus,
          updatedAt: nowIso,
          confirmedAt,
          completedAt,
        };
      })
    );
    setStatusHistory((prev) => [
      {
        id: `OSH-${Date.now()}`,
        orderId: order.id,
        previousStatus: order.orderStatus,
        newStatus: nextStatus,
        changedBy: operatorName,
        note: note ?? `Moved to ${ORDER_STATUS_LABELS[nextStatus]}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId: order.id,
        actor: operatorName,
        action: 'Status Updated',
        details: `${order.orderNumber} updated from ${ORDER_STATUS_LABELS[order.orderStatus]} to ${ORDER_STATUS_LABELS[nextStatus]}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    void persistOrderPatch({
      id: order.id,
      orderStatus: nextStatus,
      confirmedAt,
      completedAt,
    });
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
        changedBy: operatorName,
        note: reason,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        orderId: order.id,
        actor: operatorName,
        action: isReject ? 'Order Rejected' : 'Order Cancelled',
        details: `${order.orderNumber}: ${reason}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    void persistOrderPatch({
      id: order.id,
      orderStatus: terminal,
      cancellationReason: reason,
    });
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
        actor: operatorName,
        action: 'Staff Note Saved',
        details: notes || 'Cleared staff note',
        timestamp: nowIso,
      },
      ...prev,
    ]);
    void persistOrderPatch({
      id: orderId,
      staffNotes: notes,
    });
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
          collectedBy: operatorName,
          amount: tx.amount,
          registerShift: 'Active Register',
          collectedAt: nowIso,
        },
        ...prev,
      ]);
    }

    void persistTransactionPatch({
      id: tx.id,
      status: 'success',
      verifiedByWebhook: true,
    });
    void persistOrderPatch({
      id: tx.orderId,
      paymentStatus: 'Paid',
    });
    const matchedAccount = accounts.find((a) => a.id === tx.accountId);
    if (matchedAccount) {
      void persistCustomerUpsert({
        ...matchedAccount,
        lifetimeSpend: matchedAccount.lifetimeSpend + tx.amount,
      });
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
      id: `RFD-${Date.now().toString().slice(-4)}`,
      transactionId: tx.id,
      orderId: tx.orderId,
      orderNumber: tx.orderNumber,
      customerName: tx.customerName,
      amount,
      reason,
      status: 'processed',
      processedBy: operatorName,
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
        actor: operatorName,
        action: 'Refund Processed',
        details: `${formatInr(amount)} refunded on ${tx.id} (${reason})`,
        timestamp: nowIso,
      },
      ...prev,
    ]);
    void persistTransactionPatch({
      id: tx.id,
      refundedAmount: newRefundTotal,
      status: isFull ? 'refunded' : 'partially_refunded',
    });
    void persistOrderPatch({
      id: tx.orderId,
      paymentStatus: isFull ? 'Refunded' : 'Partially Refunded',
    });
    notify(`Processed ${formatInr(amount)} refund for ${tx.orderNumber}`);
  };

  // Account Handlers
  const handleUpdateAccount = (updated: UserAccount, auditSummary: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    void persistCustomerUpsert(updated);
    notify(`${updated.fullName}: ${auditSummary}`);
  };

  const handleBulkUpdateStatus = (ids: string[], status: AccountStatus) => {
    const idSet = new Set(ids);
    const updatedList: UserAccount[] = [];
    setAccounts((prev) =>
      prev.map((a) => {
        if (!idSet.has(a.id)) return a;
        const next = { ...a, status };
        updatedList.push(next);
        return next;
      })
    );
    for (const acc of updatedList) {
      void persistCustomerUpsert(acc);
    }
    notify(`Updated ${ids.length} account${ids.length > 1 ? 's' : ''} to ${status}`);
  };

  const handleBulkUpdateTier = (ids: string[], tier: LoyaltyTier) => {
    const idSet = new Set(ids);
    const updatedList: UserAccount[] = [];
    setAccounts((prev) =>
      prev.map((a) => {
        if (!idSet.has(a.id)) return a;
        const next = { ...a, tier };
        updatedList.push(next);
        return next;
      })
    );
    for (const acc of updatedList) {
      void persistCustomerUpsert(acc);
    }
    notify(`Assigned ${tier} tier to ${ids.length} account${ids.length > 1 ? 's' : ''}`);
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccountId(null);
    void persistCustomerDelete(id);
    if (target) notify(`Removed account ${target.fullName} (${target.id})`);
  };

  const handleCreateAccount = (newAccount: UserAccount) => {
    setAccounts((prev) => [newAccount, ...prev]);
    void persistCustomerUpsert(newAccount);
    notify(`Created ${newAccount.segment.toLowerCase()} account for ${newAccount.fullName}`);
  };

  const handleSaveWebsiteProduct = (product: ApparelProduct) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id || p.sku === product.sku);
      if (exists) {
        return prev.map((p) => (p.id === product.id || p.sku === product.sku ? product : p));
      }
      return [product, ...prev];
    });
  };

  const handleDeleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingProductId === id) {
      setEditingProductId(null);
    }
    if (target) {
      notify(`Removed ${target.name} (${target.sku}) from catalog`);
      if (adminToken && backendConfig.supabaseConfigured) {
        void fetch(`/api/website/products?sku=${encodeURIComponent(target.sku)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then(async (res) => {
          if (res.status === 401) {
            setAdminToken(null);
            notify('Removed locally; unlock admin session to delete from Supabase.');
          } else if (!res.ok) {
            notify(`Removed locally, but Supabase delete failed (HTTP ${res.status}).`);
          }
        }).catch(() => {
          notify('Removed locally, but could not reach Supabase to delete.');
        });
      }
    }
  };

  const handleClearAllData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setOrders(INITIAL_ORDERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setRefunds(INITIAL_REFUNDS);
    setPaymentEvents(INITIAL_PAYMENT_EVENTS);
    setStatusHistory(INITIAL_STATUS_HISTORY);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setCashCollections(INITIAL_CASH_COLLECTIONS);
    setPaymentMethods(INITIAL_PAYMENT_METHODS);
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setDeliveryZones(INITIAL_DELIVERY_ZONES);
    setStaff(INITIAL_STAFF);
    setSettings(INITIAL_SETTINGS);
    setNotifications([]);
    setSelectedOrderId(null);
    setSelectedTxId(null);
    setSelectedAccountId(null);
    setEditingProductId(null);
    notify('Cleared all locally stored admin data');
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

  const handleSignOut = () => {
    const activeToken = adminToken;
    const currentUsername = adminUsername || 'admin';
    const currentRole: AdminRoleLabel = adminRole === 'Co-Founder' ? 'Co-Founder' : 'Owner';

    if (activeToken) {
      void fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` },
      })
        .then(async (res) => {
          const contentType = res.headers.get('content-type') ?? '';
          if (res.ok && contentType.includes('application/json')) {
            const data = (await res.json()) as { historyEntry?: AdminSessionHistoryEntry };
            if (data.historyEntry) {
              setSessionHistory((prev) => mergeSessionHistory(prev, [data.historyEntry!]));
              return;
            }
          }
          setSessionHistory((prev) =>
            mergeSessionHistory(prev, [
              {
                id: `AUTH-LOCAL-${Date.now()}`,
                username: currentUsername,
                role: currentRole,
                eventType: 'logout',
                occurredAt: new Date().toISOString(),
              },
            ])
          );
        })
        .catch(() => {
          setSessionHistory((prev) =>
            mergeSessionHistory(prev, [
              {
                id: `AUTH-LOCAL-${Date.now()}`,
                username: currentUsername,
                role: currentRole,
                eventType: 'logout',
                occurredAt: new Date().toISOString(),
              },
            ])
          );
        });
    }

    setAdminToken(null);
    setAdminUsername(null);
    setAdminRole(null);
    setMobileOpen(false);
    setSelectedOrderId(null);
    setSelectedTxId(null);
    setSelectedAccountId(null);
    notify('Signed out of Admin Panel');
  };

  if (!adminToken) {
    return (
      <>
        <ApparelAdminLoginGate
          brandName={settings.brandName}
          isDark={isDark}
          onToggleTheme={() => setIsDark((p) => !p)}
          backendConfig={backendConfig}
          onRefreshConfig={refreshBackendConfig}
          onAuthenticated={(token, username, role, historyEntry) => {
            setAdminToken(token);
            setAdminUsername(username);
            setAdminRole(role);
            if (historyEntry) {
              setSessionHistory((prev) => mergeSessionHistory(prev, [historyEntry]));
            }
            void refreshBackendConfig();
            void fetchSessionHistory(token);
            if (backendConfig.supabaseConfigured) {
              void syncAllFromSupabase(token, false);
            }
            notify(`Signed in as ${username} (${role}).`);
          }}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-canvas text-ink transition-colors duration-200">
      <ApparelSidebar
        activeRoute={activeRoute}
        onSelectRoute={setActiveRoute}
        liveOrderCount={liveOrderCount}
        pendingTxCount={pendingTxCount}
        lowStockCount={lowStockCount}
        accountCount={accounts.length}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        brandName={settings.brandName}
        adminName={adminUsername || settings.adminName}
        adminEmail={adminRole ? `${adminRole} · ${settings.email || 'Admin Access'}` : settings.email}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <ApparelTopBar
          activeRoute={activeRoute}
          brandName={settings.brandName}
          isDark={isDark}
          onToggleTheme={() => setIsDark((p) => !p)}
          themePreset={themePreset}
          onChangeThemePreset={(next) => {
            setThemePreset(next);
            notify(
              `Switched theme to ${
                next === 'indigo'
                  ? 'Midnight Indigo'
                  : next === 'pine'
                    ? 'Pine Atelier'
                    : next === 'burgundy'
                      ? 'Oxblood Couture'
                      : 'Classic Slate'
              }`
            );
          }}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenNewAccount={() => setCreateAccountOpen(true)}
          onOpenWebsiteUpload={() => {
            setEditingProductId(null);
            setActiveRoute('website_upload');
          }}
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
          supabaseConfigured={backendConfig.supabaseConfigured}
          isSyncing={isSyncingCatalog}
          onSyncAll={() => void syncAllFromSupabase()}
          onSignOut={handleSignOut}
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
              supabaseConfigured={backendConfig.supabaseConfigured}
              backendUnlocked={Boolean(adminToken)}
              onToggleAvailability={(id) => {
                const target = products.find((p) => p.id === id);
                if (!target) return;
                const updated: ApparelProduct = {
                  ...target,
                  isAvailable: !target.isAvailable,
                  publishedToWebsite: !target.isAvailable,
                };
                setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
                void syncSingleProductIfUnlocked(updated);
                notify('Updated product catalog availability');
              }}
              onAddProduct={(prod) => {
                setProducts((prev) => [prod, ...prev]);
                void syncSingleProductIfUnlocked(prod);
                notify(`Added ${prod.name} (${prod.sku}) to catalog`);
              }}
              onDeleteProduct={handleDeleteProduct}
              onOpenWebsiteUpload={(productId) => {
                setEditingProductId(productId ?? null);
                setActiveRoute('website_upload');
              }}
            />
          )}

          {activeRoute === 'website_upload' && (
            <ApparelWebsiteUploadView
              products={products}
              categories={categories}
              editingProductId={editingProductId}
              adminToken={adminToken}
              backendConfig={backendConfig}
              isSyncingCatalog={isSyncingCatalog}
              onAdminTokenChange={(token) => {
                setAdminToken(token);
                if (token) {
                  void refreshBackendConfig();
                  void pullProductsFromSupabase(token);
                }
              }}
              onRefreshConfig={refreshBackendConfig}
              onPullFromSupabase={pullProductsFromSupabase}
              onSelectEditProduct={setEditingProductId}
              onSaveProduct={handleSaveWebsiteProduct}
              onDeleteProduct={handleDeleteProduct}
              onNotify={notify}
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
                notify('Updated category visibility');
              }}
              onAddCategory={(cat) => {
                setCategories((prev) => [...prev, cat]);
                notify(`Added category ${cat.name}`);
              }}
            />
          )}

          {activeRoute === 'inventory' && (
            <ApparelInventoryView
              products={products}
              onAdjustStock={(id, delta) => {
                const target = products.find((p) => p.id === id);
                if (!target) return;
                const updated: ApparelProduct = {
                  ...target,
                  stockQuantity: Math.max(0, target.stockQuantity + delta),
                };
                setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
                void syncSingleProductIfUnlocked(updated);
                notify('Warehouse stock adjusted');
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
              onAddZone={(zone) => {
                setDeliveryZones((prev) => [...prev, zone]);
                notify(`Added shipping zone ${zone.name}`);
              }}
            />
          )}

          {activeRoute === 'staff' && (
            <ApparelStaffView
              staff={staff}
              adminToken={adminToken}
              onRefreshConfig={refreshBackendConfig}
              onNotify={notify}
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
              onAddStaff={(member) => {
                setStaff((prev) => [...prev, member]);
                notify(`Added staff member ${member.name}`);
              }}
            />
          )}

          {activeRoute === 'session_history' && (
            <ApparelSessionHistoryView
              history={sessionHistory}
              loading={sessionHistoryLoading}
              tableMissing={sessionHistoryTableMissing}
              onRefresh={() => void fetchSessionHistory()}
            />
          )}

          {activeRoute === 'settings' && (
            <ApparelSettingsView
              settings={settings}
              themePreset={themePreset}
              isDark={isDark}
              onChangeThemePreset={(next) => {
                setThemePreset(next);
                notify(
                  `Switched theme to ${
                    next === 'indigo'
                      ? 'Midnight Indigo'
                      : next === 'pine'
                        ? 'Pine Atelier'
                        : next === 'burgundy'
                          ? 'Oxblood Couture'
                          : 'Classic Slate'
                  }`
                );
              }}
              onToggleDark={() => setIsDark((p) => !p)}
              onSaveSettings={(next) => {
                setSettings(next);
                notify('Saved business settings');
              }}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>
      </div>

      <ApparelOrderDrawer
        order={selectedOrder}
        transactions={transactions}
        statusHistory={statusHistory}
        activityLogs={activityLogs}
        brandName={settings.brandName}
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
        brandName={settings.brandName}
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
