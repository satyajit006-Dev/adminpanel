import crypto from 'crypto';
import { getAuthStatus, verifyAdminBearerToken } from './adminAuth.js';
import {
  getProductsTableName,
  getStorageBucketName,
  getSupabaseAdmin,
  getSupabaseOrigin,
  isSupabaseConfigured,
  parseSafeHttpUrl,
} from './supabaseClient.js';

export interface NormalizedProductPayload {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  fabric: string;
  careInstructions?: string;
  sizesAvailable: string;
  colors: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isBestseller: boolean;
  publishedToWebsite: boolean;
  description: string;
  images: string[];
  tags: string[];
  syncedAt: string;
}

function isSafeImageRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_500_000) return false;
  if (trimmed.startsWith('/src/') || trimmed.startsWith('/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapSupabaseRowToProduct(row: Record<string, unknown>): NormalizedProductPayload & {
  websiteSyncStatus: 'synced';
  lastSyncedAt: string;
} {
  const num = (v: unknown, fallback = 0): number => {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const optNum = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : [];

  const updatedAt =
    typeof row.updated_at === 'string'
      ? row.updated_at
      : typeof row.updatedAt === 'string'
        ? row.updatedAt
        : new Date().toISOString();

  const name = typeof row.name === 'string' ? row.name : 'Untitled Product';
  const sku = typeof row.sku === 'string' ? row.sku : '';
  const isAvailable =
    typeof row.is_available === 'boolean'
      ? row.is_available
      : typeof row.isAvailable === 'boolean'
        ? row.isAvailable
        : true;
  const published =
    typeof row.published_to_website === 'boolean'
      ? row.published_to_website
      : typeof row.publishedToWebsite === 'boolean'
        ? row.publishedToWebsite
        : isAvailable;

  return {
    id: typeof row.id === 'string' && row.id ? row.id : `prod-${sku || Date.now()}`,
    sku,
    name,
    slug: typeof row.slug === 'string' && row.slug ? row.slug : slugify(name),
    categoryId:
      typeof row.category_id === 'string'
        ? row.category_id
        : typeof row.categoryId === 'string'
          ? row.categoryId
          : 'cat-1',
    categoryName:
      typeof row.category_name === 'string'
        ? row.category_name
        : typeof row.categoryName === 'string'
          ? row.categoryName
          : 'Apparel',
    price: num(row.price, 0),
    compareAtPrice: optNum(row.compare_at_price ?? row.compareAtPrice),
    fabric: typeof row.fabric === 'string' ? row.fabric : '—',
    careInstructions:
      typeof row.care_instructions === 'string'
        ? row.care_instructions
        : typeof row.careInstructions === 'string'
          ? row.careInstructions
          : undefined,
    sizesAvailable:
      typeof row.sizes_available === 'string'
        ? row.sizes_available
        : typeof row.sizesAvailable === 'string'
          ? row.sizesAvailable
          : 'XS–XL',
    colors: strArr(row.colors),
    stockQuantity: Math.max(0, Math.floor(num(row.stock_quantity ?? row.stockQuantity, 0))),
    lowStockThreshold: Math.max(
      0,
      Math.floor(num(row.low_stock_threshold ?? row.lowStockThreshold, 6))
    ),
    isAvailable,
    isBestseller:
      typeof row.is_bestseller === 'boolean'
        ? row.is_bestseller
        : typeof row.isBestseller === 'boolean'
          ? row.isBestseller
          : false,
    publishedToWebsite: published,
    description: typeof row.description === 'string' ? row.description : '',
    images: strArr(row.images).filter(isSafeImageRef),
    tags: strArr(row.tags),
    syncedAt: updatedAt,
    websiteSyncStatus: 'synced',
    lastSyncedAt: updatedAt,
  };
}

async function uploadDataUrlImagesIfBucketConfigured(
  images: string[],
  sku: string
): Promise<string[]> {
  const bucket = getStorageBucketName();
  const supabase = getSupabaseAdmin();
  if (!bucket || !supabase) return images;

  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'item';

  return Promise.all(
    images.map(async (img, index) => {
      const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(img);
      if (!match) return img;

      const mimeType = match[1].toLowerCase();
      const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
      const base64Data = match[3];
      const buffer = Buffer.from(base64Data, 'base64');
      const objectPath = `products/${safeSku}/${Date.now()}-${index}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

      try {
        let { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
          contentType: mimeType,
          upsert: false,
        });
        if (error && /bucket.*not.*found/i.test(error.message)) {
          await supabase.storage.createBucket(bucket, { public: true });
          const retry = await supabase.storage.from(bucket).upload(objectPath, buffer, {
            contentType: mimeType,
            upsert: false,
          });
          error = retry.error;
        }
        if (error) {
          return img;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return data?.publicUrl || img;
      } catch {
        return img;
      }
    })
  );
}

async function forwardOptionalWebhook(payload: NormalizedProductPayload): Promise<{
  configured: boolean;
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const targetUrl = parseSafeHttpUrl(process.env.WEBSITE_API_URL);
  if (!targetUrl) {
    return { configured: false, ok: true };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.WEBSITE_API_KEY?.trim();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const upstreamRes = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstreamRes.ok) {
      return {
        configured: true,
        ok: false,
        status: upstreamRes.status,
        error: `Storefront webhook returned HTTP ${upstreamRes.status}`,
      };
    }

    return {
      configured: true,
      ok: true,
      status: upstreamRes.status,
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to notify storefront webhook.',
    };
  }
}

export async function getWebsiteConfig() {
  const supabaseConfigured = isSupabaseConfigured();
  const webhookUrl = parseSafeHttpUrl(process.env.WEBSITE_API_URL);
  const authStatus = await getAuthStatus();

  return {
    serverConfigured: supabaseConfigured || Boolean(webhookUrl),
    supabaseConfigured,
    tableName: getProductsTableName(),
    storageBucketConfigured: Boolean(getStorageBucketName()),
    targetOrigin: getSupabaseOrigin() ?? (webhookUrl ? webhookUrl.origin : null),
    webhookOrigin: webhookUrl ? webhookUrl.origin : null,
    webhookConfigured: Boolean(webhookUrl),
    authConfigured: Boolean(process.env.WEBSITE_API_KEY?.trim()),
    authRequired: true,
    authClaimed: authStatus.authClaimed,
    ownerClaimed: authStatus.ownerClaimed,
    cofounderClaimed: authStatus.cofounderClaimed,
    usingEnvPasscode: authStatus.usingEnvPasscode,
    usingEnvUsername: authStatus.usingEnvUsername,
    usingEnvOwnerPasscode: authStatus.usingEnvOwnerPasscode,
    usingEnvCofounderPasscode: authStatus.usingEnvCofounderPasscode,
    usingEnvOwnerUsername: authStatus.usingEnvOwnerUsername,
    usingEnvCofounderUsername: authStatus.usingEnvCofounderUsername,
  };
}

export async function handleListWebsiteProducts(
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      status: 503,
      payload: {
        ok: false,
        supabaseConfigured: false,
        error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      },
    };
  }

  const tableName = getProductsTableName();
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    const hint =
      error.code === '42P01'
        ? `Table "${tableName}" does not exist in Supabase yet. Run supabase/schema.sql in your Supabase SQL Editor.`
        : error.message;
    return {
      status: 502,
      payload: {
        ok: false,
        error: `Supabase query failed: ${hint}`,
        code: error.code,
      },
    };
  }

  const products = (data ?? []).map((row) =>
    mapSupabaseRowToProduct(row as Record<string, unknown>)
  );

  return {
    status: 200,
    payload: {
      ok: true,
      mode: 'supabase',
      tableName,
      products,
    },
  };
}

export async function handleUpsertWebsiteProduct(
  body: Record<string, unknown> | null,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  if (!body || typeof body !== 'object') {
    return { status: 400, payload: { ok: false, error: 'Invalid JSON payload' } };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
  const price = Number(body.price);
  const stockQuantity = Number(body.stockQuantity);

  if (!name || name.length > 160) {
    return {
      status: 400,
      payload: { ok: false, error: 'Product name is required (max 160 chars).' },
    };
  }
  if (!sku || sku.length > 64) {
    return {
      status: 400,
      payload: { ok: false, error: 'SKU is required (max 64 chars).' },
    };
  }
  if (!Number.isFinite(price) || price < 0) {
    return {
      status: 400,
      payload: { ok: false, error: 'Price must be a valid non-negative number.' },
    };
  }
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return {
      status: 400,
      payload: { ok: false, error: 'Stock quantity must be a valid non-negative number.' },
    };
  }

  const rawImages = Array.isArray(body.images) ? body.images : [];
  const safeImages = rawImages.filter(isSafeImageRef).slice(0, 8);
  const uploadedImages = await uploadDataUrlImagesIfBucketConfigured(safeImages, sku);

  const sanitizedPayload: NormalizedProductPayload = {
    id:
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim().slice(0, 80)
        : `prod-${Date.now()}`,
    sku,
    name,
    slug:
      typeof body.slug === 'string' && body.slug.trim()
        ? slugify(body.slug).slice(0, 180)
        : slugify(name).slice(0, 180),
    categoryId:
      typeof body.categoryId === 'string' && body.categoryId.trim()
        ? body.categoryId.trim().slice(0, 80)
        : 'cat-1',
    categoryName:
      typeof body.categoryName === 'string' && body.categoryName.trim()
        ? body.categoryName.trim().slice(0, 120)
        : 'Apparel',
    price,
    compareAtPrice:
      body.compareAtPrice !== undefined &&
      body.compareAtPrice !== null &&
      body.compareAtPrice !== '' &&
      Number.isFinite(Number(body.compareAtPrice))
        ? Number(body.compareAtPrice)
        : undefined,
    fabric: typeof body.fabric === 'string' ? body.fabric.trim().slice(0, 160) : '',
    careInstructions:
      typeof body.careInstructions === 'string' && body.careInstructions.trim()
        ? body.careInstructions.trim().slice(0, 240)
        : undefined,
    sizesAvailable:
      typeof body.sizesAvailable === 'string' && body.sizesAvailable.trim()
        ? body.sizesAvailable.trim().slice(0, 120)
        : 'XS–XL',
    colors: Array.isArray(body.colors)
      ? body.colors
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          .map((c) => c.trim().slice(0, 48))
          .slice(0, 12)
      : [],
    stockQuantity: Math.floor(stockQuantity),
    lowStockThreshold:
      Number.isFinite(Number(body.lowStockThreshold)) && Number(body.lowStockThreshold) >= 0
        ? Math.floor(Number(body.lowStockThreshold))
        : 6,
    isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : true,
    isBestseller: Boolean(body.isBestseller),
    publishedToWebsite:
      body.publishedToWebsite !== undefined ? Boolean(body.publishedToWebsite) : true,
    description:
      typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '',
    images: uploadedImages,
    tags: Array.isArray(body.tags)
      ? body.tags
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim().slice(0, 48))
          .slice(0, 16)
      : [],
    syncedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      status: 503,
      payload: {
        ok: false,
        supabaseConfigured: false,
        error:
          'Supabase backend is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.',
      },
    };
  }

  const tableName = getProductsTableName();
  const dbRow = {
    id: sanitizedPayload.id,
    sku: sanitizedPayload.sku,
    name: sanitizedPayload.name,
    slug: sanitizedPayload.slug,
    category_id: sanitizedPayload.categoryId,
    category_name: sanitizedPayload.categoryName,
    price: sanitizedPayload.price,
    compare_at_price: sanitizedPayload.compareAtPrice ?? null,
    fabric: sanitizedPayload.fabric,
    care_instructions: sanitizedPayload.careInstructions ?? null,
    sizes_available: sanitizedPayload.sizesAvailable,
    colors: sanitizedPayload.colors,
    stock_quantity: sanitizedPayload.stockQuantity,
    low_stock_threshold: sanitizedPayload.lowStockThreshold,
    is_available: sanitizedPayload.isAvailable,
    is_bestseller: sanitizedPayload.isBestseller,
    published_to_website: sanitizedPayload.publishedToWebsite,
    description: sanitizedPayload.description,
    images: sanitizedPayload.images,
    tags: sanitizedPayload.tags,
    updated_at: sanitizedPayload.syncedAt,
  };

  const { data, error } = await supabase
    .from(tableName)
    .upsert(dbRow, { onConflict: 'sku' })
    .select()
    .single();

  if (error) {
    const hint =
      error.code === '42P01'
        ? `Table "${tableName}" does not exist in Supabase yet. Run supabase/schema.sql in your Supabase SQL Editor.`
        : error.message;
    return {
      status: 502,
      payload: {
        ok: false,
        mode: 'supabase',
        error: `Supabase write failed: ${hint}`,
        code: error.code,
      },
    };
  }

  const webhookResult = await forwardOptionalWebhook(sanitizedPayload);
  const mappedProduct = data
    ? mapSupabaseRowToProduct(data as Record<string, unknown>)
    : { ...sanitizedPayload, websiteSyncStatus: 'synced' as const, lastSyncedAt: sanitizedPayload.syncedAt };

  return {
    status: 200,
    payload: {
      ok: true,
      mode: 'proxied',
      storage: 'supabase',
      product: mappedProduct,
      remoteData: data,
      webhook: webhookResult,
    },
  };
}

export async function handleDeleteWebsiteProduct(
  params: { id?: string; sku?: string },
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      status: 503,
      payload: {
        ok: false,
        error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      },
    };
  }

  const id = params.id?.trim();
  const sku = params.sku?.trim();
  if (!id && !sku) {
    return {
      status: 400,
      payload: { ok: false, error: 'Product id or sku query parameter is required.' },
    };
  }

  const tableName = getProductsTableName();
  let query = supabase.from(tableName).delete();
  if (sku) {
    query = query.eq('sku', sku);
  } else if (id) {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) {
    return {
      status: 502,
      payload: {
        ok: false,
        error: `Supabase delete failed: ${error.message}`,
      },
    };
  }

  return {
    status: 200,
    payload: { ok: true, deleted: { id: id ?? null, sku: sku ?? null } },
  };
}
