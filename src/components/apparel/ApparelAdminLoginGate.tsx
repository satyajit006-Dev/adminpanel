import { KeyRound, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useState } from 'react';
import type { BackendWebsiteConfig } from '../../types/apparel';

interface ApparelAdminLoginGateProps {
  brandName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  backendConfig: BackendWebsiteConfig;
  onAuthenticated: (token: string, isFirstClaim: boolean) => void;
  onRefreshConfig: () => Promise<void>;
}

export function ApparelAdminLoginGate({
  brandName,
  isDark,
  onToggleTheme,
  backendConfig,
  onAuthenticated,
  onRefreshConfig,
}: ApparelAdminLoginGateProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isClaimFlow =
    backendConfig.checked && !backendConfig.authClaimed && !backendConfig.usingEnvPasscode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = passcode.trim();
    if (!cleaned) {
      setError('Enter your admin passcode to continue.');
      return;
    }

    if (isClaimFlow) {
      if (cleaned.length < 8) {
        setError('Admin passcode must be at least 8 characters.');
        return;
      }
      if (cleaned !== confirmPasscode.trim()) {
        setError('Passcodes do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = isClaimFlow ? '/api/admin/auth/claim' : '/api/admin/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: cleaned }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setError(`Authentication endpoint unavailable (HTTP ${res.status}).`);
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        error?: string;
        needsSetup?: boolean;
      };

      if (!res.ok || !data.ok || !data.token) {
        setError(data.error ?? `Authentication failed (HTTP ${res.status}).`);
        if (data.needsSetup) {
          await onRefreshConfig();
        }
        return;
      }

      setPasscode('');
      setConfirmPasscode('');
      onAuthenticated(data.token, isClaimFlow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink transition-colors duration-200">
      <header className="flex items-center justify-between px-6 py-4 border-b border-line-subtle bg-surface/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-base font-bold tracking-tight text-ink truncate">
            {brandName || 'Apparel Admin'}
          </span>
          <span className="text-line" aria-hidden="true">
            /
          </span>
          <span className="text-xs font-medium text-ink-muted whitespace-nowrap">
            Protected Admin Portal
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-accent-text">
              <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                {!backendConfig.checked
                  ? 'Connecting'
                  : isClaimFlow
                    ? 'Initial Admin Setup'
                    : 'Administrator Sign In'}
              </span>
            </div>
            <h1 className="font-display text-xl font-semibold text-ink">
              {!backendConfig.checked
                ? 'Checking backend security...'
                : isClaimFlow
                  ? 'Set your store admin passcode'
                  : 'Sign in to Admin Panel'}
            </h1>
            <p className="text-xs leading-relaxed text-ink-secondary">
              {!backendConfig.checked
                ? 'Verifying Supabase database connection and admin session requirements.'
                : isClaimFlow
                  ? 'Create an admin passcode (minimum 8 characters) to lock product catalog, order fulfillment, customer records, and Supabase Storage uploads.'
                  : 'Enter your administrator passcode to manage products, Supabase Storage photos, orders, customers, and inventory.'}
            </p>
          </div>

          <div className="rounded-lg border border-line-subtle bg-subtle/50 px-3.5 py-2.5 text-xs">
            {backendConfig.supabaseConfigured ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Supabase Connected
                </span>
                <span className="font-mono text-[11px] text-ink-muted truncate">
                  {backendConfig.targetOrigin}
                </span>
              </div>
            ) : backendConfig.checked ? (
              <p className="text-ink-muted">
                Supabase env vars not detected yet. Add{' '}
                <code className="font-mono text-ink">SUPABASE_URL</code> and{' '}
                <code className="font-mono text-ink">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
              </p>
            ) : (
              <p className="text-ink-muted">Checking database configuration...</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-passcode-input"
                className="block text-xs font-medium text-ink-secondary"
              >
                {isClaimFlow ? 'New Admin Passcode *' : 'Admin Passcode *'}
              </label>
              <input
                id="admin-passcode-input"
                type="password"
                autoComplete={isClaimFlow ? 'new-password' : 'current-password'}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={isClaimFlow ? 'Minimum 8 characters' : 'Enter admin passcode'}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>

            {isClaimFlow && (
              <div>
                <label
                  htmlFor="admin-confirm-passcode-input"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Confirm Passcode *
                </label>
                <input
                  id="admin-confirm-passcode-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>
            )}

            {error && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !backendConfig.checked}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Authenticating...'
                  : isClaimFlow
                    ? 'Save Passcode & Enter Dashboard'
                    : 'Sign In to Admin Panel'}
              </span>
            </button>
          </form>

          <p className="text-[11px] text-ink-muted border-t border-line-subtle pt-4">
            Session tokens are kept strictly in memory and never stored in browser localStorage.
            Configure <code className="font-mono text-ink">ADMIN_PASSCODE</code> in server secrets to override anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
