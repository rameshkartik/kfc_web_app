-- Kovai Fresh Cuts: initial Supabase database structure.
-- This migration is not automatically deployed.
create extension if not exists pgcrypto;
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 name text not null, category text not null check(category in ('mutton','chicken')),
 description text not null default '', image_path text, active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.product_variants (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 cut_type text not null, weight_grams integer not null check(weight_grams > 0),
 price_paise integer not null check(price_paise >= 0),
 available_quantity integer check(available_quantity is null or available_quantity >= 0),
 active boolean not null default false,
 unique(product_id,cut_type,weight_grams)
);
create table if not exists public.delivery_zones (
 id uuid primary key default gen_random_uuid(),
 name text not null unique, postal_codes text[] not null default '{}',
 fee_paise integer not null default 0 check(fee_paise >= 0),
 active boolean not null default false
);
create table if not exists public.delivery_slots (
 id uuid primary key default gen_random_uuid(),
 delivery_date date not null, start_time time not null, end_time time not null,
 zone_id uuid not null references public.delivery_zones(id),
 capacity integer not null check(capacity > 0), active boolean not null default false,
 check(end_time > start_time), unique(delivery_date,start_time,end_time,zone_id)
);
create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique references auth.users(id),
 phone text not null, name text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.addresses (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
 address_line text not null, postal_code text, zone_id uuid references public.delivery_zones(id)
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 public_reference text not null unique,
 customer_id uuid not null references public.customers(id),
 address_snapshot jsonb not null, slot_snapshot jsonb not null,
 subtotal_paise integer not null check(subtotal_paise >= 0),
 delivery_fee_paise integer not null check(delivery_fee_paise >= 0),
 total_paise integer not null check(total_paise = subtotal_paise + delivery_fee_paise),
 payment_status text not null default 'pending_payment'
   check(payment_status in ('pending_payment','paid','failed','refunded','partially_refunded','expired')),
 fulfillment_status text not null default 'created'
   check(fulfillment_status in ('created','confirmed','preparing','out_for_delivery','delivered','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_snapshot jsonb not null,
 unit_price_paise integer not null check(unit_price_paise >= 0),
 quantity integer not null check(quantity > 0),
 line_total_paise integer not null check(line_total_paise = unit_price_paise * quantity)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 provider text not null, provider_order_id text unique,
 provider_payment_id text unique,
 amount_paise integer not null check(amount_paise >= 0),
 status text not null default 'created',
 verified_at timestamptz
);
create table if not exists public.payment_events (
 provider_event_id text primary key, event_type text not null,
 received_at timestamptz not null default now(),
 processed_at timestamptz, processing_status text not null default 'received'
);
create table if not exists public.order_status_history (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 old_status text, new_status text not null,
 changed_by uuid references auth.users(id),
 changed_at timestamptz not null default now()
);
create table if not exists public.admin_users (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','staff')),
 created_at timestamptz not null default now()
);
-- All sensitive tables deny browser access by default.
-- Authenticated customer policies and server-side admin authorization require later implementation.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.admin_users enable row level security;
-- Public catalogue read access is limited to active products/variants.
create policy "Public may read active products" on public.products for select to anon, authenticated using (active);
create policy "Public may read active variants" on public.product_variants for select to anon, authenticated using (active and exists (select 1 from public.products p where p.id=product_id and p.active));
-- No write or private read policies are granted to browser roles in this migration.
