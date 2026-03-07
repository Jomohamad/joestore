-- Full-stack automation schema (hybrid, design-preserving)

-- 1) users mirror table (source of truth remains auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can view own mirror user" on public.users;
create policy "Users can view own mirror user"
  on public.users
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update own mirror user" on public.users;
create policy "Users can update own mirror user"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) games provider mapping
alter table public.games
  add column if not exists provider_api text not null default 'reloadly' check (provider_api in ('reloadly', 'gamesdrop')),
  add column if not exists provider_game_code text;

-- 3) orders operational fields
alter table public.orders
  add column if not exists player_id text,
  add column if not exists server text,
  add column if not exists package text,
  add column if not exists price numeric(10,2),
  add column if not exists transaction_id text,
  add column if not exists provider_order_ref text,
  add column if not exists payment_provider text check (payment_provider = 'fawaterk');

update public.orders
set status = case
  when lower(status) in ('cancelled', 'canceled') then 'failed'
  when lower(status) in ('pending', 'processing', 'completed', 'failed') then lower(status)
  else 'failed'
end;

-- Drop old status checks safely and enforce lowercase status
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
  check (status in ('pending', 'processing', 'completed', 'failed'));

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_provider_idx on public.orders(payment_provider);

-- 4) Sync auth.users -> public.users mirror
create or replace function public.sync_public_users_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb := '{}'::jsonb;
  username_value text := null;
begin
  if tg_op = 'DELETE' then
    delete from public.users where id = old.id;
    return old;
  end if;

  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  username_value := nullif(trim(coalesce(meta ->> 'username', '')), '');

  insert into public.users (id, email, username, password_hash)
  values (
    new.id,
    coalesce(new.email, ''),
    username_value,
    'SUPABASE_MANAGED'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = excluded.username,
    password_hash = excluded.password_hash;

  return new;
end;
$$;

revoke all on function public.sync_public_users_from_auth() from public;
grant execute on function public.sync_public_users_from_auth() to service_role;

drop trigger if exists trg_sync_public_users_from_auth on auth.users;
create trigger trg_sync_public_users_from_auth
after insert or update or delete on auth.users
for each row
execute function public.sync_public_users_from_auth();

-- Backfill existing auth users
insert into public.users (id, email, username, password_hash)
select
  u.id,
  coalesce(u.email, ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'username', '')), ''),
  'SUPABASE_MANAGED'
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  username = excluded.username,
  password_hash = excluded.password_hash;
