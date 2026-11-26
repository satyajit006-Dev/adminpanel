import { History, Lock, LogIn, LogOut, RefreshCw } from 'lucide-react';
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
  return (
    <div className="space-y-4">
      {tableMissing && (
        <div className="rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-300">
          Run the <code className="font-mono font-semibold">admin_session_history</code> SQL in
          Supabase SQL Editor to persist records permanently across deployments.
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="h-3.5 w-3.5 text-ink-muted shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-ink truncate">
              Login &amp; Logout History
            </h2>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover hover:text-ink disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <History className="mx-auto h-6 w-6 text-ink-muted" aria-hidden="true" />
            <p className="text-xs font-medium text-ink">No login or logout history yet</p>
            <p className="text-xs text-ink-muted">
              Every login and logout will appear here permanently with date and time.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-xs">
                {history.map((item) => {
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
                          <span>{isLogin ? 'Login' : 'Logout'}</span>
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
