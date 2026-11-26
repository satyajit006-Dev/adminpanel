-- Run this in your shared Supabase project's SQL Editor.
-- It creates the products catalog table (if missing), enables Row Level Security (RLS),
-- allows public storefront reads of published products, and creates an internal admin_auth_config table
-- accessible only via the server-side Supabase service_role key.

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

-- Storefront customers can read published products via the public anon key.
-- Admin writes happen exclusively through server-side API routes using SUPABASE_SERVICE_ROLE_KEY.
drop policy if exists "Public can view published products" on public.products;
create policy "Public can view published products"
  on public.products
  for select
  to anon, authenticated
  using (published_to_website = true and is_available = true);

-- Server-only table for storing the first-run admin passcode hash when ADMIN_PASSCODE env var is not set.
-- RLS is enabled with NO public policies, blocking all anon/authenticated browser access.
create table if not exists public.admin_auth_config (
  id text primary key,
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_auth_config enable row level security;
