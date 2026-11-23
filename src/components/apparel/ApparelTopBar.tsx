import { Bell, Menu, Moon, Plus, Sun, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { ApparelRoute, LiveNotification } from '../../types/apparel';
import { formatTimeOnly } from '../../utils/apparelFormatters';

interface ApparelTopBarProps {
  activeRoute: ApparelRoute;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  onSimulateIncomingOrder: () => void;
  onOpenNewAccount: () => void;
  notifications: LiveNotification[];
  onMarkAllRead: () => void;
  onSelectOrderFromNotification: (orderId: string) => void;
}

const ROUTE_TITLES: Record<ApparelRoute, string> = {
  dashboard: 'Analytics & Dashboard',
  live_orders: 'Live Orders',
  all_orders: 'All Orders',
  completed_orders: 'Completed Orders',
  cancelled_orders: 'Cancelled Orders',
  transactions: 'Transactions',
  refunds: 'Refunds',
  financial_reports: 'Financial Reports',
  products: 'Apparel Products',
  categories: 'Categories',
  inventory: 'Inventory',
  accounts: 'User Accounts',
  delivery: 'Delivery & Shipping',
  staff: 'Staff & Permissions',
  settings: 'Business Settings',
};

export function ApparelTopBar({
  activeRoute,
  isDark,
  onToggleTheme,
  onOpenMobileMenu,
  onSimulateIncomingOrder,
  onOpenNewAccount,
  notifications,
  onMarkAllRead,
  onSelectOrderFromNotification,
}: ApparelTopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-slate-200 bg-white/95 px-4 sm:px-8 backdrop-blur-sm dark:border-slate-800 dark:bg-[#111827]/95">
      {/* Zone 1: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Kova Studio
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {ROUTE_TITLES[activeRoute]}
          </h1>
        </div>
      </div>

      {/* Zone 3: Contextual Primary Action + Alerts + Theme */}
      <div className="flex items-center gap-2.5 shrink-0 relative">
        {activeRoute === 'accounts' ? (
          <button
            type="button"
            onClick={onOpenNewAccount}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>New Account</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSimulateIncomingOrder}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Simulate Order</span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setNotifOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 z-40 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Order & Payment Alerts
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline dark:text-slate-400 dark:hover:text-white"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                      No recent alerts.
                    </p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          onSelectOrderFromNotification(n.orderId);
                          setNotifOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          !n.read ? 'bg-slate-50/80 dark:bg-slate-800/30' : ''
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {formatTimeOnly(n.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {n.subtitle}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
