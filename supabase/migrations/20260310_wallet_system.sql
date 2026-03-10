create extension if not exists pgcrypto;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  currency text not null default 'EGP',
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(12,2) not null,
  currency text not null default 'EGP',
  source text not null default 'system',
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_created_at_idx on public.wallet_transactions(created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Wallets read own" on public.wallets;
create policy "Wallets read own"
  on public.wallets
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Wallets service role manage" on public.wallets;
create policy "Wallets service role manage"
  on public.wallets
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Wallet transactions read own" on public.wallet_transactions;
create policy "Wallet transactions read own"
  on public.wallet_transactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Wallet transactions service role manage" on public.wallet_transactions;
create policy "Wallet transactions service role manage"
  on public.wallet_transactions
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.apply_wallet_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_currency text,
  p_source text,
  p_reference_type text,
  p_reference_id text,
  p_metadata jsonb
)
returns table (transaction_id uuid, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
  next_balance numeric;
  tx_id uuid := gen_random_uuid();
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'wallet amount must be positive';
  end if;
  if p_type not in ('credit', 'debit') then
    raise exception 'wallet type must be credit or debit';
  end if;

  insert into public.wallets (user_id, balance, currency)
  values (p_user_id, 0, coalesce(p_currency, 'EGP'))
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if p_type = 'debit' then
    if current_balance < p_amount then
      raise exception 'insufficient wallet balance';
    end if;
    next_balance := current_balance - p_amount;
  else
    next_balance := current_balance + p_amount;
  end if;

  update public.wallets
  set balance = next_balance,
      currency = coalesce(p_currency, currency),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_transactions (
    id, user_id, type, amount, currency, source, reference_type, reference_id, metadata
  ) values (
    tx_id,
    p_user_id,
    p_type,
    p_amount,
    coalesce(p_currency, 'EGP'),
    coalesce(p_source, 'system'),
    p_reference_type,
    p_reference_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return query select tx_id, next_balance;
end;
$$;
