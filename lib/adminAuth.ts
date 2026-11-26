import crypto from 'crypto';
import { getSupabaseAdmin } from './supabaseClient.js';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const RANDOM_DEV_SECRET = crypto.randomBytes(32).toString('hex');

export type AdminRoleKey = 'owner' | 'co_founder';
export type AdminRoleLabel = 'Owner' | 'Co-Founder';

interface StoredAdminCredential {
  roleKey: AdminRoleKey;
  roleLabel: AdminRoleLabel;
  username: string;
  passcodeHash?: string;
  plainEnvPasscode?: string;
  altEnvUsernames?: string[];
  source: 'env' | 'database' | 'memory';
}

// In-memory fallback when Supabase is not yet configured and env passcodes are unset
const inMemoryCredentials: Partial<Record<AdminRoleKey, StoredAdminCredential>> = {};

function roleLabelFromKey(key: AdminRoleKey): AdminRoleLabel {
  return key === 'co_founder' ? 'Co-Founder' : 'Owner';
}

function getSigningSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) return envSecret;

  // Deterministic across separate Vercel serverless invocations when server secrets exist
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  const ownerPass =
    process.env.ADMIN_OWNER_PASSCODE?.trim() || process.env.ADMIN_PASSCODE?.trim() || '';
  const cofounderPass = process.env.ADMIN_COFOUNDER_PASSCODE?.trim() || '';
  if (serviceKey || ownerPass || cofounderPass) {
    return crypto
      .createHmac('sha256', 'apparel-admin-session-key-v2')
      .update(`${serviceKey}::${ownerPass}::${cofounderPass}`)
      .digest('hex');
  }

  return RANDOM_DEV_SECRET;
}

function normalizeUsername(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9._@-]{3,64}$/.test(username);
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(passcode, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeCompareText(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getEnvCredential(roleKey: AdminRoleKey): StoredAdminCredential | null {
  if (roleKey === 'owner') {
    const passcode =
      process.env.ADMIN_OWNER_PASSCODE?.trim() || process.env.ADMIN_PASSCODE?.trim() || '';
    if (!passcode) return null;
    const explicitUser =
      process.env.ADMIN_OWNER_USERNAME?.trim().toLowerCase() ||
      process.env.ADMIN_USERNAME?.trim().toLowerCase() ||
      '';
    return {
      roleKey: 'owner',
      roleLabel: 'Owner',
      username: explicitUser || 'owner',
      altEnvUsernames: explicitUser ? [] : ['admin'],
      plainEnvPasscode: passcode,
      source: 'env',
    };
  }

  const passcode = process.env.ADMIN_COFOUNDER_PASSCODE?.trim() || '';
  if (!passcode) return null;
  const explicitUser = process.env.ADMIN_COFOUNDER_USERNAME?.trim().toLowerCase() || '';
  return {
    roleKey: 'co_founder',
    roleLabel: 'Co-Founder',
    username: explicitUser || 'cofounder',
    altEnvUsernames: explicitUser ? [] : ['co-founder', 'co_founder'],
    plainEnvPasscode: passcode,
    source: 'env',
  };
}

async function readDbCredential(roleKey: AdminRoleKey): Promise<StoredAdminCredential | null> {
  const envCred = getEnvCredential(roleKey);
  if (envCred) return envCred;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const idsToCheck = roleKey === 'owner' ? ['owner', 'primary'] : ['co_founder'];
    for (const id of idsToCheck) {
      try {
        const { data, error } = await supabase
          .from('admin_auth_config')
          .select('id, admin_role, admin_username, passcode_hash')
          .eq('id', id)
          .maybeSingle();

        if (!error && data && typeof data.passcode_hash === 'string') {
          return {
            roleKey,
            roleLabel: roleLabelFromKey(roleKey),
            username:
              typeof data.admin_username === 'string' && data.admin_username.trim()
                ? data.admin_username.trim().toLowerCase()
                : roleKey === 'co_founder'
                  ? 'cofounder'
                  : 'owner',
            passcodeHash: data.passcode_hash,
            source: 'database',
          };
        }

        // Backwards compatibility if admin_role or admin_username columns don't exist yet
        if (error && error.code === '42703') {
          const legacy = await supabase
            .from('admin_auth_config')
            .select('passcode_hash')
            .eq('id', id)
            .maybeSingle();
          if (!legacy.error && legacy.data && typeof legacy.data.passcode_hash === 'string') {
            return {
              roleKey,
              roleLabel: roleLabelFromKey(roleKey),
              username: roleKey === 'co_founder' ? 'cofounder' : 'admin',
              passcodeHash: legacy.data.passcode_hash,
              source: 'database',
            };
          }
        }
      } catch {
        // Fallback to in-memory store
      }
    }
  }

  return inMemoryCredentials[roleKey] ?? null;
}

async function upsertRoleCredential(
  roleKey: AdminRoleKey,
  username: string,
  passcodeHash: string
): Promise<{ ok: boolean; error?: string }> {
  const roleLabel = roleLabelFromKey(roleKey);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      let { error } = await supabase.from('admin_auth_config').upsert(
        {
          id: roleKey,
          admin_role: roleLabel,
          admin_username: username,
          passcode_hash: passcodeHash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      // Legacy table compatibility
      if (error && error.code === '42703') {
        const retry = await supabase.from('admin_auth_config').upsert(
          {
            id: roleKey,
            admin_username: username,
            passcode_hash: passcodeHash,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        error = retry.error;
      }
      if (error && error.code === '42703') {
        const retryMin = await supabase.from('admin_auth_config').upsert(
          {
            id: roleKey,
            passcode_hash: passcodeHash,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        error = retryMin.error;
      }

      if (error) {
        if (error.code !== '42P01') {
          return { ok: false, error: `Failed to save ${roleLabel} credentials: ${error.message}` };
        }
      } else {
        inMemoryCredentials[roleKey] = {
          roleKey,
          roleLabel,
          username,
          passcodeHash,
          source: 'database',
        };
        return { ok: true };
      }
    } catch {
      // Fall through to memory if table doesn't exist yet
    }
  }

  inMemoryCredentials[roleKey] = {
    roleKey,
    roleLabel,
    username,
    passcodeHash,
    source: 'memory',
  };
  return { ok: true };
}

function matchesCredential(
  cred: StoredAdminCredential,
  username: string,
  passcode: string
): boolean {
  const validUsernames = [cred.username, ...(cred.altEnvUsernames ?? [])];
  const userMatched = validUsernames.some((candidate) =>
    timingSafeCompareText(username, candidate)
  );
  if (!userMatched) return false;

  if (cred.plainEnvPasscode) {
    return timingSafeCompareText(passcode, cred.plainEnvPasscode);
  }
  if (cred.passcodeHash) {
    return verifyPasscodeHash(passcode, cred.passcodeHash);
  }
  return false;
}

function matchesPasscodeOnly(cred: StoredAdminCredential, passcode: string): boolean {
  if (cred.plainEnvPasscode) {
    return timingSafeCompareText(passcode, cred.plainEnvPasscode);
  }
  if (cred.passcodeHash) {
    return verifyPasscodeHash(passcode, cred.passcodeHash);
  }
  return false;
}

export async function getAuthStatus(): Promise<{
  usingEnvPasscode: boolean;
  usingEnvUsername: boolean;
  authClaimed: boolean;
  ownerClaimed: boolean;
  cofounderClaimed: boolean;
  usingEnvOwnerPasscode: boolean;
  usingEnvCofounderPasscode: boolean;
  usingEnvOwnerUsername: boolean;
  usingEnvCofounderUsername: boolean;
}> {
  const [ownerCred, cofounderCred] = await Promise.all([
    readDbCredential('owner'),
    readDbCredential('co_founder'),
  ]);

  const usingEnvOwnerPasscode = Boolean(
    process.env.ADMIN_OWNER_PASSCODE?.trim() || process.env.ADMIN_PASSCODE?.trim()
  );
  const usingEnvCofounderPasscode = Boolean(process.env.ADMIN_COFOUNDER_PASSCODE?.trim());
  const usingEnvOwnerUsername = Boolean(
    process.env.ADMIN_OWNER_USERNAME?.trim() || process.env.ADMIN_USERNAME?.trim()
  );
  const usingEnvCofounderUsername = Boolean(process.env.ADMIN_COFOUNDER_USERNAME?.trim());

  const ownerClaimed = Boolean(ownerCred);
  const cofounderClaimed = Boolean(cofounderCred);

  return {
    usingEnvPasscode: usingEnvOwnerPasscode,
    usingEnvUsername: usingEnvOwnerUsername,
    authClaimed: ownerClaimed || cofounderClaimed,
    ownerClaimed,
    cofounderClaimed,
    usingEnvOwnerPasscode,
    usingEnvCofounderPasscode,
    usingEnvOwnerUsername,
    usingEnvCofounderUsername,
  };
}

function createSignedToken(
  username: string,
  roleLabel: AdminRoleLabel
): { token: string; expiresAt: string } {
  const now = Date.now();
  const expiresAtMs = now + SESSION_TTL_MS;
  const payload = {
    sub: 'store-admin',
    username,
    role: roleLabel,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAtMs / 1000),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export function verifyAdminBearerToken(
  authorizationHeader: string | undefined
):
  | { ok: true; username?: string; role?: AdminRoleLabel }
  | { ok: false; status: number; error: string } {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  const bufA = Buffer.from(providedSig, 'utf8');
  const bufB = Buffer.from(expectedSig, 'utf8');
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      sub?: string;
      username?: string;
      role?: AdminRoleLabel;
      exp?: number;
    };
    if (
      parsed.sub !== 'store-admin' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp * 1000 <= Date.now()
    ) {
      return { ok: false, status: 401, error: 'Admin session expired. Sign in again.' };
    }
    return { ok: true, username: parsed.username, role: parsed.role };
  } catch {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }
}

export async function handleClaimAdminPasscode(
  _body: Record<string, unknown> | null
): Promise<{ status: number; payload: Record<string, unknown> }> {
  return {
    status: 403,
    payload: {
      ok: false,
      error: 'Admin self-registration is disabled. Only preregistered admins can sign in.',
    },
  };
}

function verifyStoredSecret(passcode: string, storedSecret: string): boolean {
  const trimmed = storedSecret.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('scrypt$')) {
    return verifyPasscodeHash(passcode, trimmed);
  }
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    const shaHex = crypto.createHash('sha256').update(passcode).digest('hex');
    return timingSafeCompareText(shaHex.toLowerCase(), trimmed.toLowerCase());
  }
  return timingSafeCompareText(passcode, trimmed);
}

export async function handleAdminLogin(
  body: Record<string, unknown> | null
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const username = normalizeUsername(body?.username);
  const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';

  if (!username || !passcode) {
    return {
      status: 400,
      payload: { ok: false, error: 'Username and passcode are required.' },
    };
  }

  const [ownerCred, cofounderCred] = await Promise.all([
    readDbCredential('owner'),
    readDbCredential('co_founder'),
  ]);

  const candidates = [ownerCred, cofounderCred].filter(
    (c): c is StoredAdminCredential => Boolean(c)
  );

  for (const cred of candidates) {
    if (matchesCredential(cred, username, passcode)) {
      const displayUser = cred.altEnvUsernames?.includes(username) ? username : cred.username;
      const session = createSignedToken(displayUser, cred.roleLabel);
      return {
        status: 200,
        payload: {
          ok: true,
          token: session.token,
          expiresAt: session.expiresAt,
          username: displayUser,
          role: cred.roleLabel,
        },
      };
    }
  }

  let hasAnyConfiguredSource = candidates.length > 0;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    // 1. Check any matching row in admin_auth_config by admin_username
    try {
      const { data: authRows, error: authErr } = await supabase
        .from('admin_auth_config')
        .select('id, admin_role, admin_username, passcode_hash')
        .limit(20);

      if (!authErr && Array.isArray(authRows) && authRows.length > 0) {
        hasAnyConfiguredSource = true;
        for (const row of authRows) {
          const rowUser = normalizeUsername(row.admin_username);
          if (
            rowUser &&
            timingSafeCompareText(rowUser, username) &&
            typeof row.passcode_hash === 'string' &&
            verifyPasscodeHash(passcode, row.passcode_hash)
          ) {
            const roleLabel: AdminRoleLabel =
              row.id === 'co_founder' || row.admin_role === 'Co-Founder' ? 'Co-Founder' : 'Owner';
            const session = createSignedToken(rowUser, roleLabel);
            return {
              status: 200,
              payload: {
                ok: true,
                token: session.token,
                expiresAt: session.expiresAt,
                username: rowUser,
                role: roleLabel,
              },
            };
          }
        }
      }
    } catch {
      // Table may not exist in pre-existing database
    }

    // 2. Check common existing Supabase admin tables (admin_users, admins)
    for (const table of ['admin_users', 'admins'] as const) {
      try {
        const { data: rows, error: tableErr } = await supabase.from(table).select('*').limit(50);
        if (tableErr || !Array.isArray(rows) || rows.length === 0) continue;

        hasAnyConfiguredSource = true;
        for (const row of rows as Array<Record<string, unknown>>) {
          const candidateNames = [row.username, row.admin_username, row.email]
            .map((v) => normalizeUsername(v))
            .filter(Boolean);

          if (!candidateNames.some((n) => timingSafeCompareText(n, username))) continue;

          const secretField = [row.passcode_hash, row.password_hash, row.passcode]
            .find((v): v is string => typeof v === 'string' && v.trim().length > 0);

          if (secretField && verifyStoredSecret(passcode, secretField)) {
            const rawRole = String(row.role ?? row.admin_role ?? '').toLowerCase();
            const roleLabel: AdminRoleLabel =
              rawRole.includes('co_founder') || rawRole.includes('co-founder') || rawRole.includes('cofounder')
                ? 'Co-Founder'
                : 'Owner';
            const displayUser = candidateNames[0] || username;
            const session = createSignedToken(displayUser, roleLabel);
            return {
              status: 200,
              payload: {
                ok: true,
                token: session.token,
                expiresAt: session.expiresAt,
                username: displayUser,
                role: roleLabel,
              },
            };
          }
        }
      } catch {
        // Table may not exist in Supabase
      }
    }
  }

  if (!hasAnyConfiguredSource) {
    return {
      status: 401,
      payload: {
        ok: false,
        error:
          'No preregistered admin credentials found on the server. Configure ADMIN_OWNER_USERNAME & ADMIN_OWNER_PASSCODE (and optional ADMIN_COFOUNDER_USERNAME & ADMIN_COFOUNDER_PASSCODE) in environment variables, or add rows in Supabase.',
      },
    };
  }

  return {
    status: 401,
    payload: { ok: false, error: 'Invalid username or passcode.' },
  };
}

export async function handleGetAdminCredentials(
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const [ownerCred, cofounderCred] = await Promise.all([
    readDbCredential('owner'),
    readDbCredential('co_founder'),
  ]);

  return {
    status: 200,
    payload: {
      ok: true,
      owner: {
        configured: Boolean(ownerCred),
        source: ownerCred?.source ?? 'unset',
        username: ownerCred?.username ?? '',
      },
      cofounder: {
        configured: Boolean(cofounderCred),
        source: cofounderCred?.source ?? 'unset',
        username: cofounderCred?.username ?? '',
      },
    },
  };
}

export async function handleSaveAdminCredential(
  body: Record<string, unknown> | null,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const roleKey: AdminRoleKey | null =
    body?.role === 'owner'
      ? 'owner'
      : body?.role === 'co_founder'
        ? 'co_founder'
        : null;

  if (!roleKey) {
    return {
      status: 400,
      payload: { ok: false, error: 'Role must be "owner" or "co_founder".' },
    };
  }

  if (getEnvCredential(roleKey)) {
    return {
      status: 409,
      payload: {
        ok: false,
        error:
          roleKey === 'owner'
            ? 'Owner credentials are locked by ADMIN_OWNER_PASSCODE / ADMIN_PASSCODE environment variables.'
            : 'Co-Founder credentials are locked by ADMIN_COFOUNDER_PASSCODE environment variable.',
      },
    };
  }

  const username = normalizeUsername(body?.username);
  const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';

  if (!isValidUsername(username)) {
    return {
      status: 400,
      payload: {
        ok: false,
        error:
          'Username must be 3–64 characters using letters, numbers, dots, underscores, hyphens, or @.',
      },
    };
  }
  if (passcode.length < 8 || passcode.length > 128) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: 'Passcode must be between 8 and 128 characters.',
      },
    };
  }

  const otherRoleKey: AdminRoleKey = roleKey === 'owner' ? 'co_founder' : 'owner';
  const otherCred = await readDbCredential(otherRoleKey);
  if (otherCred) {
    const otherNames = [otherCred.username, ...(otherCred.altEnvUsernames ?? [])];
    if (otherNames.some((n) => timingSafeCompareText(username, n))) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: `${roleLabelFromKey(roleKey)} username must be different from ${otherCred.roleLabel} username.`,
        },
      };
    }
    if (matchesPasscodeOnly(otherCred, passcode)) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: `${roleLabelFromKey(roleKey)} passcode must be different from ${otherCred.roleLabel} passcode.`,
        },
      };
    }
  }

  const saved = await upsertRoleCredential(roleKey, username, hashPasscode(passcode));
  if (!saved.ok) {
    return {
      status: 502,
      payload: { ok: false, error: saved.error ?? 'Failed to save admin credentials.' },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      role: roleLabelFromKey(roleKey),
      username,
    },
  };
}
