import {
  Ban,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  FolderTree,
  History,
  LayoutDashboard,
  LogOut,
  Radio,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  Shirt,
  Truck,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import type { ApparelRoute } from '../../types/apparel';
import { Avatar } from '../Avatar';

interface ApparelSidebarProps {
  activeRoute: ApparelRoute;
  onSelectRoute: (route: ApparelRoute) => void;
  liveOrderCount: number;
  pendingTxCount: number;
  lowStockCount: number;
  accountCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brandName: string;
  adminName?: string;
  adminEmail?: string;
  onSignOut: () => void;
}

interface NavGroup {
  heading: string;
  items: Array<{
    id: ApparelRoute;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number | string;
  }>;
}

export function ApparelSidebar({
  activeRoute,
  onSelectRoute,
  liveOrderCount,
  pendingTxCount,
  lowStockCount,
  accountCount,
  mobileOpen,
  onCloseMobile,
  brandName,
  adminName,
  adminEmail,
  onSignOut,
}: ApparelSidebarProps) {
  const operatorName = adminName?.trim() || 'Store Admin';
  const operatorSub = adminEmail?.trim() || 'Operations Administrator';

  const groups: NavGroup[] = [
    {
      heading: 'Overview',
      items: [{ id: 'dashboard', label: 'Analytics & Dashboard', icon: LayoutDashboard }],
    },
    {
      heading: 'Order Management',
      items: [
        {
          id: 'live_orders',
          label: 'Live Orders',
          icon: Radio,
          badge: liveOrderCount > 0 ? liveOrderCount : undefined,
        },
        { id: 'all_orders', label: 'All Orders', icon: ClipboardList },
        { id: 'completed_orders', label: 'Completed Orders', icon: CheckCircle2 },
        { id: 'cancelled_orders', label: 'Cancelled Orders', icon: Ban },
      ],
    },
    {
      heading: 'Finance',
      items: [
        {
          id: 'transactions',
          label: 'Transactions',
          icon: Receipt,
          badge: pendingTxCount > 0 ? pendingTxCount : undefined,
        },
        { id: 'refunds', label: 'Refunds', icon: RotateCcw },
        { id: 'financial_reports', label: 'Financial Reports', icon: BarChart3 },
      ],
    },
    {
      heading: 'Accounts & Store',
      items: [
        {
          id: 'accounts',
          label: 'User Accounts',
          icon: Users,
          badge: accountCount > 0 ? accountCount : undefined,
        },
        { id: 'products', label: 'Apparel Products', icon: Shirt },
        { id: 'website_upload', label: 'Upload to Website', icon: UploadCloud },
        { id: 'categories', label: 'Categories', icon: FolderTree },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Boxes,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        { id: 'delivery', label: 'Delivery & Shipping', icon: Truck },
      ],
    },
    {
      heading: 'Configuration',
      items: [
        { id: 'staff', label: 'Staff & Permissions', icon: ShieldCheck },
        { id: 'session_history', label: 'Login & Logout History', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleSelect = (route: ApparelRoute) => {
    onSelectRoute(route);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-ink border-r border-sidebar-border transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="font-display text-lg font-bold tracking-tight text-sidebar-ink whitespace-nowrap truncate text-left"
        >
          {brandName || 'Apparel Admin'}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Nav */}
      <nav aria-label="Primary Admin Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-sidebar-active text-sidebar-active-ink shadow-xs'
                        : 'text-sidebar-ink/85 hover:bg-sidebar-hover hover:text-sidebar-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-sidebar-active-ink' : 'text-sidebar-muted'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.badge !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums shrink-0 ${
                          active ? 'text-sidebar-active-muted' : 'text-sidebar-muted'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Operator Footer */}
      <div className="border-t border-sidebar-border px-4 py-3.5 shrink-0 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleSelect('settings')}
          className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90 transition-opacity"
        >
          <Avatar name={operatorName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-sidebar-ink">{operatorName}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{operatorSub}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('session_history')}
            title="Login & Logout History (cannot be deleted)"
            aria-label="View Login and Logout History"
            className={`shrink-0 rounded-lg p-2 transition-colors ${
              activeRoute === 'session_history'
                ? 'bg-sidebar-active text-sidebar-active-ink'
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink'
            }`}
          >
            <History className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out of Admin Panel"
            aria-label="Sign out of Admin Panel"
            className="shrink-0 rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[82vw] h-full">{sidebarBody}</aside>
        </div>
      )}
    </>
  );
}
