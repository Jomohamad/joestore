-- Fawaterk migration + admin panel data model alignment

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- users.role
alter table public.users
  add column if not exists role text not null default 'user';

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
      AND t.relname = 'users'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ilike '%role%'
  LOOP
    EXECUTE format('alter table public.users drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'user'));

-- games.active
alter table public.games
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- products table (game_id type mirrors games.id)
DO $$
DECLARE
  game_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO game_id_type
  FROM pg_attribute a
  JOIN pg_class t ON t.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'games'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF game_id_type IS NULL THEN
    RAISE EXCEPTION 'games.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.products (
      id uuid primary key default gen_random_uuid(),
      game_id %s not null references public.games(id) on delete cascade,
      name text not null,
      provider_product_id text not null,
      price numeric(12,2) not null,
      currency text not null default 'EGP',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      unique (game_id, provider_product_id)
    )
  $f$, game_id_type);
END $$;

create index if not exists products_game_id_idx on public.products(game_id);
create index if not exists products_active_idx on public.products(active);

-- orders alignment
alter table public.orders
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists provider text,
  add column if not exists payment_id uuid,
  add column if not exists provider_response jsonb,
  add column if not exists player_id text,
  add column if not exists server text,
  add column if not exists price numeric(12,2),
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now();

-- normalize statuses
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

-- remove old payment-specific columns
alter table public.orders drop column if exists payment_method;
alter table public.orders drop column if exists payment_provider;

create index if not exists orders_product_id_idx on public.orders(product_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_provider_idx on public.orders(provider);

-- payments alignment (gateway=fawaterk)
DO $$
DECLARE
  order_id_type text;
BEGIN
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

  IF order_id_type IS NULL THEN
    RAISE EXCEPTION 'orders.id column not found';
  END IF;

  EXECUTE format($f$
    create table if not exists public.payments (
      id uuid primary key default gen_random_uuid(),
      order_id %s not null references public.orders(id) on delete cascade,
      gateway text not null default 'fawaterk' check (gateway = 'fawaterk'),
      transaction_id text,
      amount numeric(12,2) not null default 0,
      status text not null default 'pending',
      raw_response jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  $f$, order_id_type);
END $$;

alter table public.payments
  add column if not exists gateway text,
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists raw_response jsonb not null default '{}'::jsonb;

update public.payments
set gateway = 'fawaterk'
where gateway is null or gateway = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'provider'
  ) THEN
    EXECUTE 'update public.payments set gateway = ''fawaterk'' where gateway is null or gateway = ''''';
    EXECUTE 'alter table public.payments drop column provider';
  END IF;
END $$;

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
      AND t.relname = 'payments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ilike '%gateway%'
  LOOP
    EXECUTE format('alter table public.payments drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.payments
  alter column gateway set not null;

alter table public.payments
  add constraint payments_gateway_check
  check (gateway = 'fawaterk');

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status);

-- logs
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_type_created_at_idx on public.logs(type, created_at desc);

-- keep role sync for admins table users
update public.users u
set role = 'admin'
where exists (select 1 from public.admins a where a.user_id = u.id);

-- admin helper function
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id and u.role = 'admin'
  )
  or exists (
    select 1
    from public.admins a
    where a.user_id = p_user_id
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;

-- RLS and policies
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.products enable row level security;
alter table public.logs enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
on public.orders for select
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
on public.orders for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
on public.payments for select
using (
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments"
on public.payments for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Public products read" on public.products;
create policy "Public products read"
on public.products for select
using (active = true);

drop policy if exists "Admins can view logs" on public.logs;
create policy "Admins can view logs"
on public.logs for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Service role inserts logs" on public.logs;
create policy "Service role inserts logs"
on public.logs for insert
with check (auth.role() = 'service_role');

-- realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
