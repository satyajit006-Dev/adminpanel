import crypto from 'crypto';
import { getAuthStatus, verifyAdminSession } from './adminAuth.js';
import {
  getProductsTableName,
  getStorageBucketName,
  getSupabaseAdmin,
  getSupabaseKeyRoleHint,
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

interface TableSchemaInfo {
  columns: Set<string> | null;
  idIsUuid: boolean;
  categoryIdIsUuid: boolean;
  fetchedAt: number;
}

const SCHEMA_CACHE_TTL_MS = 60_000;
const tableSchemaCache = new Map<string, TableSchemaInfo>();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSupabaseErrorHint(
  tableName: string,
  error: { code?: string; message: string }
): string {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return `Table "${tableName}" does not exist in Supabase yet.`;
  }
  if (error.code === '42501' || /permission denied/i.test(error.message)) {
    const keyRole = getSupabaseKeyRoleHint();
    if (keyRole === 'anon' || keyRole === 'publishable') {
      return `SUPABASE_SERVICE_ROLE_KEY is currently set to an "${keyRole}" key instead of your secret service_role key. Replace it in your environment variables with the Supabase service_role (or sb_secret_) key and redeploy.`;
    }
    return `permission denied for table "${tableName}". Ensure SUPABASE_SERVICE_ROLE_KEY uses the service_role key and run: grant usage on schema public to service_role; grant select, insert, update, delete on table public.${tableName} to service_role;`;
  }
  return error.message;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
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

async function getProductsTableSchema(tableName: string): Promise<TableSchemaInfo> {
  const origin = getSupabaseOrigin();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const cacheKey = `${origin ?? 'none'}::${tableName}`;
  const cached = tableSchemaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < SCHEMA_CACHE_TTL_MS) {
    return cached;
  }

  // 1. Inspect PostgREST OpenAPI spec (accurate even when table has 0 rows)
  if (origin && serviceKey) {
    try {
      const res = await fetch(`${origin}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/openapi+json, application/json',
        },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const spec = (await res.json()) as {
          definitions?: Record<
            string,
            { properties?: Record<string, { type?: string; format?: string }> }
          >;
          components?: {
            schemas?: Record<
              string,
              { properties?: Record<string, { type?: string; format?: string }> }
            >;
          };
        };
        const props =
          spec.definitions?.[tableName]?.properties ??
          spec.components?.schemas?.[tableName]?.properties;
        if (props && typeof props === 'object') {
          const columns = new Set(Object.keys(props));
          const info: TableSchemaInfo = {
            columns,
            idIsUuid: props.id?.format === 'uuid',
            categoryIdIsUuid: props.category_id?.format === 'uuid',
            fetchedAt: Date.now(),
          };
          tableSchemaCache.set(cacheKey, info);
          return info;
        }
      }
    } catch {
      // Fall through to row probe
    }
  }

  // 2. Fallback: probe an existing row if available
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase.from(tableName).select('*').limit(1);
      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object') {
        const row = data[0] as Record<string, unknown>;
        const info: TableSchemaInfo = {
          columns: new Set(Object.keys(row)),
          idIsUuid: isUuid(row.id),
          categoryIdIsUuid: isUuid(row.category_id),
          fetchedAt: Date.now(),
        };
        tableSchemaCache.set(cacheKey, info);
        return info;
      }
    } catch {
      // Ignore probe failure
    }
  }

  return {
    columns: null,
    idIsUuid: false,
    categoryIdIsUuid: false,
    fetchedAt: Date.now(),
  };
}

async function fetchCategoryLookupMaps(): Promise<{
  idToName: Map<string, string>;
  nameToId: Map<string, string>;
}> {
  const idToName = new Map<string, string>();
  const nameToId = new Map<string, string>();
  const supabase = getSupabaseAdmin();
  if (!supabase) return { idToName, nameToId };

  try {
    const { data, error } = await supabase.from('categories').select('*').limit(200);
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<Record<string, unknown>>) {
        const id = typeof row.id === 'string' ? row.id.trim() : '';
        const name =
          typeof row.name === 'string'
            ? row.name.trim()
            : typeof row.title === 'string'
              ? row.title.trim()
              : '';
        if (id && name) {
          idToName.set(id, name);
          nameToId.set(name.toLowerCase(), id);
        }
      }
    }
  } catch {
    // categories table may not exist or have restricted access
  }

  return { idToName, nameToId };
}

function mapSupabaseRowToProduct(
  row: Record<string, unknown>,
  options?: {
    categoryIdToName?: Map<string, string>;
    fallbackSku?: string;
    fallbackImages?: string[];
  }
): NormalizedProductPayload & {
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
        : typeof row.created_at === 'string'
          ? row.created_at
          : typeof row.createdAt === 'string'
            ? row.createdAt
            : new Date().toISOString();

  const name = typeof row.name === 'string' ? row.name : 'Untitled Product';
  const id =
    typeof row.id === 'string' && row.id ? row.id : `prod-${Date.now()}`;
  const rawSku = typeof row.sku === 'string' ? row.sku.trim() : '';
  const deterministicSku = `PRD-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'ITEM'}`;
  const sku = rawSku || options?.fallbackSku?.trim() || deterministicSku;

  const rawCategoryId =
    typeof row.category_id === 'string'
      ? row.category_id
      : typeof row.categoryId === 'string'
        ? row.categoryId
        : '';

  const categoryName =
    typeof row.category_name === 'string' && row.category_name.trim()
      ? row.category_name.trim()
      : typeof row.categoryName === 'string' && row.categoryName.trim()
        ? row.categoryName.trim()
        : typeof row.category === 'string' && row.category.trim()
          ? row.category.trim()
          : (rawCategoryId && options?.categoryIdToName?.get(rawCategoryId)) || 'Apparel';

  const isAvailable =
    typeof row.is_available === 'boolean'
      ? row.is_available
      : typeof row.isAvailable === 'boolean'
        ? row.isAvailable
        : typeof row.is_active === 'boolean'
          ? row.is_active
          : typeof row.isActive === 'boolean'
            ? row.isActive
            : true;

  const published =
    typeof row.published_to_website === 'boolean'
      ? row.published_to_website
      : typeof row.publishedToWebsite === 'boolean'
        ? row.publishedToWebsite
        : isAvailable;

  const rowImages = strArr(row.images).filter(isSafeImageRef);
  const singleImage =
    typeof row.image_url === 'string' && isSafeImageRef(row.image_url)
      ? [row.image_url.trim()]
      : typeof row.imageUrl === 'string' && isSafeImageRef(row.imageUrl)
        ? [row.imageUrl.trim()]
        : [];
  const images =
    rowImages.length > 0
      ? rowImages
      : singleImage.length > 0
        ? singleImage
        : (options?.fallbackImages ?? []).filter(isSafeImageRef);

  return {
    id,
    sku,
    name,
    slug: typeof row.slug === 'string' && row.slug ? row.slug : slugify(name),
    categoryId: rawCategoryId || 'cat-1',
    categoryName,
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
    stockQuantity: Math.max(
      0,
      Math.floor(num(row.stock_quantity ?? row.stockQuantity ?? row.stock, 0))
    ),
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
    images,
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
    supabaseKeyRole: getSupabaseKeyRoleHint(),
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
  const auth = await verifyAdminSession(authorizationHeader);
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
  const [schema, categoryLookup] = await Promise.all([
    getProductsTableSchema(tableName),
    fetchCategoryLookupMaps(),
  ]);

  const orderColumn = schema.columns
    ? schema.columns.has('updated_at')
      ? 'updated_at'
      : schema.columns.has('created_at')
        ? 'created_at'
        : null
    : 'created_at';

  let query = supabase.from(tableName).select('*');
  if (orderColumn) {
    query = query.order(orderColumn, { ascending: false });
  }
  let { data, error } = await query.limit(500);

  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    const retry = await supabase.from(tableName).select('*').limit(500);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    const hint = formatSupabaseErrorHint(tableName, error);
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
    mapSupabaseRowToProduct(row as Record<string, unknown>, {
      categoryIdToName: categoryLookup.idToName,
    })
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
  const auth = await verifyAdminSession(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  if (!body || typeof body !== 'object') {
    return { status: 400, payload: { ok: false, error: 'Invalid JSON payload' } };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const rawSku = typeof body.sku === 'string' ? body.sku.trim() : '';
  const sku = rawSku || slugify(name).slice(0, 24).toUpperCase() || `SKU-${Date.now()}`;
  const price = Number(body.price);
  const stockQuantity = Number(body.stockQuantity);

  if (!name || name.length > 160) {
    return {
      status: 400,
      payload: { ok: false, error: 'Product name is required (max 160 chars).' },
    };
  }
  if (sku.length > 64) {
    return {
      status: 400,
      payload: { ok: false, error: 'SKU must be 64 characters or fewer.' },
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
  const [schema, categoryLookup] = await Promise.all([
    getProductsTableSchema(tableName),
    fetchCategoryLookupMaps(),
  ]);

  const resolvedCategoryUuid = isUuid(sanitizedPayload.categoryId)
    ? sanitizedPayload.categoryId
    : (categoryLookup.nameToId.get(sanitizedPayload.categoryName.toLowerCase()) ?? null);

  const hasCol = (col: string) => (schema.columns ? schema.columns.has(col) : false);

  const dbRow: Record<string, unknown> = {};

  if (schema.columns) {
    if (hasCol('id')) {
      if (schema.idIsUuid) {
        if (isUuid(sanitizedPayload.id)) {
          dbRow.id = sanitizedPayload.id;
        }
      } else {
        dbRow.id = sanitizedPayload.id;
      }
    }
    if (hasCol('sku')) dbRow.sku = sanitizedPayload.sku;
    if (hasCol('name')) dbRow.name = sanitizedPayload.name;
    if (hasCol('slug')) dbRow.slug = sanitizedPayload.slug;
    if (hasCol('category_id')) {
      dbRow.category_id = schema.categoryIdIsUuid
        ? resolvedCategoryUuid
        : sanitizedPayload.categoryId;
    }
    if (hasCol('category_name')) dbRow.category_name = sanitizedPayload.categoryName;
    if (hasCol('category')) dbRow.category = sanitizedPayload.categoryName;
    if (hasCol('price')) dbRow.price = sanitizedPayload.price;
    if (hasCol('compare_at_price')) dbRow.compare_at_price = sanitizedPayload.compareAtPrice ?? null;
    if (hasCol('fabric')) dbRow.fabric = sanitizedPayload.fabric;
    if (hasCol('care_instructions')) dbRow.care_instructions = sanitizedPayload.careInstructions ?? null;
    if (hasCol('sizes_available')) dbRow.sizes_available = sanitizedPayload.sizesAvailable;
    if (hasCol('colors')) dbRow.colors = sanitizedPayload.colors;
    if (hasCol('stock_quantity')) dbRow.stock_quantity = sanitizedPayload.stockQuantity;
    if (hasCol('stock')) dbRow.stock = sanitizedPayload.stockQuantity;
    if (hasCol('low_stock_threshold')) dbRow.low_stock_threshold = sanitizedPayload.lowStockThreshold;
    if (hasCol('is_available')) dbRow.is_available = sanitizedPayload.isAvailable;
    if (hasCol('is_active')) dbRow.is_active = sanitizedPayload.isAvailable;
    if (hasCol('is_bestseller')) dbRow.is_bestseller = sanitizedPayload.isBestseller;
    if (hasCol('published_to_website')) dbRow.published_to_website = sanitizedPayload.publishedToWebsite;
    if (hasCol('description')) dbRow.description = sanitizedPayload.description;
    if (hasCol('images')) dbRow.images = sanitizedPayload.images;
    if (hasCol('image_url')) dbRow.image_url = sanitizedPayload.images[0] ?? null;
    if (hasCol('tags')) dbRow.tags = sanitizedPayload.tags;
    if (hasCol('updated_at')) dbRow.updated_at = sanitizedPayload.syncedAt;
  } else {
    // Minimal safe payload if schema inspection was unavailable and table is empty
    if (isUuid(sanitizedPayload.id)) {
      dbRow.id = sanitizedPayload.id;
    }
    dbRow.name = sanitizedPayload.name;
    dbRow.description = sanitizedPayload.description;
    dbRow.price = sanitizedPayload.price;
    dbRow.image_url = sanitizedPayload.images[0] ?? null;
    dbRow.category = sanitizedPayload.categoryName;
    dbRow.stock = sanitizedPayload.stockQuantity;
    dbRow.is_active = sanitizedPayload.isAvailable;
    if (resolvedCategoryUuid) {
      dbRow.category_id = resolvedCategoryUuid;
    }
  }

  const writeRow = async (rowPayload: Record<string, unknown>) => {
    if (hasCol('sku')) {
      return supabase.from(tableName).upsert(rowPayload, { onConflict: 'sku' }).select().single();
    }
    if (typeof rowPayload.id === 'string' && rowPayload.id) {
      return supabase.from(tableName).upsert(rowPayload, { onConflict: 'id' }).select().single();
    }
    return supabase.from(tableName).insert(rowPayload).select().single();
  };

  let { data, error } = await writeRow(dbRow);

  // Strip unknown columns automatically if PostgREST reports PGRST204
  for (let attempt = 0; attempt < 5 && error?.code === 'PGRST204'; attempt++) {
    const match = /'([^']+)' column/.exec(error.message);
    if (!match?.[1] || !(match[1] in dbRow)) break;
    delete dbRow[match[1]];
    const retry = await writeRow(dbRow);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    const hint = formatSupabaseErrorHint(tableName, error);
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
    ? mapSupabaseRowToProduct(data as Record<string, unknown>, {
        categoryIdToName: categoryLookup.idToName,
        fallbackSku: sanitizedPayload.sku,
        fallbackImages: sanitizedPayload.images,
      })
    : {
        ...sanitizedPayload,
        websiteSyncStatus: 'synced' as const,
        lastSyncedAt: sanitizedPayload.syncedAt,
      };

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
  const auth = await verifyAdminSession(authorizationHeader);
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
  const schema = await getProductsTableSchema(tableName);
  const hasSkuCol = schema.columns ? schema.columns.has('sku') : false;

  let query = supabase.from(tableName).delete();
  if (id && (!schema.idIsUuid || isUuid(id))) {
    query = query.eq('id', id);
  } else if (sku && hasSkuCol) {
    query = query.eq('sku', sku);
  } else {
    // Local-only item that was never persisted with a valid remote id/sku
    return {
      status: 200,
      payload: { ok: true, deleted: { id: id ?? null, sku: sku ?? null }, localOnly: true },
    };
  }

  const { error } = await query;
  if (error) {
    return {
      status: 502,
      payload: {
        ok: false,
        error: `Supabase delete failed: ${formatSupabaseErrorHint(tableName, error)}`,
      },
    };
  }

  return {
    status: 200,
    payload: { ok: true, deleted: { id: id ?? null, sku: sku ?? null } },
  };
}
