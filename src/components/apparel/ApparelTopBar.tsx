import {
  Bell,
  Check,
  LogOut,
  Menu,
  Moon,
  Palette,
  RefreshCw,
  Sun,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import type { ApparelRoute, LiveNotification, ThemePreset } from '../../types/apparel';
import { formatTimeOnly } from '../../utils/apparelFormatters';
import { THEME_PRESETS } from '../../utils/themes';

interface ApparelTopBarProps {
  activeRoute: ApparelRoute;
  brandName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  themePreset: ThemePreset;
  onChangeThemePreset: (preset: ThemePreset) => void;
  onOpenMobileMenu: () => void;
  onOpenNewAccount: () => void;
  onOpenWebsiteUpload: () => void;
  notifications: LiveNotification[];
  onMarkAllRead: () => void;
  onSelectOrderFromNotification: (orderId: string) => void;
  supabaseConfigured?: boolean;
  isSyncing?: boolean;
  onSyncAll?: () => void;
  onSignOut: () => void;
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
  website_upload: 'Upload to Website',
  categories: 'Categories',
  inventory: 'Inventory',
  accounts: 'User Accounts',
  delivery: 'Delivery & Shipping',
  staff: 'Staff & Permissions',
  session_history: 'Login & Logout History',
  settings: 'Business Settings',
};

export function ApparelTopBar({
  activeRoute,
  brandName,
  isDark,
  onToggleTheme,
  themePreset,
  onChangeThemePreset,
  onOpenMobileMenu,
  onOpenNewAccount,
  onOpenWebsiteUpload,
  notifications,
  onMarkAllRead,
  onSelectOrderFromNotification,
  supabaseConfigured,
  isSyncing,
  onSyncAll,
  onSignOut,
}: ApparelTopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-line bg-surface/95 px-4 sm:px-8 backdrop-blur-sm transition-colors duration-200">
      {/* Zone 1: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg p-2 text-ink-secondary hover:bg-hover hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-xs font-medium text-ink-muted whitespace-nowrap">
            {brandName || 'Apparel Admin'}
          </span>
          <span className="hidden sm:inline text-line" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base sm:text-lg font-semibold text-ink truncate">
            {ROUTE_TITLES[activeRoute]}
          </h1>
        </div>
      </div>

      {/* Zone 3: Contextual Primary Action + Alerts + Theme */}
      <div className="flex items-center gap-2.5 shrink-0 relative">
        {supabaseConfigured && onSyncAll && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={onSyncAll}
            title="Refresh data from Supabase"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync DB'}</span>
          </button>
        )}

        {activeRoute === 'accounts' ? (
          <button
            type="button"
            onClick={onOpenNewAccount}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>New Account</span>
          </button>
        ) : activeRoute !== 'website_upload' ? (
          <button
            type="button"
            onClick={onOpenWebsiteUpload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap shrink-0"
          >
            <UploadCloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Upload to Website</span>
          </button>
        ) : null}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setThemeMenuOpen(false);
            }}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
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
              <div className="absolute right-0 mt-2 z-40 w-80 rounded-xl border border-line bg-surface shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
                  <span className="text-xs font-semibold text-ink">
                    Order &amp; Payment Alerts
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-[11px] font-medium text-accent-text hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-line-subtle">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-ink-muted">
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
                        className={`w-full px-4 py-3 text-left hover:bg-hover transition-colors ${
                          !n.read ? 'bg-accent-soft/50' : ''
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-ink">
                            {n.title}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted shrink-0">
                            {formatTimeOnly(n.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-secondary">
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

        {/* Theme Preset Selector Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setThemeMenuOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            aria-label="Choose admin panel theme"
            title="Choose admin panel theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
          >
            <Palette className="h-4 w-4" />
          </button>

          {themeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setThemeMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 z-40 w-64 rounded-xl border border-line bg-surface shadow-xl overflow-hidden">
                <div className="border-b border-line-subtle px-4 py-2.5">
                  <p className="text-xs font-semibold text-ink">Admin Panel Theme</p>
                  <p className="text-[11px] text-ink-muted">Select palette &amp; surface mood</p>
                </div>
                <div className="p-1.5 space-y-1">
                  {THEME_PRESETS.map((preset) => {
                    const active = themePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onChangeThemePreset(preset.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                          active
                            ? 'bg-accent-soft text-accent-text'
                            : 'text-ink hover:bg-hover'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                            <span
                              className="h-5 w-3"
                              style={{ backgroundColor: preset.sidebarHex }}
                              aria-hidden="true"
                            />
                            <span
                              className="h-5 w-3"
                              style={{
                                backgroundColor: isDark ? preset.darkAccentHex : preset.accentHex,
                              }}
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{preset.name}</p>
                            <p className="text-[10px] text-ink-muted truncate">{preset.subtitle}</p>
                          </div>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
