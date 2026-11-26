-- Run this in your shared Supabase project's SQL Editor.
-- Creates tables (if missing), enables Row Level Security (RLS) on every table,
-- preserves customer-facing storefront read access, and configures the public product-images Storage bucket.

-- 1. Products
create table if not exists public.products (
  id text primary key,
  sku text unique not null,
  name text not null,
  slug text,
  category_id text not null default 'cat-1',
  category_name text not null default 'Apparel',
  price numeric(12, 2) not null default 0,
  compare_at_price numeric(12, 2),
  fabric text not null default '',
  care_instructions text,
  sizes_available text not null default 'XS–XL',
  colors text[] not null default '{}',
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 6,
  is_available boolean not null default true,
  is_bestseller boolean not null default false,
  published_to_website boolean not null default true,
  description text not null default '',
  images text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_published on public.products (published_to_website, updated_at desc);
create index if not exists idx_products_sku on public.products (sku);

alter table public.products enable row level security;

drop policy if exists "Public can view published products" on public.products;
create policy "Public can view published products"
  on public.products
  for select
  to anon, authenticated
  using (published_to_website = true and is_available = true);

-- 2. Customers / User Accounts
create table if not exists public.customers (
  id text primary key,
  auth_user_id uuid,
  full_name text not null,
  email text unique not null,
  phone text not null default '—',
  avatar_url text,
  segment text not null default 'Customer',
  role text not null default 'Shopper',
  tier text not null default 'Standard',
  status text not null default 'Active',
  city text not null default '—',
  country text not null default '—',
  company_name text,
  total_orders integer not null default 0,
  lifetime_spend numeric(12, 2) not null default 0,
  return_rate numeric(5, 2) not null default 0,
  last_active text not null default '',
  joined_date text not null default '',
  size_profile jsonb not null default '{"tops":"M","bottoms":"32","footwear":"EU 41","fitPreference":"Regular"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_email on public.customers (email);

alter table public.customers enable row level security;

drop policy if exists "Customers can view own profile" on public.customers;
create policy "Customers can view own profile"
  on public.customers
  for select
  to authenticated
  using (auth.uid() = auth_user_id or auth.jwt() ->> 'email' = email);

drop policy if exists "Customers can update own profile" on public.customers;
create policy "Customers can update own profile"
  on public.customers
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- 3. Orders
create table if not exists public.orders (
  id text primary key,
  order_number text unique not null,
  account_id text not null default '',
  auth_user_id uuid,
  customer_name text not null,
  customer_phone text not null default '',
  customer_email text not null default '',
  delivery_address text,
  order_type text not null default 'Delivery',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_status text not null default 'Unpaid',
  payment_method text not null default 'UPI',
  order_status text not null default 'new_order',
  staff_notes text not null default '',
  customer_instructions text,
  cancellation_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status on public.orders (order_status, created_at desc);
create index if not exists idx_orders_account on public.orders (account_id);

alter table public.orders enable row level security;

drop policy if exists "Customers can view own orders" on public.orders;
create policy "Customers can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = auth_user_id or auth.jwt() ->> 'email' = customer_email);

drop policy if exists "Customers can place own orders" on public.orders;
create policy "Customers can place own orders"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = auth_user_id or auth.jwt() ->> 'email' = customer_email);

-- 4. Transactions
create table if not exists public.transactions (
  id text primary key,
  order_id text not null,
  order_number text not null,
  account_id text not null default '',
  customer_name text not null,
  payment_method text not null default 'UPI',
  amount numeric(12, 2) not null default 0,
  refunded_amount numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending',
  gateway_reference text,
  gateway_provider text not null default 'Razorpay',
  verified_by_webhook boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_order on public.transactions (order_id);

alter table public.transactions enable row level security;

drop policy if exists "Customers can view own order transactions" on public.transactions;
create policy "Customers can view own order transactions"
  on public.transactions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = transactions.order_id
        and (o.auth_user_id = auth.uid() or o.customer_email = auth.jwt() ->> 'email')
    )
  );

-- 5. Server-only admin credentials config (RLS enabled, NO public policies)
create table if not exists public.admin_auth_config (
  id text primary key,
  admin_role text not null default 'Owner',
  admin_username text not null default 'admin',
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_auth_config
  add column if not exists admin_role text not null default 'Owner';

alter table public.admin_auth_config
  add column if not exists admin_username text not null default 'admin';

create unique index if not exists idx_admin_auth_username
  on public.admin_auth_config (admin_username);

alter table public.admin_auth_config enable row level security;

-- 6. Supabase Storage bucket for product images (public read, server-only upload via service_role)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- 7. Immutable Admin Login & Logout History (append-only, cannot be updated or deleted)
create table if not exists public.admin_session_history (
  id text primary key,
  username text not null,
  role text not null default 'Owner',
  event_type text not null check (event_type in ('login', 'logout')),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_admin_session_history_occurred_at
  on public.admin_session_history (occurred_at desc);

alter table public.admin_session_history enable row level security;

create or replace function public.prevent_admin_session_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_session_history is immutable and cannot be updated or deleted';
end;
$$;

drop trigger if exists trg_prevent_admin_session_history_mutation on public.admin_session_history;
create trigger trg_prevent_admin_session_history_mutation
  before update or delete on public.admin_session_history
  for each row
  execute function public.prevent_admin_session_history_mutation();

