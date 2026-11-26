import crypto from 'crypto';
import { getSupabaseAdmin } from './supabaseClient';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const FALLBACK_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

// In-memory fallback hash when Supabase is not yet configured and ADMIN_PASSCODE is unset
let inMemoryClaimedHash: string | null = null;

function getSigningSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) return envSecret;
  return FALLBACK_SIGNING_SECRET;
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

async function readClaimedHash(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_auth_config')
        .select('passcode_hash')
        .eq('id', 'primary')
        .maybeSingle();
      if (!error && data && typeof data.passcode_hash === 'string') {
        return data.passcode_hash;
      }
    } catch {
      // Fallback to memory if admin_auth_config table has not been created yet
    }
  }
  return inMemoryClaimedHash;
}

async function writeClaimedHashIfUnset(passcodeHash: string): Promise<{ ok: boolean; conflict?: boolean }> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const existing = await supabase
        .from('admin_auth_config')
        .select('id')
        .eq('id', 'primary')
        .maybeSingle();

      if (!existing.error && existing.data) {
        return { ok: false, conflict: true };
      }

      if (!existing.error) {
        const { error: insertErr } = await supabase
          .from('admin_auth_config')
          .insert({
            id: 'primary',
            passcode_hash: passcodeHash,
            updated_at: new Date().toISOString(),
          });
        if (!insertErr) {
          inMemoryClaimedHash = passcodeHash;
          return { ok: true };
        }
        if (insertErr.code === '23505') {
          return { ok: false, conflict: true };
        }
      }
    } catch {
      // Fall through to in-memory lock if admin_auth_config table is not provisioned yet
    }
  }

  if (inMemoryClaimedHash) {
    return { ok: false, conflict: true };
  }
  inMemoryClaimedHash = passcodeHash;
  return { ok: true };
}

export async function getAuthStatus(): Promise<{
  usingEnvPasscode: boolean;
  authClaimed: boolean;
}> {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    return { usingEnvPasscode: true, authClaimed: true };
  }
  const storedHash = await readClaimedHash();
  return {
    usingEnvPasscode: false,
    authClaimed: Boolean(storedHash),
  };
}

function createSignedToken(): { token: string; expiresAt: string } {
  const now = Date.now();
  const expiresAtMs = now + SESSION_TTL_MS;
  const payload = {
    sub: 'store-admin',
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
): { ok: true } | { ok: false; status: number; error: string } {
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
      exp?: number;
    };
    if (
      parsed.sub !== 'store-admin' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp * 1000 <= Date.now()
    ) {
      return { ok: false, status: 401, error: 'Admin session expired. Sign in again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, error: 'Admin authentication required' };
  }
}

export async function handleClaimAdminPasscode(
  body: Record<string, unknown> | null
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    return {
      status: 409,
      payload: {
        ok: false,
        error: 'Admin passcode is already managed via ADMIN_PASSCODE environment variable.',
      },
    };
  }

  const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';
  if (passcode.length < 8 || passcode.length > 128) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: 'Passcode must be between 8 and 128 characters.',
      },
    };
  }

  const existing = await readClaimedHash();
  if (existing) {
    return {
      status: 409,
      payload: {
        ok: false,
        error: 'Admin passcode has already been claimed. Use sign-in instead.',
      },
    };
  }

  const hashed = hashPasscode(passcode);
  const saved = await writeClaimedHashIfUnset(hashed);
  if (!saved.ok) {
    return {
      status: 409,
      payload: {
        ok: false,
        error: 'Admin passcode has already been claimed. Use sign-in instead.',
      },
    };
  }

  const session = createSignedToken();
  return {
    status: 201,
    payload: {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      authClaimed: true,
    },
  };
}

export async function handleAdminLogin(
  body: Record<string, unknown> | null
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';
  if (!passcode) {
    return {
      status: 400,
      payload: { ok: false, error: 'Admin passcode is required.' },
    };
  }

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    if (!timingSafeCompareText(passcode, envPasscode)) {
      return {
        status: 401,
        payload: { ok: false, error: 'Invalid admin passcode.' },
      };
    }
    const session = createSignedToken();
    return {
      status: 200,
      payload: {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  }

  const storedHash = await readClaimedHash();
  if (!storedHash) {
    return {
      status: 403,
      payload: {
        ok: false,
        needsSetup: true,
        error: 'Admin passcode has not been set up yet. Complete first-run setup.',
      },
    };
  }

  if (!verifyPasscodeHash(passcode, storedHash)) {
    return {
      status: 401,
      payload: { ok: false, error: 'Invalid admin passcode.' },
    };
  }

  const session = createSignedToken();
  return {
    status: 200,
    payload: {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
    },
  };
}
