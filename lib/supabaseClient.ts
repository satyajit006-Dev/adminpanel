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

export function isSupabaseConfigured(): boolean {
  const url = parseSafeHttpUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && serviceKey);
}

export function getSupabaseOrigin(): string | null {
  const url = parseSafeHttpUrl(process.env.SUPABASE_URL);
  return url ? url.origin : null;
}

export function getProductsTableName(): string {
  const raw = process.env.SUPABASE_PRODUCTS_TABLE?.trim() || 'products';
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : 'products';
}

export function getStorageBucketName(): string | null {
  const raw = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!raw) return null;
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : null;
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
