create extension if not exists pgcrypto;

create table if not exists public.wallet_topups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'EGP',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payment_reference text,
  transaction_id text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallet_topups_user_id_idx on public.wallet_topups(user_id);
create index if not exists wallet_topups_status_idx on public.wallet_topups(status);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  status text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_id_idx on public.order_events(order_id);
create index if not exists order_events_created_at_idx on public.order_events(created_at desc);

alter table public.wallet_topups enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "Wallet topups read own" on public.wallet_topups;
create policy "Wallet topups read own"
  on public.wallet_topups
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Wallet topups service role manage" on public.wallet_topups;
create policy "Wallet topups service role manage"
  on public.wallet_topups
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Order events read own" on public.order_events;
create policy "Order events read own"
  on public.order_events
  for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_events.order_id
      and (o.user_id = (select auth.uid()) or public.is_admin_user((select auth.uid())))
  ));

drop policy if exists "Order events service role manage" on public.order_events;
create policy "Order events service role manage"
  on public.order_events
  for all
  to service_role
  using (true)
  with check (true);
