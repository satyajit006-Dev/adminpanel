import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function parseSafeHttpUrl(rawUrl: string | undefined): URL | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host.startsWith('169.254.')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSupabaseKeyRoleHint(): 'service_role' | 'anon' | 'publishable' | 'secret' | 'unknown' {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return 'unknown';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('sb_secret_')) return 'secret';
  const parts = key.split('.');
  if (parts.length === 3 && parts[1]) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
        role?: string;
      };
      if (payload.role === 'anon') return 'anon';
      if (payload.role === 'service_role') return 'service_role';
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

export function isSupabaseConfigured(): boolean {
  const url = parseSafeHttpUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && serviceKey);
}

export function getSupabaseOrigin(): string | null {
  const url = parseSafeHttpUrl(process.env.SUPABASE_URL);
  return url ? url.origin : null;
}

function safeTableName(envValue: string | undefined, fallback: string): string {
  const raw = envValue?.trim() || fallback;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : fallback;
}

export function getProductsTableName(): string {
  return safeTableName(process.env.SUPABASE_PRODUCTS_TABLE, 'products');
}

export function getOrdersTableName(): string {
  return safeTableName(process.env.SUPABASE_ORDERS_TABLE, 'orders');
}

export function getCustomersTableName(): string {
  return safeTableName(process.env.SUPABASE_CUSTOMERS_TABLE, 'customers');
}

export function getTransactionsTableName(): string {
  return safeTableName(process.env.SUPABASE_TRANSACTIONS_TABLE, 'transactions');
}

export function getStorageBucketName(): string {
  const raw = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'product-images';
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : 'product-images';
}

let cachedClient: { key: string; client: SupabaseClient } | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = parseSafeHttpUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  const cacheKey = `${url.origin}::${serviceKey.slice(0, 12)}`;
  if (cachedClient && cachedClient.key === cacheKey) {
    return cachedClient.client;
  }

  const client = createClient(url.origin, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  cachedClient = { key: cacheKey, client };
  return client;
}
