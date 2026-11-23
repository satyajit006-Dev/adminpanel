import {
  Ban,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Radio,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  Shirt,
  Truck,
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
  realtimeConnected: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brandName: string;
}

interface NavGroup {
  heading: string;
  items: Array<{
    id: ApparelRoute;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number | string;
    isLive?: boolean;
  }>;
}

export function ApparelSidebar({
  activeRoute,
  onSelectRoute,
  liveOrderCount,
  pendingTxCount,
  lowStockCount,
  accountCount,
  realtimeConnected,
  mobileOpen,
  onCloseMobile,
  brandName,
}: ApparelSidebarProps) {
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
          badge: liveOrderCount,
          isLive: true,
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
          badge: accountCount,
        },
        { id: 'products', label: 'Apparel Products', icon: Shirt },
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
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleSelect = (route: ApparelRoute) => {
    onSelectRoute(route);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-100 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 text-left"
        >
          {brandName}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Nav */}
      <nav aria-label="Primary Admin Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
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
                        ? 'bg-white text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-slate-900' : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    <span className="flex items-center gap-1.5 shrink-0">
                      {item.isLive && (
                        <span
                          className={`text-[10px] font-mono ${
                            active ? 'text-emerald-700 font-semibold' : 'text-emerald-400'
                          }`}
                        >
                          {realtimeConnected ? 'Live' : 'Paused'}
                        </span>
                      )}
                      {item.badge !== undefined && (
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            active ? 'text-slate-600' : 'text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Operator Footer */}
      <div className="border-t border-slate-800 px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar
            name="Claire Vance"
            src="/src/assets/images/avatar_claire_vance_1795343354016.jpg"
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">Claire Vance</p>
            <p className="truncate text-[11px] text-slate-400">Operations Admin · Apparel</p>
          </div>
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
