import { Eye, EyeOff, KeyRound, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { useState } from 'react';
import type { AdminRoleLabel, BackendWebsiteConfig } from '../../types/apparel';

interface ApparelAdminLoginGateProps {
  brandName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  backendConfig: BackendWebsiteConfig;
  onAuthenticated: (
    token: string,
    username: string,
    role: AdminRoleLabel,
    isFirstClaim: boolean
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
  // Returning sign-in state
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // First-run setup state (Owner + Co-Founder)
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPasscode, setOwnerPasscode] = useState('');
  const [ownerConfirmPasscode, setOwnerConfirmPasscode] = useState('');
  const [showOwnerPasscode, setShowOwnerPasscode] = useState(false);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);

  const [cofounderUsername, setCofounderUsername] = useState('');
  const [cofounderPasscode, setCofounderPasscode] = useState('');
  const [cofounderConfirmPasscode, setCofounderConfirmPasscode] = useState('');
  const [showCofounderPasscode, setShowCofounderPasscode] = useState(false);
  const [showCofounderConfirm, setShowCofounderConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isClaimFlow =
    backendConfig.checked &&
    !backendConfig.configError &&
    !backendConfig.authClaimed &&
    !backendConfig.ownerClaimed &&
    !backendConfig.cofounderClaimed &&
    !backendConfig.usingEnvPasscode;

  const ownerMismatch =
    isClaimFlow &&
    ownerConfirmPasscode.length > 0 &&
    ownerPasscode.trim() !== ownerConfirmPasscode.trim();

  const cofounderMismatch =
    isClaimFlow &&
    cofounderConfirmPasscode.length > 0 &&
    cofounderPasscode.trim() !== cofounderConfirmPasscode.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isClaimFlow) {
      const cleanOwnerUser = ownerUsername.trim().toLowerCase();
      const cleanOwnerPass = ownerPasscode.trim();
      const cleanCofounderUser = cofounderUsername.trim().toLowerCase();
      const cleanCofounderPass = cofounderPasscode.trim();

      if (!/^[a-z0-9._@-]{3,64}$/.test(cleanOwnerUser)) {
        setError(
          'Owner username must be 3–64 characters using letters, numbers, dots, underscores, hyphens, or @.'
        );
        return;
      }
      if (cleanOwnerPass.length < 8) {
        setError('Owner passcode must be at least 8 characters.');
        return;
      }
      if (cleanOwnerPass !== ownerConfirmPasscode.trim()) {
        setError('Owner passcodes do not match. Use the eye icon to verify.');
        return;
      }

      if (!/^[a-z0-9._@-]{3,64}$/.test(cleanCofounderUser)) {
        setError(
          'Co-Founder username must be 3–64 characters using letters, numbers, dots, underscores, hyphens, or @.'
        );
        return;
      }
      if (cleanCofounderPass.length < 8) {
        setError('Co-Founder passcode must be at least 8 characters.');
        return;
      }
      if (cleanCofounderPass !== cofounderConfirmPasscode.trim()) {
        setError('Co-Founder passcodes do not match. Use the eye icon to verify.');
        return;
      }

      if (cleanOwnerUser === cleanCofounderUser) {
        setError('Owner and Co-Founder must use different usernames.');
        return;
      }
      if (cleanOwnerPass === cleanCofounderPass) {
        setError('Owner and Co-Founder must use two different passcodes.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/admin/auth/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerUsername: cleanOwnerUser,
            ownerPasscode: cleanOwnerPass,
            cofounderUsername: cleanCofounderUser,
            cofounderPasscode: cleanCofounderPass,
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
          error?: string;
        };
        if (!res.ok || !data.ok || !data.token) {
          setError(data.error ?? `Setup failed (HTTP ${res.status}).`);
          return;
        }

        setOwnerPasscode('');
        setOwnerConfirmPasscode('');
        setCofounderPasscode('');
        setCofounderConfirmPasscode('');
        onAuthenticated(data.token, data.username || cleanOwnerUser, data.role || 'Owner', true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to reach authentication server.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const cleanedUsername = username.trim().toLowerCase();
    const cleanedPasscode = passcode.trim();

    if (!cleanedUsername) {
      setError('Enter your admin username.');
      return;
    }
    if (!/^[a-z0-9._@-]{3,64}$/.test(cleanedUsername)) {
      setError(
        'Username must be 3–64 characters using letters, numbers, dots, underscores, hyphens, or @.'
      );
      return;
    }
    if (!cleanedPasscode) {
      setError('Enter your admin passcode.');
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

      const authenticatedUser = data.username || cleanedUsername;
      const authenticatedRole: AdminRoleLabel = data.role === 'Co-Founder' ? 'Co-Founder' : 'Owner';
      setPasscode('');
      setShowPasscode(false);
      onAuthenticated(data.token, authenticatedUser, authenticatedRole, false);
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
        <div
          className={`w-full ${
            isClaimFlow ? 'max-w-xl' : 'max-w-md'
          } rounded-xl border border-line bg-surface p-7 space-y-6`}
        >
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
                  ? 'Set Owner & Co-Founder credentials'
                  : 'Sign in to Admin Panel'}
            </h1>
            <p className="text-xs leading-relaxed text-ink-secondary">
              {!backendConfig.checked
                ? 'Verifying Supabase database connection and admin session requirements.'
                : isClaimFlow
                  ? 'Create two separate usernames and passcodes — one for the Owner and one for the Co-Founder — to protect your store backend.'
                  : 'Enter your username and passcode — your Owner or Co-Founder role is detected automatically.'}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {isClaimFlow ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Owner Credentials Block */}
                <div className="rounded-lg border border-line bg-subtle/30 p-4 space-y-3">
                  <p className="font-display text-xs font-semibold text-ink border-b border-line-subtle pb-2">
                    1. Owner Account
                  </p>
                  <div>
                    <label
                      htmlFor="setup-owner-username"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Owner Username *
                    </label>
                    <input
                      id="setup-owner-username"
                      type="text"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value)}
                      placeholder="e.g. owner"
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="setup-owner-passcode"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Owner Passcode *
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="setup-owner-passcode"
                        type={showOwnerPasscode ? 'text' : 'password'}
                        required
                        value={ownerPasscode}
                        onChange={(e) => setOwnerPasscode(e.target.value)}
                        placeholder="Min 8 chars"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-9 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPasscode((p) => !p)}
                        aria-label={showOwnerPasscode ? 'Hide owner passcode' : 'Show owner passcode'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                      >
                        {showOwnerPasscode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="setup-owner-confirm"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Confirm Owner Passcode *
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="setup-owner-confirm"
                        type={showOwnerConfirm ? 'text' : 'password'}
                        required
                        value={ownerConfirmPasscode}
                        onChange={(e) => setOwnerConfirmPasscode(e.target.value)}
                        placeholder="Re-enter passcode"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-9 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerConfirm((p) => !p)}
                        aria-label={showOwnerConfirm ? 'Hide confirm owner passcode' : 'Show confirm owner passcode'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                      >
                        {showOwnerConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {ownerMismatch && (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                        Owner passcodes do not match yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Co-Founder Credentials Block */}
                <div className="rounded-lg border border-line bg-subtle/30 p-4 space-y-3">
                  <p className="font-display text-xs font-semibold text-ink border-b border-line-subtle pb-2">
                    2. Co-Founder Account
                  </p>
                  <div>
                    <label
                      htmlFor="setup-cofounder-username"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Co-Founder Username *
                    </label>
                    <input
                      id="setup-cofounder-username"
                      type="text"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      value={cofounderUsername}
                      onChange={(e) => setCofounderUsername(e.target.value)}
                      placeholder="e.g. cofounder"
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="setup-cofounder-passcode"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Co-Founder Passcode *
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="setup-cofounder-passcode"
                        type={showCofounderPasscode ? 'text' : 'password'}
                        required
                        value={cofounderPasscode}
                        onChange={(e) => setCofounderPasscode(e.target.value)}
                        placeholder="Min 8 chars (different)"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-9 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCofounderPasscode((p) => !p)}
                        aria-label={
                          showCofounderPasscode ? 'Hide co-founder passcode' : 'Show co-founder passcode'
                        }
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                      >
                        {showCofounderPasscode ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="setup-cofounder-confirm"
                      className="block text-xs font-medium text-ink-secondary"
                    >
                      Confirm Co-Founder Passcode *
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="setup-cofounder-confirm"
                        type={showCofounderConfirm ? 'text' : 'password'}
                        required
                        value={cofounderConfirmPasscode}
                        onChange={(e) => setCofounderConfirmPasscode(e.target.value)}
                        placeholder="Re-enter passcode"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-9 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCofounderConfirm((p) => !p)}
                        aria-label={
                          showCofounderConfirm
                            ? 'Hide confirm co-founder passcode'
                            : 'Show confirm co-founder passcode'
                        }
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                      >
                        {showCofounderConfirm ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {cofounderMismatch && (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                        Co-Founder passcodes do not match yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
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
              </>
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
                    ? 'Save Owner & Co-Founder Passcodes'
                    : 'Sign In to Admin Panel'}
              </span>
            </button>
          </form>

          <p className="text-[11px] text-ink-muted border-t border-line-subtle pt-4">
            {isClaimFlow
              ? 'Or configure ADMIN_OWNER_USERNAME, ADMIN_OWNER_PASSCODE, ADMIN_COFOUNDER_USERNAME, and ADMIN_COFOUNDER_PASSCODE in server environment secrets.'
              : 'Need to add or update the Co-Founder passcode? Sign in as Owner and open Staff & Permissions.'}
          </p>
        </div>
      </main>
    </div>
  );
}
