import { Eye, EyeOff, KeyRound, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { useState } from 'react';
import type {
  AdminRoleLabel,
  AdminSessionHistoryEntry,
  BackendWebsiteConfig,
} from '../../types/apparel';

interface ApparelAdminLoginGateProps {
  brandName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  backendConfig: BackendWebsiteConfig;
  onAuthenticated: (
    token: string,
    username: string,
    role: AdminRoleLabel,
    historyEntry?: AdminSessionHistoryEntry
  ) => void;
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
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanedUsername = username.trim().toLowerCase();
    const cleanedPasscode = passcode.trim();

    if (!cleanedUsername) {
      setError('Enter your username.');
      return;
    }
    if (!/^[a-z0-9._@-]{3,64}$/.test(cleanedUsername)) {
      setError(
        'Username must be 3–64 characters using letters, numbers, dots, underscores, hyphens, or @.'
      );
      return;
    }
    if (!cleanedPasscode) {
      setError('Enter your passcode.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanedUsername,
          passcode: cleanedPasscode,
        }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setError(`Authentication endpoint unavailable (HTTP ${res.status}).`);
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        username?: string;
        role?: AdminRoleLabel;
        historyEntry?: AdminSessionHistoryEntry;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.token) {
        setError(data.error ?? `Authentication failed (HTTP ${res.status}).`);
        return;
      }

      const authenticatedUser = data.username || cleanedUsername;
      const authenticatedRole: AdminRoleLabel = data.role === 'Co-Founder' ? 'Co-Founder' : 'Owner';
      setPasscode('');
      setShowPasscode(false);
      onAuthenticated(data.token, authenticatedUser, authenticatedRole, data.historyEntry);
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

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-accent-text">
              <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                Admin Sign In
              </span>
            </div>
            <h1 className="font-display text-xl font-semibold text-ink">
              Sign in to Admin Panel
            </h1>
            <p className="text-xs leading-relaxed text-ink-secondary">
              Enter your preregistered username and passcode to access the Admin Panel.
            </p>
          </div>

          {backendConfig.configError && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 px-3.5 py-2.5 text-xs">
              <span className="text-red-700 dark:text-red-400">
                {backendConfig.configError}
              </span>
              <button
                type="button"
                onClick={() => void onRefreshConfig()}
                className="shrink-0 font-semibold text-accent-text hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username-input"
                className="block text-xs font-medium text-ink-secondary"
              >
                Username *
              </label>
              <div className="relative mt-1.5">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="admin-username-input"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-passcode-input"
                className="block text-xs font-medium text-ink-secondary"
              >
                Passcode *
              </label>
              <div className="relative mt-1.5">
                <input
                  id="admin-passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your passcode"
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitting ? 'Authenticating...' : 'Sign In to Admin Panel'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
