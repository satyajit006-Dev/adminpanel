import crypto from 'crypto';
import { verifyAdminBearerToken } from './adminAuth.js';
import {
  getCustomersTableName,
  getOrdersTableName,
  getStorageBucketName,
  getSupabaseAdmin,
  getTransactionsTableName,
} from './supabaseClient.js';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function mapSupabaseRowToOrder(row: Record<string, unknown>) {
  const createdAt = str(row.created_at ?? row.createdAt, new Date().toISOString());
  const updatedAt = str(row.updated_at ?? row.updatedAt, createdAt);
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items = rawItems.map((item, idx) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: str(obj.id, `item-${idx}`),
      productId: str(obj.productId ?? obj.product_id, ''),
      sku: str(obj.sku, 'SKU'),
      name: str(obj.name, 'Apparel Item'),
      variant: str(obj.variant, 'Standard'),
      quantity: Math.max(1, Math.floor(num(obj.quantity, 1))),
      unitPrice: num(obj.unitPrice ?? obj.unit_price ?? obj.price, 0),
    };
  });

  const id = str(row.id, `ord-${Date.now()}`);
  const orderNumber = str(row.order_number ?? row.orderNumber, id);

  return {
    id,
    orderNumber,
    accountId: str(row.account_id ?? row.accountId ?? row.customer_id, ''),
    customerName: str(row.customer_name ?? row.customerName, 'Customer'),
    customerPhone: str(row.customer_phone ?? row.customerPhone, '—'),
    customerEmail: str(row.customer_email ?? row.customerEmail, ''),
    deliveryAddress:
      typeof (row.delivery_address ?? row.deliveryAddress) === 'string'
        ? String(row.delivery_address ?? row.deliveryAddress)
        : undefined,
    orderType:
      str(row.order_type ?? row.orderType) === 'Store Pickup' ? 'Store Pickup' : 'Delivery',
    items,
    subtotal: num(row.subtotal, 0),
    tax: num(row.tax, 0),
    shippingFee: num(row.shipping_fee ?? row.shippingFee, 0),
    totalAmount: num(row.total_amount ?? row.totalAmount ?? row.total, 0),
    paymentStatus: str(row.payment_status ?? row.paymentStatus, 'Unpaid'),
    paymentMethod: str(row.payment_method ?? row.paymentMethod, 'UPI'),
    orderStatus: str(row.order_status ?? row.orderStatus ?? row.status, 'new_order'),
    staffNotes: str(row.staff_notes ?? row.staffNotes, ''),
    customerInstructions:
      typeof (row.customer_instructions ?? row.customerInstructions) === 'string'
        ? String(row.customer_instructions ?? row.customerInstructions)
        : undefined,
    cancellationReason:
      typeof (row.cancellation_reason ?? row.cancellationReason) === 'string'
        ? String(row.cancellation_reason ?? row.cancellationReason)
        : undefined,
    createdAt,
    updatedAt,
    confirmedAt:
      typeof (row.confirmed_at ?? row.confirmedAt) === 'string'
        ? String(row.confirmed_at ?? row.confirmedAt)
        : undefined,
    completedAt:
      typeof (row.completed_at ?? row.completedAt) === 'string'
        ? String(row.completed_at ?? row.completedAt)
        : undefined,
  };
}

function mapSupabaseRowToCustomer(row: Record<string, unknown>) {
  const rawSize =
    row.size_profile && typeof row.size_profile === 'object'
      ? (row.size_profile as Record<string, unknown>)
      : row.sizeProfile && typeof row.sizeProfile === 'object'
        ? (row.sizeProfile as Record<string, unknown>)
        : {};

  const joined = str(row.joined_date ?? row.joinedDate, str(row.created_at, new Date().toISOString()).slice(0, 10));

  return {
    id: str(row.id, `USR-${Date.now()}`),
    fullName: str(row.full_name ?? row.fullName ?? row.name, 'Customer'),
    email: str(row.email, ''),
    phone: str(row.phone, '—'),
    avatarUrl:
      typeof (row.avatar_url ?? row.avatarUrl) === 'string'
        ? String(row.avatar_url ?? row.avatarUrl)
        : undefined,
    segment: str(row.segment, 'Customer'),
    role: str(row.role, 'Shopper'),
    tier: str(row.tier, 'Standard'),
    status: str(row.status, 'Active'),
    city: str(row.city, '—'),
    country: str(row.country, '—'),
    companyName:
      typeof (row.company_name ?? row.companyName) === 'string'
        ? String(row.company_name ?? row.companyName)
        : undefined,
    totalOrders: Math.max(0, Math.floor(num(row.total_orders ?? row.totalOrders, 0))),
    lifetimeSpend: num(row.lifetime_spend ?? row.lifetimeSpend, 0),
    returnRate: num(row.return_rate ?? row.returnRate, 0),
    lastActive: str(row.last_active ?? row.lastActive, joined),
    joinedDate: joined,
    sizeProfile: {
      tops: str(rawSize.tops, 'M'),
      bottoms: str(rawSize.bottoms, '32'),
      footwear: str(rawSize.footwear, 'EU 41'),
      fitPreference: str(rawSize.fitPreference, 'Regular'),
      notes: typeof rawSize.notes === 'string' ? rawSize.notes : undefined,
    },
  };
}

function mapSupabaseRowToTransaction(row: Record<string, unknown>) {
  const createdAt = str(row.created_at ?? row.createdAt, new Date().toISOString());
  return {
    id: str(row.id, `TXN-${Date.now()}`),
    orderId: str(row.order_id ?? row.orderId, ''),
    orderNumber: str(row.order_number ?? row.orderNumber, ''),
    accountId: str(row.account_id ?? row.accountId, ''),
    customerName: str(row.customer_name ?? row.customerName, 'Customer'),
    paymentMethod: str(row.payment_method ?? row.paymentMethod, 'UPI'),
    amount: num(row.amount, 0),
    refundedAmount: num(row.refunded_amount ?? row.refundedAmount, 0),
    currency: str(row.currency, 'INR'),
    status: str(row.status, 'pending'),
    gatewayReference:
      typeof (row.gateway_reference ?? row.gatewayReference) === 'string'
        ? String(row.gateway_reference ?? row.gatewayReference)
        : undefined,
    gatewayProvider: str(row.gateway_provider ?? row.gatewayProvider, 'Razorpay'),
    verifiedByWebhook: Boolean(row.verified_by_webhook ?? row.verifiedByWebhook),
    createdAt,
    updatedAt: str(row.updated_at ?? row.updatedAt, createdAt),
  };
}

export async function handleUploadProductImage(
  body: Record<string, unknown> | null,
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

  const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl.trim() : '';
  const sku = typeof body?.sku === 'string' ? body.sku.trim() : 'product';
  const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) {
    return {
      status: 400,
      payload: { ok: false, error: 'Valid base64 image dataUrl (PNG, JPG, WebP, GIF) is required.' },
    };
  }

  const mimeType = match[1].toLowerCase();
  const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    return {
      status: 400,
      payload: { ok: false, error: 'Image size must be 5MB or less.' },
    };
  }

  const bucket = getStorageBucketName();
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'item';
  const objectPath = `products/${safeSku}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

  let uploadRes = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  // If bucket does not exist yet, create public bucket and retry once
  if (uploadRes.error && /bucket.*not.*found/i.test(uploadRes.error.message)) {
    await supabase.storage.createBucket(bucket, { public: true });
    uploadRes = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
  }

  if (uploadRes.error) {
    return {
      status: 502,
      payload: {
        ok: false,
        error: `Supabase Storage upload failed: ${uploadRes.error.message}`,
      },
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return {
    status: 200,
    payload: {
      ok: true,
      bucket,
      path: objectPath,
      publicUrl: data.publicUrl,
    },
  };
}

export async function handleListOrders(
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
      payload: { ok: false, error: 'Supabase is not configured.' },
    };
  }

  const tableName = getOrdersTableName();
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    if (error.code === '42P01') {
      return {
        status: 200,
        payload: {
          ok: true,
          tableMissing: true,
          tableName,
          orders: [],
        },
      };
    }
    return {
      status: 502,
      payload: { ok: false, error: `Supabase orders query failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      orders: (data ?? []).map((row) => mapSupabaseRowToOrder(row as Record<string, unknown>)),
    },
  };
}

export async function handleUpdateOrder(
  body: Record<string, unknown> | null,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return { status: 400, payload: { ok: false, error: 'Order id is required.' } };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body?.orderStatus === 'string') {
    patch.order_status = body.orderStatus.trim();
  }
  if (typeof body?.paymentStatus === 'string') {
    patch.payment_status = body.paymentStatus.trim();
  }
  if (typeof body?.staffNotes === 'string') {
    patch.staff_notes = body.staffNotes.slice(0, 2000);
  }
  if (typeof body?.cancellationReason === 'string') {
    patch.cancellation_reason = body.cancellationReason.trim().slice(0, 500);
  }
  if (typeof body?.confirmedAt === 'string') {
    patch.confirmed_at = body.confirmedAt;
  }
  if (typeof body?.completedAt === 'string') {
    patch.completed_at = body.completedAt;
  }

  const tableName = getOrdersTableName();
  const { data, error } = await supabase
    .from(tableName)
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return {
      status: 502,
      payload: { ok: false, error: `Supabase order update failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      order: data ? mapSupabaseRowToOrder(data as Record<string, unknown>) : null,
    },
  };
}

export async function handleListCustomers(
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  const tableName = getCustomersTableName();
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    if (error.code === '42P01') {
      return {
        status: 200,
        payload: {
          ok: true,
          tableMissing: true,
          tableName,
          customers: [],
        },
      };
    }
    return {
      status: 502,
      payload: { ok: false, error: `Supabase customers query failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      customers: (data ?? []).map((row) => mapSupabaseRowToCustomer(row as Record<string, unknown>)),
    },
  };
}

export async function handleUpsertCustomer(
  body: Record<string, unknown> | null,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  if (!body || typeof body !== 'object') {
    return { status: 400, payload: { ok: false, error: 'Invalid customer payload.' } };
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!fullName || !email) {
    return { status: 400, payload: { ok: false, error: 'Customer name and email are required.' } };
  }

  const nowIso = new Date().toISOString();
  const row = {
    id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `USR-${Date.now()}`,
    full_name: fullName.slice(0, 160),
    email: email.slice(0, 180),
    phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 48) : '—',
    avatar_url: typeof body.avatarUrl === 'string' ? body.avatarUrl.slice(0, 500) : null,
    segment: typeof body.segment === 'string' ? body.segment : 'Customer',
    role: typeof body.role === 'string' ? body.role : 'Shopper',
    tier: typeof body.tier === 'string' ? body.tier : 'Standard',
    status: typeof body.status === 'string' ? body.status : 'Active',
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim().slice(0, 100) : '—',
    country: typeof body.country === 'string' && body.country.trim() ? body.country.trim().slice(0, 100) : '—',
    company_name:
      typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim().slice(0, 160)
        : null,
    total_orders: Math.max(0, Math.floor(num(body.totalOrders, 0))),
    lifetime_spend: Math.max(0, num(body.lifetimeSpend, 0)),
    return_rate: Math.max(0, num(body.returnRate, 0)),
    last_active: typeof body.lastActive === 'string' ? body.lastActive : nowIso.slice(0, 10),
    joined_date: typeof body.joinedDate === 'string' ? body.joinedDate : nowIso.slice(0, 10),
    size_profile:
      body.sizeProfile && typeof body.sizeProfile === 'object'
        ? body.sizeProfile
        : { tops: 'M', bottoms: '32', footwear: 'EU 41', fitPreference: 'Regular' },
    updated_at: nowIso,
  };

  const tableName = getCustomersTableName();
  const { data, error } = await supabase
    .from(tableName)
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return {
      status: 502,
      payload: { ok: false, error: `Supabase customer save failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      customer: data ? mapSupabaseRowToCustomer(data as Record<string, unknown>) : null,
    },
  };
}

export async function handleDeleteCustomer(
  id: string | undefined,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  if (!id || !id.trim()) {
    return { status: 400, payload: { ok: false, error: 'Customer id is required.' } };
  }

  const tableName = getCustomersTableName();
  const { error } = await supabase.from(tableName).delete().eq('id', id.trim());
  if (error) {
    return {
      status: 502,
      payload: { ok: false, error: `Supabase customer delete failed: ${error.message}` },
    };
  }

  return { status: 200, payload: { ok: true, id: id.trim() } };
}

export async function handleListTransactions(
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  const tableName = getTransactionsTableName();
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    if (error.code === '42P01') {
      return {
        status: 200,
        payload: {
          ok: true,
          tableMissing: true,
          tableName,
          transactions: [],
        },
      };
    }
    return {
      status: 502,
      payload: { ok: false, error: `Supabase transactions query failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      transactions: (data ?? []).map((row) =>
        mapSupabaseRowToTransaction(row as Record<string, unknown>)
      ),
    },
  };
}

export async function handleUpdateTransaction(
  body: Record<string, unknown> | null,
  authorizationHeader: string | undefined
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const auth = verifyAdminBearerToken(authorizationHeader);
  if (!auth.ok) {
    return { status: auth.status, payload: { ok: false, error: auth.error } };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: 503, payload: { ok: false, error: 'Supabase is not configured.' } };
  }

  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return { status: 400, payload: { ok: false, error: 'Transaction id is required.' } };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body?.status === 'string') patch.status = body.status.trim();
  if (body?.refundedAmount !== undefined) patch.refunded_amount = Math.max(0, num(body.refundedAmount, 0));
  if (body?.verifiedByWebhook !== undefined) patch.verified_by_webhook = Boolean(body.verifiedByWebhook);

  const tableName = getTransactionsTableName();
  const { data, error } = await supabase
    .from(tableName)
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return {
      status: 502,
      payload: { ok: false, error: `Supabase transaction update failed: ${error.message}` },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      transaction: data ? mapSupabaseRowToTransaction(data as Record<string, unknown>) : null,
    },
  };
}
