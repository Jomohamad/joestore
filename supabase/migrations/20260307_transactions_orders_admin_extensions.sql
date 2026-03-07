-- Compatibility + production extension for automated topup workflows

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- products compatibility fields
alter table public.products
  add column if not exists game text,
  add column if not exists title text,
  add column if not exists provider text,
  add column if not exists image text,
  add column if not exists updated_at timestamptz not null default now();

update public.products p
set
  game = coalesce(p.game, g.name, p.game_id::text),
  title = coalesce(p.title, p.name),
  provider = coalesce(p.provider, g.provider_api, 'reloadly')
from public.games g
where g.id = p.game_id;

-- orders compatibility fields
alter table public.orders
  add column if not exists payment_invoice_id text,
  add column if not exists updated_at timestamptz not null default now();

update public.orders
set payment_invoice_id = coalesce(payment_invoice_id, payment_id::text)
where payment_invoice_id is null;

-- admins compatibility fields
alter table public.admins
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- transactions table (order_id type follows orders.id)
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
    create table if not exists public.transactions (
      id uuid primary key default gen_random_uuid(),
      order_id %s not null references public.orders(id) on delete cascade,
      provider text not null,
      provider_tx_id text,
      provider_transaction_id text,
      response jsonb not null default '{}'::jsonb,
      response_data jsonb not null default '{}'::jsonb,
      status text not null default 'pending',
      created_at timestamptz not null default now()
    )
  $f$, order_id_type);
END $$;

create index if not exists transactions_order_id_idx on public.transactions(order_id);
create index if not exists transactions_provider_idx on public.transactions(provider);
create index if not exists transactions_status_idx on public.transactions(status);

-- keep updated_at current
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

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
before update on public.products
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row
execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions"
on public.transactions for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = transactions.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all transactions" on public.transactions;
create policy "Admins can view all transactions"
on public.transactions for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can manage transactions" on public.transactions;
create policy "Admins can manage transactions"
on public.transactions for all
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
