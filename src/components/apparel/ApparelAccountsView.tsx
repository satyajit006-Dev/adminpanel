import { ArrowUpDown, Download, KeyRound, Pencil, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AccountSegment,
  AccountStatus,
  ApparelOrder,
  FitPreference,
  LoyaltyTier,
  UserAccount,
  UserRole,
} from '../../types/apparel';
import {
  exportAccountsCsv,
  formatDateTime,
  formatInr,
  formatNumber,
  getNowTimestamp,
} from '../../utils/apparelFormatters';
import { Avatar } from '../Avatar';
import { AccountStatusText, OrderStatusText } from './ApparelStatusText';

interface ApparelAccountsViewProps {
  accounts: UserAccount[];
  onSelectAccount: (account: UserAccount) => void;
  onBulkUpdateStatus: (ids: string[], status: AccountStatus) => void;
  onBulkUpdateTier: (ids: string[], tier: LoyaltyTier) => void;
  onOpenNewAccount: () => void;
  onNotify: (message: string) => void;
}

type SegmentFilter = 'All' | AccountSegment;
type SortKey = 'fullName' | 'totalOrders' | 'lifetimeSpend' | 'returnRate' | 'lastActive';

export function ApparelAccountsView({
  accounts,
  onSelectAccount,
  onBulkUpdateStatus,
  onBulkUpdateTier,
  onOpenNewAccount,
  onNotify,
}: ApparelAccountsViewProps) {
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('All');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'All'>('All');
  const [tierFilter, setTierFilter] = useState<LoyaltyTier | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lifetimeSpend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const segmentCounts = useMemo(
    () => ({
      All: accounts.length,
      Customer: accounts.filter((a) => a.segment === 'Customer').length,
      Wholesale: accounts.filter((a) => a.segment === 'Wholesale').length,
      Staff: accounts.filter((a) => a.segment === 'Staff').length,
    }),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts
      .filter((acc) => {
        if (segmentFilter !== 'All' && acc.segment !== segmentFilter) return false;
        if (statusFilter !== 'All' && acc.status !== statusFilter) return false;
        if (tierFilter !== 'All' && acc.tier !== tierFilter) return false;
        if (q) {
          const hay = [
            acc.id,
            acc.fullName,
            acc.email,
            acc.city,
            acc.country,
            acc.companyName ?? '',
            acc.role,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'fullName' || sortKey === 'lastActive') {
          return a[sortKey].localeCompare(b[sortKey]) * dir;
        }
        return (a[sortKey] - b[sortKey]) * dir;
      });
  }, [accounts, segmentFilter, statusFilter, tierFilter, searchQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'fullName' ? 'asc' : 'desc');
    }
  };

  const allVisibleSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((acc) => selectedIds.includes(acc.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredAccounts.map((a) => a.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredAccounts.map((a) => a.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSegmentFilter('All');
    setStatusFilter('All');
    setTierFilter('All');
    setSearchQuery('');
  };

  const handleExportFiltered = () => {
    exportAccountsCsv(filteredAccounts, 'store-filtered-accounts.csv');
    onNotify(`Exported ${filteredAccounts.length} accounts to CSV`);
  };

  const handleExportSelected = () => {
    const selected = accounts.filter((a) => selectedIds.includes(a.id));
    exportAccountsCsv(selected, 'store-selected-accounts.csv');
    onNotify(`Exported ${selected.length} selected accounts to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Account segments"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1 self-start"
        >
          {(['All', 'Customer', 'Wholesale', 'Staff'] as const).map((seg) => {
            const active = segmentFilter === seg;
            return (
              <button
                key={seg}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSegmentFilter(seg)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <span>{seg === 'All' ? 'All Accounts' : `${seg}s`.replace('Staffs', 'Staff')}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-accent-ink/75' : 'text-ink-muted'
                  }`}
                >
                  {segmentCounts[seg]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportFiltered}
            disabled={filteredAccounts.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewAccount}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover whitespace-nowrap transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, account ID, boutique, or city..."
            aria-label="Search user accounts"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'All')}
            aria-label="Filter by account status"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary focus:border-accent focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending Review</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as LoyaltyTier | 'All')}
            aria-label="Filter by loyalty tier"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary focus:border-accent focus:outline-none"
          >
            <option value="All">All Tiers</option>
            <option value="Atelier VIP">Atelier VIP</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Standard">Standard</option>
            <option value="Wholesale Partner">Wholesale Partner</option>
            <option value="Internal Staff">Internal Staff</option>
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft px-4 py-2.5">
          <span className="text-xs font-semibold text-accent-text font-mono tabular-nums">
            {selectedIds.length} account{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onBulkUpdateStatus(selectedIds, 'Active');
                setSelectedIds([]);
              }}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover whitespace-nowrap transition-colors"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => {
                onBulkUpdateStatus(selectedIds, 'Suspended');
                setSelectedIds([]);
              }}
              className="rounded-md border border-red-200 bg-surface px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 whitespace-nowrap transition-colors"
            >
              Suspend
            </button>
            <button
              type="button"
              onClick={() => {
                onBulkUpdateTier(selectedIds, 'Atelier VIP');
                setSelectedIds([]);
              }}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover whitespace-nowrap transition-colors"
            >
              Grant Atelier VIP
            </button>
            <button
              type="button"
              onClick={handleExportSelected}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover whitespace-nowrap transition-colors"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 text-xs font-medium text-ink-muted hover:text-ink whitespace-nowrap transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-ink">
              {accounts.length === 0 ? 'No user accounts yet' : 'No matching accounts found'}
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              {accounts.length === 0
                ? 'Create customer, wholesale buyer, or staff accounts to manage orders and access.'
                : 'No customer, wholesale, or staff accounts match your current search or filter criteria.'}
            </p>
            {accounts.length === 0 ? (
              <button
                type="button"
                onClick={onOpenNewAccount}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Create First Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle/70 text-xs font-medium text-ink-muted">
                  <th className="w-10 py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible accounts"
                      className="h-4 w-4 rounded border-line bg-surface text-accent accent-accent"
                    />
                  </th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('fullName')}
                      className="inline-flex items-center gap-1 hover:text-ink whitespace-nowrap"
                    >
                      <span>Account</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Segment &amp; Role</th>
                  <th className="py-3 px-3 whitespace-nowrap">Tier</th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('totalOrders')}
                      className="inline-flex items-center gap-1 hover:text-ink whitespace-nowrap"
                    >
                      <span>Orders</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('lifetimeSpend')}
                      className="inline-flex items-center gap-1 hover:text-ink whitespace-nowrap"
                    >
                      <span>Lifetime Spend</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('returnRate')}
                      className="inline-flex items-center gap-1 hover:text-ink whitespace-nowrap"
                    >
                      <span>Return %</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('lastActive')}
                      className="inline-flex items-center gap-1 hover:text-ink whitespace-nowrap"
                    >
                      <span>Last Active</span>
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-sm">
                {filteredAccounts.map((acc) => {
                  const isChecked = selectedIds.includes(acc.id);
                  return (
                    <tr
                      key={acc.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-accent-soft/70' : 'hover:bg-hover'
                      }`}
                    >
                      <td className="py-3 pl-5 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(acc.id)}
                          aria-label={`Select ${acc.fullName}`}
                          className="h-4 w-4 rounded border-line bg-surface text-accent accent-accent"
                        />
                      </td>
                      <td onClick={() => onSelectAccount(acc)} className="py-3 px-3 cursor-pointer">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <Avatar name={acc.fullName} src={acc.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-ink truncate">
                                {acc.fullName}
                              </span>
                              <span className="font-mono text-[11px] text-ink-muted shrink-0">
                                {acc.id}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted truncate">
                              {acc.companyName ? `${acc.companyName} · ${acc.email}` : acc.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 px-3 cursor-pointer text-xs text-ink-secondary whitespace-nowrap"
                      >
                        {acc.segment} · {acc.role}
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 px-3 cursor-pointer text-xs font-medium text-ink whitespace-nowrap"
                      >
                        {acc.tier}
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 px-3 cursor-pointer text-right font-mono text-xs text-ink-secondary tabular-nums"
                      >
                        {formatNumber(acc.totalOrders)}
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 px-3 cursor-pointer text-right font-mono text-xs font-semibold text-ink tabular-nums"
                      >
                        {formatInr(acc.lifetimeSpend)}
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className={`py-3 px-3 cursor-pointer text-right font-mono text-xs tabular-nums ${
                          acc.returnRate >= 25
                            ? 'font-semibold text-red-700 dark:text-red-400'
                            : 'text-ink-muted'
                        }`}
                      >
                        {acc.returnRate.toFixed(1)}%
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 px-3 cursor-pointer text-right font-mono text-xs text-ink-muted whitespace-nowrap tabular-nums"
                      >
                        {acc.lastActive}
                      </td>
                      <td
                        onClick={() => onSelectAccount(acc)}
                        className="py-3 pl-3 pr-5 cursor-pointer text-right"
                      >
                        <AccountStatusText status={acc.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLES_BY_SEGMENT: Record<AccountSegment, UserRole[]> = {
  Customer: ['Shopper', 'VIP Member'],
  Wholesale: ['Boutique Buyer', 'Retail Partner'],
  Staff: ['Admin', 'Merchandiser', 'Fulfillment Lead', 'Support Agent'],
};

const TIERS: LoyaltyTier[] = [
  'Atelier VIP',
  'Gold',
  'Silver',
  'Standard',
  'Wholesale Partner',
  'Internal Staff',
];

export function ApparelAccountDrawer({
  account,
  orders,
  onClose,
  onUpdateAccount,
  onDeleteAccount,
  onResetPassword,
  onSelectOrder,
}: {
  account: UserAccount | null;
  orders: ApparelOrder[];
  onClose: () => void;
  onUpdateAccount: (updated: UserAccount, auditSummary: string) => void;
  onDeleteAccount: (id: string) => void;
  onResetPassword: (account: UserAccount) => void;
  onSelectOrder: (order: ApparelOrder) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<UserAccount | null>(account);

  useEffect(() => {
    setDraft(account);
    setIsEditing(false);
    setConfirmDelete(false);
  }, [account]);

  if (!account || !draft) return null;

  const accountOrders = orders
    .filter((o) => o.accountId === account.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const avgOrderValue =
    account.totalOrders > 0 ? account.lifetimeSpend / account.totalOrders : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAccount(
      draft,
      `Updated profile, role (${draft.role}), tier (${draft.tier}), and size preferences.`
    );
    setIsEditing(false);
  };

  const handleToggleStatus = () => {
    const nextStatus: AccountStatus = account.status === 'Suspended' ? 'Active' : 'Suspended';
    onUpdateAccount(
      { ...account, status: nextStatus },
      nextStatus === 'Suspended'
        ? 'Account suspended by administrator.'
        : 'Account reactivated by administrator.'
    );
  };

  const handleApprovePending = () => {
    onUpdateAccount(
      { ...account, status: 'Active' },
      'Approved pending account verification and activated access.'
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Account details for ${account.fullName}`}
        className="relative z-50 flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl border-l border-line overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={account.fullName} src={account.avatarUrl} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-lg font-semibold text-ink truncate">
                  {account.fullName}
                </h2>
                <span className="font-mono text-xs text-ink-muted">{account.id}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted truncate">
                {account.segment} · {account.role} · {account.tier}
              </p>
              <div className="mt-1.5">
                <AccountStatusText status={account.status} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account details"
            className="rounded-lg p-2 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Account</span>
              </button>
            )}

            {account.status === 'Pending' && (
              <button
                type="button"
                onClick={handleApprovePending}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
              >
                Approve &amp; Activate
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleStatus}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                account.status === 'Suspended'
                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                  : 'border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/40'
              }`}
            >
              {account.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account'}
            </button>

            <button
              type="button"
              onClick={() => onResetPassword(account)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Send Password Reset</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 dark:border-red-900 dark:bg-red-950/40">
                <span className="text-xs font-medium text-red-800 dark:text-red-300">
                  Confirm deletion?
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteAccount(account.id)}
                  className="text-xs font-semibold text-red-700 underline dark:text-red-300"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-ink-secondary hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <form
              onSubmit={handleSave}
              className="space-y-4 border-t border-line pt-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.fullName}
                    onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Boutique / Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={draft.companyName ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, companyName: e.target.value || undefined })
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Account Segment
                  </label>
                  <select
                    value={draft.segment}
                    onChange={(e) => {
                      const nextSeg = e.target.value as AccountSegment;
                      setDraft({
                        ...draft,
                        segment: nextSeg,
                        role: ROLES_BY_SEGMENT[nextSeg][0],
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Role
                  </label>
                  <select
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    {ROLES_BY_SEGMENT[draft.segment].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Loyalty / Access Tier
                  </label>
                  <select
                    value={draft.tier}
                    onChange={(e) => setDraft({ ...draft, tier: e.target.value as LoyaltyTier })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Status
                  </label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value as AccountStatus })
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.country}
                    onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <h3 className="text-xs font-semibold text-ink mb-3">
                  Apparel Fit &amp; Sizing Profile
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-ink-muted">Tops</label>
                    <input
                      type="text"
                      value={draft.sizeProfile.tops}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sizeProfile: { ...draft.sizeProfile, tops: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted">Bottoms</label>
                    <input
                      type="text"
                      value={draft.sizeProfile.bottoms}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sizeProfile: { ...draft.sizeProfile, bottoms: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted">Footwear</label>
                    <input
                      type="text"
                      value={draft.sizeProfile.footwear}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sizeProfile: { ...draft.sizeProfile, footwear: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted">Fit</label>
                    <select
                      value={draft.sizeProfile.fitPreference}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sizeProfile: {
                            ...draft.sizeProfile,
                            fitPreference: e.target.value as FitPreference,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    >
                      <option value="Tailored">Tailored</option>
                      <option value="Regular">Regular</option>
                      <option value="Relaxed">Relaxed</option>
                      <option value="Oversized">Oversized</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-ink-muted">Clienteling &amp; Notes</label>
                  <textarea
                    rows={2}
                    value={draft.sizeProfile.notes ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sizeProfile: { ...draft.sizeProfile, notes: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(account);
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line rounded-xl border border-line">
                <div className="p-3.5">
                  <p className="text-[11px] text-ink-muted">Lifetime Spend</p>
                  <p className="mt-1 font-mono text-base font-semibold text-ink tabular-nums">
                    {formatInr(account.lifetimeSpend)}
                  </p>
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] text-ink-muted">Total Orders</p>
                  <p className="mt-1 font-mono text-base font-semibold text-ink tabular-nums">
                    {account.totalOrders}
                  </p>
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] text-ink-muted">Avg Order</p>
                  <p className="mt-1 font-mono text-base font-semibold text-ink tabular-nums">
                    {formatInr(avgOrderValue)}
                  </p>
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] text-ink-muted">Return Rate</p>
                  <p
                    className={`mt-1 font-mono text-base font-semibold tabular-nums ${
                      account.returnRate >= 25
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-ink'
                    }`}
                  >
                    {account.returnRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="border-t border-line-subtle pt-5">
                <h3 className="text-xs font-semibold text-ink">
                  Contact &amp; Account Details
                </h3>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                  <div>
                    <dt className="text-ink-muted">Email</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {account.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Phone</dt>
                    <dd className="mt-0.5 font-mono text-ink">
                      {account.phone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Location</dt>
                    <dd className="mt-0.5 text-ink">
                      {account.city}, {account.country}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Joined · Last Active</dt>
                    <dd className="mt-0.5 font-mono text-ink tabular-nums">
                      {account.joinedDate} · {account.lastActive}
                    </dd>
                  </div>
                  {account.companyName && (
                    <div className="sm:col-span-2">
                      <dt className="text-ink-muted">Organization / Boutique</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {account.companyName}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="border-t border-line-subtle pt-5">
                <h3 className="text-xs font-semibold text-ink">
                  Apparel Fit &amp; Sizing Profile
                </h3>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-ink-muted">Tops</span>
                    <span className="mt-0.5 block font-mono font-medium text-ink">
                      {account.sizeProfile.tops}
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink-muted">Bottoms</span>
                    <span className="mt-0.5 block font-mono font-medium text-ink">
                      {account.sizeProfile.bottoms}
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink-muted">Footwear</span>
                    <span className="mt-0.5 block font-mono font-medium text-ink">
                      {account.sizeProfile.footwear}
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink-muted">Silhouette</span>
                    <span className="mt-0.5 block font-medium text-ink">
                      {account.sizeProfile.fitPreference}
                    </span>
                  </div>
                </div>
                {account.sizeProfile.notes && (
                  <p className="mt-3 text-xs leading-relaxed text-ink-secondary bg-subtle rounded-lg p-3 border border-line-subtle">
                    {account.sizeProfile.notes}
                  </p>
                )}
              </div>

              <div className="border-t border-line-subtle pt-5">
                <h3 className="text-xs font-semibold text-ink">
                  Linked Apparel Orders ({accountOrders.length})
                </h3>
                {accountOrders.length === 0 ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    No recorded merchandise orders on this account yet.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-line-subtle border border-line rounded-lg overflow-hidden">
                    {accountOrders.map((ord) => (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectOrder(ord);
                        }}
                        className="w-full p-3.5 text-left text-xs hover:bg-hover transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-ink">
                            {ord.orderNumber} · {ord.orderType}
                          </span>
                          <span className="font-mono font-semibold text-ink tabular-nums">
                            {formatInr(ord.totalAmount)}
                          </span>
                        </div>
                        <p className="mt-1 text-ink-secondary truncate">
                          {ord.items.map((i) => `${i.quantity}× ${i.name} (${i.variant})`).join(', ')}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-ink-muted">
                            {formatDateTime(ord.createdAt)} · {ord.paymentMethod} ({ord.paymentStatus})
                          </span>
                          <OrderStatusText status={ord.orderStatus} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export function ApparelCreateAccountModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (account: UserAccount) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [segment, setSegment] = useState<AccountSegment>('Customer');
  const [role, setRole] = useState<UserRole>('Shopper');
  const [tier, setTier] = useState<LoyaltyTier>('Standard');
  const [status, setStatus] = useState<AccountStatus>('Active');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [tops, setTops] = useState('M');
  const [bottoms, setBottoms] = useState('32');
  const [footwear, setFootwear] = useState('EU 41');
  const [fitPreference, setFitPreference] = useState<FitPreference>('Regular');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleSegmentChange = (nextSeg: AccountSegment) => {
    setSegment(nextSeg);
    setRole(ROLES_BY_SEGMENT[nextSeg][0]);
    if (nextSeg === 'Wholesale') setTier('Wholesale Partner');
    else if (nextSeg === 'Staff') setTier('Internal Staff');
    else setTier('Standard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomNum = Math.floor(1000 + Math.random() * 8999);
    const today = new Date().toISOString().slice(0, 10);

    const newAccount: UserAccount = {
      id: segment === 'Staff' ? `STF-${randomNum}` : `USR-${randomNum}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || '—',
      segment,
      role,
      tier,
      status,
      city: city.trim() || '—',
      country: country.trim() || '—',
      companyName: companyName.trim() || undefined,
      totalOrders: 0,
      lifetimeSpend: 0,
      returnRate: 0,
      joinedDate: today,
      lastActive: getNowTimestamp(),
      sizeProfile: {
        tops: tops.trim() || 'M',
        bottoms: bottoms.trim() || '32',
        footwear: footwear.trim() || 'EU 41',
        fitPreference,
        notes: notes.trim() || undefined,
      },
    };

    onCreate(newAccount);
    setFullName('');
    setEmail('');
    setPhone('');
    setCompanyName('');
    setCity('');
    setCountry('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-apparel-account-title"
        className="relative z-10 w-full max-w-xl rounded-xl border border-line bg-surface shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2
              id="create-apparel-account-title"
              className="font-display text-base font-semibold text-ink"
            >
              Provision User Account
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Create a customer, wholesale buyer, or internal staff account
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Customer or staff full name"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Account Segment
              </label>
              <select
                value={segment}
                onChange={(e) => handleSegmentChange(e.target.value as AccountSegment)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="Customer">Customer</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {ROLES_BY_SEGMENT[segment].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Loyalty / Access Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as LoyaltyTier)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending Review</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 00000 00000"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Boutique / Company (Optional)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company or store name"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-line-subtle pt-4">
            <p className="text-xs font-semibold text-ink mb-3">
              Default Apparel Fit Profile
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-ink-muted">Tops</label>
                <input
                  type="text"
                  value={tops}
                  onChange={(e) => setTops(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-muted">Bottoms</label>
                <input
                  type="text"
                  value={bottoms}
                  onChange={(e) => setBottoms(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-muted">Footwear</label>
                <input
                  type="text"
                  value={footwear}
                  onChange={(e) => setFootwear(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-muted">Fit</label>
                <select
                  value={fitPreference}
                  onChange={(e) => setFitPreference(e.target.value as FitPreference)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  <option value="Tailored">Tailored</option>
                  <option value="Regular">Regular</option>
                  <option value="Relaxed">Relaxed</option>
                  <option value="Oversized">Oversized</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-ink-muted">Clienteling / Onboarding Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional style preferences or wholesale terms..."
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line-subtle pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
