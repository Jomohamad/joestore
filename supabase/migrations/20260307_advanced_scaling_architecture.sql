-- Advanced scaling architecture: provider pricing, fraud, health, failover metadata

create extension if not exists pgcrypto;

-- Bootstrap products table if prior migrations were skipped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    CREATE TABLE public.products (
      id uuid primary key default gen_random_uuid(),
      game_id text,
      name text not null default 'Product',
      provider_product_id text not null default (gen_random_uuid())::text,
      price numeric(12,2) not null default 0,
      currency text not null default 'EGP',
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  END IF;
END $$;

-- Bootstrap orders table if prior migrations were skipped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  ) THEN
    CREATE TABLE public.orders (
      id text primary key,
      status text not null default 'pending',
      provider text,
      created_at timestamptz not null default now()
    );
  END IF;
END $$;

-- Orders geo + fraud fields
alter table public.orders
  add column if not exists country text,
  add column if not exists ip_address text,
  add column if not exists fraud_risk_score numeric(5,2);

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ilike '%provider%'
  LOOP
    EXECUTE format('alter table public.orders drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.orders
  add constraint orders_provider_check
  check (provider is null or provider in ('reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'));

create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);
create index if not exists orders_ip_address_idx on public.orders(ip_address);
create index if not exists orders_country_idx on public.orders(country);

-- Provider prices (product_id type follows products.id)
DO $$
DECLARE
  product_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO product_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF product_id_type IS NULL THEN
    RAISE EXCEPTION 'products.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.provider_prices (
      id uuid primary key default gen_random_uuid(),
      provider text not null,
      product_id %s not null references public.products(id) on delete cascade,
      price numeric(12,2) not null,
      currency text not null default 'EGP',
      updated_at timestamptz not null default now(),
      unique (provider, product_id)
    )
  $f$, product_id_type);
END $$;

create index if not exists provider_prices_product_id_idx on public.provider_prices(product_id);
create index if not exists provider_prices_provider_idx on public.provider_prices(provider);
create index if not exists provider_prices_updated_at_idx on public.provider_prices(updated_at desc);

-- Pricing rules (product_id type follows products.id)
DO $$
DECLARE
  product_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO product_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF product_id_type IS NULL THEN
    RAISE EXCEPTION 'products.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.pricing_rules (
      id uuid primary key default gen_random_uuid(),
      product_id %s not null references public.products(id) on delete cascade,
      margin_percent numeric(6,2) not null default 0,
      min_profit numeric(12,2) not null default 0,
      max_profit numeric(12,2) not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(product_id)
    )
  $f$, product_id_type);
END $$;

create index if not exists pricing_rules_product_id_idx on public.pricing_rules(product_id);

-- Fraud logs
create table if not exists public.fraud_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ip_address text,
  country text,
  risk_score integer not null default 0,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fraud_logs_user_id_idx on public.fraud_logs(user_id);
create index if not exists fraud_logs_risk_score_idx on public.fraud_logs(risk_score desc);
create index if not exists fraud_logs_created_at_idx on public.fraud_logs(created_at desc);

-- Provider failures
DO $$
DECLARE
  product_id_type text;
  order_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO product_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO order_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'orders'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF product_id_type IS NULL THEN
    RAISE EXCEPTION 'products.id column not found';
  END IF;

  IF order_id_type IS NULL THEN
    RAISE EXCEPTION 'orders.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.provider_failures (
      id uuid primary key default gen_random_uuid(),
      provider text not null,
      product_id %s references public.products(id) on delete set null,
      order_id %s references public.orders(id) on delete set null,
      reason text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  $f$, product_id_type, order_id_type);
END $$;

create index if not exists provider_failures_provider_idx on public.provider_failures(provider);
create index if not exists provider_failures_created_at_idx on public.provider_failures(created_at desc);

-- Provider health
create table if not exists public.provider_health (
  provider text primary key,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  last_response_ms integer,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists provider_health_updated_at_idx on public.provider_health(updated_at desc);

-- Keep updated_at columns fresh
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pricing_rules_set_updated_at on public.pricing_rules;
create trigger trg_pricing_rules_set_updated_at
before update on public.pricing_rules
for each row
execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.provider_prices enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.fraud_logs enable row level security;
alter table public.provider_failures enable row level security;
alter table public.provider_health enable row level security;

drop policy if exists "Authenticated users can read provider prices" on public.provider_prices;
create policy "Authenticated users can read provider prices"
on public.provider_prices for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists "Admins manage provider prices" on public.provider_prices;
create policy "Admins manage provider prices"
on public.provider_prices for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins manage pricing rules" on public.pricing_rules;
create policy "Admins manage pricing rules"
on public.pricing_rules for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Users can read own fraud logs" on public.fraud_logs;
create policy "Users can read own fraud logs"
on public.fraud_logs for select
using (auth.uid() = user_id);

drop policy if exists "Admins can read all fraud logs" on public.fraud_logs;
create policy "Admins can read all fraud logs"
on public.fraud_logs for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Service role manages fraud logs" on public.fraud_logs;
create policy "Service role manages fraud logs"
on public.fraud_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Admins can read provider failures" on public.provider_failures;
create policy "Admins can read provider failures"
on public.provider_failures for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Service role manages provider failures" on public.provider_failures;
create policy "Service role manages provider failures"
on public.provider_failures for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Admins manage provider health" on public.provider_health;
create policy "Admins manage provider health"
on public.provider_health for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authenticated users can read provider health" on public.provider_health;
create policy "Authenticated users can read provider health"
on public.provider_health for select
using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Ensure realtime for orders
alter table public.orders replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
