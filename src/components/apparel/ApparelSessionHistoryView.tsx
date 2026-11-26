import { History, Lock, LogIn, LogOut, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdminSessionHistoryEntry } from '../../types/apparel';

interface ApparelSessionHistoryViewProps {
  history: AdminSessionHistoryEntry[];
  loading: boolean;
  tableMissing?: boolean;
  onRefresh: () => void;
}

function formatDatePart(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimePart(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function ApparelSessionHistoryView({
  history,
  loading,
  tableMissing,
  onRefresh,
}: ApparelSessionHistoryViewProps) {
  const [eventFilter, setEventFilter] = useState<'all' | 'login' | 'logout'>('all');
  const [query, setQuery] = useState('');

  const loginCount = useMemo(
    () => history.filter((item) => item.eventType === 'login').length,
    [history]
  );
  const logoutCount = useMemo(
    () => history.filter((item) => item.eventType === 'logout').length,
    [history]
  );
  const latestLogin = useMemo(
    () => history.find((item) => item.eventType === 'login') ?? null,
    [history]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((item) => {
      if (eventFilter !== 'all' && item.eventType !== eventFilter) return false;
      if (!q) return true;
      return (
        item.username.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.eventType.toLowerCase().includes(q)
      );
    });
  }, [history, eventFilter, query]);

  return (
    <div className="space-y-6">
      {/* Permanent Audit Notice */}
      <section className="rounded-xl border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">
              Permanent Login &amp; Logout History
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Every admin sign-in and sign-out is logged automatically with exact date and time.
              Records are read-only and cannot be edited or deleted.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{loading ? 'Refreshing...' : 'Refresh Log'}</span>
        </button>
      </section>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-300">
          Supabase table <code className="font-mono font-semibold">public.admin_session_history</code>{' '}
          is not created yet—records are stored in active memory and local fallback until you run{' '}
          <code className="font-mono font-semibold">supabase/schema.sql</code> in Supabase SQL Editor.
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Total Recorded Events
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink tabular-nums">
            {history.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Total Logins
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {loginCount}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Total Logouts
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
            {logoutCount}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Latest Sign-In
          </p>
          <p className="mt-2 text-xs font-semibold text-ink truncate">
            {latestLogin ? `${latestLogin.username} (${latestLogin.role})` : '—'}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {latestLogin
              ? `${formatDatePart(latestLogin.occurredAt)} · ${formatTimePart(latestLogin.occurredAt)}`
              : 'No events yet'}
          </p>
        </div>
      </section>

      {/* Filters + Immutable History Table */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-subtle p-1 w-fit">
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'login', label: 'Logins' },
                { id: 'logout', label: 'Logouts' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEventFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  eventFilter === tab.id
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by username or role..."
              className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <History className="mx-auto h-6 w-6 text-ink-muted" aria-hidden="true" />
            <p className="text-xs font-medium text-ink">No matching login or logout events</p>
            <p className="text-xs text-ink-muted">
              Every login and sign-out will appear here permanently with its date and time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line-subtle bg-subtle/40 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-xs">
                {filtered.map((item) => {
                  const isLogin = item.eventType === 'login';
                  return (
                    <tr key={item.id} className="hover:bg-hover/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            isLogin
                              ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {isLogin ? (
                            <LogIn className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : (
                            <LogOut className="h-3 w-3 shrink-0" aria-hidden="true" />
                          )}
                          <span>{isLogin ? 'Admin Login' : 'Admin Logout'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-ink whitespace-nowrap">
                        {item.username}
                      </td>
                      <td className="px-5 py-3.5 text-ink-secondary whitespace-nowrap">
                        {item.role}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-ink whitespace-nowrap">
                        {formatDatePart(item.occurredAt)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-ink-secondary whitespace-nowrap">
                        {formatTimePart(item.occurredAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>Locked</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
