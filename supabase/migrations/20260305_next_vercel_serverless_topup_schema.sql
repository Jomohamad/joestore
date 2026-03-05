-- Next.js + Vercel serverless canonical schema alignment
-- Preserves existing data while normalizing required columns and policies.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1) users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table public.users
  add column if not exists username text,
  add column if not exists password_hash text,
  add column if not exists created_at timestamptz not null default now();

-- 2) games
alter table public.games
  add column if not exists slug text,
  add column if not exists provider_api text not null default 'reloadly',
  add column if not exists created_at timestamptz not null default now();

update public.games
set slug = coalesce(nullif(slug, ''), regexp_replace(lower(coalesce(name, id::text, 'game')), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists games_slug_unique_idx on public.games(slug);

update public.games
set provider_api = case
  when lower(provider_api) in ('reloadly', 'gamesdrop') then lower(provider_api)
  else 'reloadly'
end;

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
      AND t.relname = 'games'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ilike '%provider_api%'
  LOOP
    EXECUTE format('alter table public.games drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.games
  add constraint games_provider_api_check
  check (provider_api in ('reloadly', 'gamesdrop'));

-- 3) orders
alter table public.orders
  add column if not exists player_id text,
  add column if not exists server text,
  add column if not exists package text,
  add column if not exists price numeric(12,2),
  add column if not exists provider_response jsonb,
  add column if not exists created_at timestamptz not null default now();

update public.orders
set status = case
  when lower(status) in ('pending','paid','processing','completed','failed') then lower(status)
  when lower(status) in ('success') then 'completed'
  when lower(status) in ('cancelled','canceled') then 'failed'
  else 'pending'
end;

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
      AND pg_get_constraintdef(c.oid) ilike '%status%'
  LOOP
    EXECUTE format('alter table public.orders drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending','paid','processing','completed','failed'));

-- 4) payments (order_id type mirrors existing orders.id type)
DO $$
DECLARE
  order_col_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO order_col_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'orders'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF order_col_type IS NULL THEN
    RAISE EXCEPTION 'orders.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.payments (
      id uuid primary key default gen_random_uuid(),
      order_id %s not null references public.orders(id) on delete cascade,
      provider text not null check (provider in ('paymob','fawry')),
      transaction_id text,
      status text not null default 'pending',
      created_at timestamptz not null default now()
    )
  $f$, order_col_type);
END $$;

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_provider_status_idx on public.payments(provider, status);

-- 5) RLS + policies
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.games enable row level security;

drop policy if exists "Users can view own mirror user" on public.users;
create policy "Users can view own mirror user" on public.users
for select using (auth.uid() = id);

drop policy if exists "Users can update own mirror user" on public.users;
create policy "Users can update own mirror user" on public.users
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders
for select using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders" on public.orders
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments" on public.payments
for select using (
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Games are publicly readable" on public.games;
create policy "Games are publicly readable" on public.games
for select using (true);

comment on table public.orders is 'Order lifecycle: pending -> paid -> processing -> completed|failed. Service role updates fulfillment/payment fields.';

-- 6) Realtime publication for orders
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
