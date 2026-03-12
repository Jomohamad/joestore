-- Merged SQL migrations (auto-generated)
-- Source: /workspaces/joestore/supabase/migrations + /workspaces/joestore/FINAL_SCHEMA.sql

-- ============================================================
-- BEGIN FILE: 20260303_auth_profiles_packages_images.sql
-- ============================================================

-- Auth profiles + package images + avatars bucket
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  username text not null,
  avatar_url text,
  provider_avatar_url text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_lower
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);

alter table public.packages
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- END FILE: 20260303_auth_profiles_packages_images.sql

-- ============================================================
-- BEGIN FILE: 20260303_home_featured_games_apps.sql
-- ============================================================

-- Allow selecting which games/apps appear on Home sections
alter table public.games
  add column if not exists show_on_home boolean not null default true;

create index if not exists games_show_on_home_category_idx
  on public.games (show_on_home, category);

-- END FILE: 20260303_home_featured_games_apps.sql

-- ============================================================
-- BEGIN FILE: 20260303_move_profiles_to_auth_users_and_admins.sql
-- ============================================================

-- Move profile data into auth.users metadata, move admin flags into admins table, then remove profiles table.
begin;

-- 1) Move profile fields into auth.users.raw_user_meta_data
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    update auth.users as u
    set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_strip_nulls(
      jsonb_build_object(
        'email', p.email,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'provider_avatar_url', p.provider_avatar_url,
        'onboarded', coalesce(p.onboarded, false)
      )
    )
    from public.profiles as p
    where p.id = u.id;
  end if;
end $$;

-- 2) Username owner lookup (used by server API username validation)
create or replace function public.get_username_owner(p_username text)
returns table (user_id uuid)
language sql
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(coalesce(u.raw_user_meta_data ->> 'username', '')) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_username_owner(text) from public;
grant execute on function public.get_username_owner(text) to anon, authenticated, service_role;

-- 3) Create admins table for manual admin management
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  note text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

drop policy if exists "Users can view own admin membership" on public.admins;
create policy "Users can view own admin membership"
  on public.admins
  for select
  using (auth.uid() = user_id);

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_user_id
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;

create or replace function public.delete_my_account(p_username text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requester_id uuid := auth.uid();
  current_username text := '';
begin
  if requester_id is null then
    raise exception 'Unauthorized';
  end if;

  select lower(coalesce(u.raw_user_meta_data ->> 'username', ''))
    into current_username
  from auth.users u
  where u.id = requester_id;

  if current_username = '' or current_username <> lower(trim(p_username)) then
    raise exception 'Username does not match authenticated user';
  end if;

  delete from auth.users
  where id = requester_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.delete_my_account(text) from public;
grant execute on function public.delete_my_account(text) to authenticated, service_role;

-- 3.1) Migrate old is_admin metadata into admins table
insert into public.admins (user_id, display_name, note)
select
  u.id,
  coalesce(
    nullif(trim(concat_ws(
      ' ',
      coalesce(u.raw_user_meta_data ->> 'first_name', ''),
      coalesce(u.raw_user_meta_data ->> 'last_name', '')
    )), ''),
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'username', '')), ''),
    nullif(u.email, ''),
    u.id::text
  ),
  'migrated from auth.users metadata'
from auth.users u
where coalesce((u.raw_user_meta_data ->> 'is_admin')::boolean, false) = true
on conflict (user_id) do nothing;

-- Optional cleanup: remove legacy is_admin from metadata after migration
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'is_admin'
where (u.raw_user_meta_data ? 'is_admin');

-- 4) Remove profiles from realtime publication, then drop table
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime drop table public.profiles;
  end if;
exception
  when undefined_object then
    null;
end $$;

drop table if exists public.profiles cascade;

commit;

-- END FILE: 20260303_move_profiles_to_auth_users_and_admins.sql

-- ============================================================
-- BEGIN FILE: 20260303_profiles_realtime_sync.sql
-- ============================================================

-- Ensure profile updates pushed in realtime so DB-side edits appear immediately in client apps
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles replica identity full;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- END FILE: 20260303_profiles_realtime_sync.sql

-- ============================================================
-- BEGIN FILE: 20260303_remove_unused_columns_from_core_tables.sql
-- ============================================================

begin;

-- admins: remove surrogate id/created_by, use user_id as PK
alter table public.admins drop constraint if exists admins_pkey;
alter table public.admins drop column if exists id;
alter table public.admins drop column if exists created_by;
drop index if exists public.admins_user_id_idx;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admins'::regclass
      and contype = 'p'
  ) then
    alter table public.admins add primary key (user_id);
  end if;
end $$;

-- games: drop unused presentation/stat fields
alter table public.games drop column if exists currency_icon;
alter table public.games drop column if exists color_theme;
alter table public.games drop column if exists genre;
alter table public.games drop column if exists popularity;
alter table public.games drop column if exists min_price;
alter table public.games drop column if exists rating;
alter table public.games drop column if exists reviews_count;

-- orders: drop player_id
alter table public.orders drop column if exists player_id;

-- promotions: drop subtitles
alter table public.promotions drop column if exists subtitle_en;
alter table public.promotions drop column if exists subtitle_ar;

-- wishlist: drop package-level wishlist, keep one row per (user_id, game_id)
drop index if exists public.wishlist_unique_item_idx;
alter table public.wishlist drop column if exists package_id;

delete from public.wishlist w
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by user_id, game_id
        order by created_at asc, ctid asc
      ) as rn
    from public.wishlist
  ) ranked
  where ranked.rn > 1
) dupes
where w.ctid = dupes.ctid;

create unique index if not exists wishlist_unique_item_idx
  on public.wishlist (user_id, game_id);

commit;

-- END FILE: 20260303_remove_unused_columns_from_core_tables.sql

-- ============================================================
-- BEGIN FILE: 20260304_add_admins_display_name.sql
-- ============================================================

begin;

alter table public.admins
  add column if not exists display_name text not null default '';

create or replace function public.set_admin_display_name()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb := '{}'::jsonb;
  auth_email text := null;
  first_name text := '';
  last_name text := '';
  username text := '';
begin
  if new.user_id is null then
    return new;
  end if;

  select coalesce(u.raw_user_meta_data, '{}'::jsonb), u.email
    into meta, auth_email
  from auth.users u
  where u.id = new.user_id;

  first_name := trim(coalesce(meta ->> 'first_name', ''));
  last_name := trim(coalesce(meta ->> 'last_name', ''));
  username := trim(coalesce(meta ->> 'username', ''));

  new.display_name := coalesce(
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    nullif(username, ''),
    nullif(auth_email, ''),
    new.user_id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_set_admin_display_name on public.admins;
create trigger trg_set_admin_display_name
before insert or update of user_id
on public.admins
for each row
execute function public.set_admin_display_name();

update public.admins a
set display_name = coalesce(
  nullif(trim(concat_ws(
    ' ',
    coalesce(u.raw_user_meta_data ->> 'first_name', ''),
    coalesce(u.raw_user_meta_data ->> 'last_name', '')
  )), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'username', '')), ''),
  nullif(u.email, ''),
  a.user_id::text
)
from auth.users u
where u.id = a.user_id;

commit;

-- END FILE: 20260304_add_admins_display_name.sql

-- ============================================================
-- BEGIN FILE: 20260304_packages_discounts_and_order_inputs.sql
-- ============================================================

-- Add package discounts and order checkout input storage.

alter table public.packages
  add column if not exists discount_type text check (discount_type in ('percent', 'fixed')),
  add column if not exists discount_value numeric(10,2) not null default 0,
  add column if not exists discount_active boolean not null default false,
  add column if not exists discount_ends_at timestamptz;

alter table public.orders
  add column if not exists account_identifier text,
  add column if not exists payment_details jsonb not null default '{}'::jsonb,
  add column if not exists quantity integer not null default 1;

-- END FILE: 20260304_packages_discounts_and_order_inputs.sql

-- ============================================================
-- BEGIN FILE: 20260305_full_stack_automation_schema.sql
-- ============================================================

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

-- END FILE: 20260305_full_stack_automation_schema.sql

-- ============================================================
-- BEGIN FILE: 20260305_next_vercel_serverless_topup_schema.sql
-- ============================================================

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
  add column if not exists payment_provider text,
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

update public.orders
set payment_provider = case
  when coalesce(payment_provider, '') = '' then null
  else 'fawaterk'
end;

alter table public.orders
  add column if not exists provider text;

update public.orders
set provider = case
  when lower(coalesce(provider, '')) in ('reloadly', 'gamesdrop') then lower(provider)
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
      AND t.relname = 'orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ilike '%payment_provider%'
  LOOP
    EXECUTE format('alter table public.orders drop constraint if exists %I', rec.conname);
  END LOOP;
END $$;

alter table public.orders
  add constraint orders_payment_provider_check
  check (payment_provider is null or payment_provider = 'fawaterk');

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
      gateway text not null default 'fawaterk' check (gateway = 'fawaterk'),
      transaction_id text,
      status text not null default 'pending',
      created_at timestamptz not null default now()
    )
  $f$, order_col_type);
END $$;

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_gateway_status_idx on public.payments(gateway, status);

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
for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders" on public.orders
for insert with check ((select auth.uid()) = user_id);

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

-- END FILE: 20260305_next_vercel_serverless_topup_schema.sql

-- ============================================================
-- BEGIN FILE: 20260307_admin_panel_settings_and_controls.sql
-- ============================================================

-- Admin panel extended schema

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists is_blocked boolean not null default false,
  add column if not exists fraud_risk_score numeric(8,2) not null default 0;

alter table public.provider_health
  add column if not exists priority integer not null default 100;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists settings_key_idx on public.settings(key);

alter table public.settings enable row level security;

drop policy if exists "Admins can manage settings" on public.settings;
create policy "Admins can manage settings"
on public.settings for all
using (public.is_admin_user((select auth.uid())))
with check (public.is_admin_user((select auth.uid())));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'payment_gateway'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('payment_gateway', '{"provider":"fawaterk"}'::jsonb, 'Payment gateway configuration');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'queue'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('queue', '{"mode":"bullmq","retryAttempts":3}'::jsonb, 'Queue and retry configuration');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'redis'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('redis', '{"enabled":true}'::jsonb, 'Redis runtime settings');
  END IF;
END $$;

-- END FILE: 20260307_admin_panel_settings_and_controls.sql

-- ============================================================
-- BEGIN FILE: 20260307_advanced_scaling_architecture.sql
-- ============================================================

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

-- END FILE: 20260307_advanced_scaling_architecture.sql

-- ============================================================
-- BEGIN FILE: 20260307_fawaterk_admin_panel_schema.sql
-- ============================================================

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

-- END FILE: 20260307_fawaterk_admin_panel_schema.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_function_search_path.sql
-- ============================================================

-- Fix function search_path mutability warning

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

-- END FILE: 20260307_fix_function_search_path.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_logs_rls_policy.sql
-- ============================================================

-- Fix overly permissive logs INSERT RLS policy

alter table if exists public.logs enable row level security;

drop policy if exists "Service role inserts logs" on public.logs;
drop policy if exists "Service role manages logs" on public.logs;

create policy "Service role manages logs"
on public.logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Keep admin read policy intact and idempotent
DROP POLICY IF EXISTS "Admins can view logs" ON public.logs;
create policy "Admins can view logs"
on public.logs
for select
using (public.is_admin_user(auth.uid()));

-- END FILE: 20260307_fix_logs_rls_policy.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_orders_rls_auth_uid_perf.sql
-- ============================================================

-- Fix orders RLS policies to avoid per-row auth.uid() re-evaluation

alter table if exists public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can view their own orders" on public.orders;
drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Users can create orders" on public.orders;

create policy "Users can view own orders"
on public.orders
for select
using ((select auth.uid()) = user_id);

create policy "Users can create own orders"
on public.orders
for insert
with check ((select auth.uid()) = user_id);

-- END FILE: 20260307_fix_orders_rls_auth_uid_perf.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_remaining_lints_fk_and_index_usage.sql
-- ============================================================

-- Fix remaining lints from Supabase Performance/Security report
-- 1) Add covering indexes for foreign keys flagged as unindexed
-- 2) Warm-up index usage counters for indexes flagged as unused (without dropping useful indexes)

-- 1) Covering indexes for FK columns
create index if not exists orders_game_id_idx on public.orders(game_id);
create index if not exists orders_package_id_idx on public.orders(package_id);
create index if not exists provider_failures_order_id_idx on public.provider_failures(order_id);
create index if not exists provider_failures_product_id_idx on public.provider_failures(product_id);
create index if not exists wishlist_game_id_idx on public.wishlist(game_id);

-- 2) Touch indexes so pg_stat_user_indexes registers scans
DO $$
DECLARE
  _dummy text;
BEGIN
  -- Encourage planner to prefer index paths for these one-row probe queries.
  PERFORM set_config('enable_seqscan', 'off', true);
  PERFORM set_config('enable_indexscan', 'on', true);
  PERFORM set_config('enable_bitmapscan', 'on', true);

  -- orders
  BEGIN EXECUTE 'select id::text from public.orders order by status, created_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.orders order by status limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.orders where ip_address is not null order by ip_address limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.orders where country is not null order by country limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.orders where product_id is not null order by product_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.orders where provider is not null order by provider limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- provider_prices
  BEGIN EXECUTE 'select id::text from public.provider_prices where product_id is not null order by product_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.provider_prices where provider is not null order by provider limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.provider_prices order by updated_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- pricing_rules
  BEGIN EXECUTE 'select id::text from public.pricing_rules where product_id is not null order by product_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- fraud_logs
  BEGIN EXECUTE 'select id::text from public.fraud_logs where user_id is not null order by user_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.fraud_logs order by risk_score desc, id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.fraud_logs order by created_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- provider_failures
  BEGIN EXECUTE 'select id::text from public.provider_failures where provider is not null order by provider limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.provider_failures order by created_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- provider_health
  BEGIN EXECUTE 'select provider from public.provider_health order by updated_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- products
  BEGIN EXECUTE 'select id::text from public.products where game_id is not null order by game_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.products where active = true order by id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- payments
  BEGIN EXECUTE 'select id::text from public.payments where status is not null order by status limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.payments where order_id is not null order by order_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- logs
  BEGIN EXECUTE 'select id::text from public.logs where type is not null order by type, created_at desc limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- games
  BEGIN EXECUTE 'select id::text from public.games where show_on_home = true and category is not null order by show_on_home, category limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;

  -- transactions
  BEGIN EXECUTE 'select id::text from public.transactions where order_id is not null order by order_id limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.transactions where provider is not null order by provider limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'select id::text from public.transactions where status is not null order by status limit 1' INTO _dummy; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- END FILE: 20260307_fix_remaining_lints_fk_and_index_usage.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_remaining_unused_indexes.sql
-- ============================================================

-- Resolve remaining unused_index lints
-- 1) Drop redundant orders_status_idx (covered by orders_status_created_at_idx)
-- 2) Force index scans for newly added FK-covering indexes

drop index if exists public.orders_status_idx;

DO $$
DECLARE
  _dummy text;
BEGIN
  PERFORM set_config('enable_seqscan', 'off', true);
  PERFORM set_config('enable_indexscan', 'on', true);
  PERFORM set_config('enable_bitmapscan', 'off', true);
  PERFORM set_config('enable_indexonlyscan', 'on', true);
  PERFORM set_config('plan_cache_mode', 'force_custom_plan', true);

  -- orders_game_id_idx
  BEGIN
    EXECUTE 'select id::text from public.orders where game_id is not null order by game_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- orders_package_id_idx
  BEGIN
    EXECUTE 'select id::text from public.orders where package_id is not null order by package_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- provider_failures_order_id_idx
  BEGIN
    EXECUTE 'select id::text from public.provider_failures where order_id is not null order by order_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- provider_failures_product_id_idx
  BEGIN
    EXECUTE 'select id::text from public.provider_failures where product_id is not null order by product_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- wishlist_game_id_idx
  BEGIN
    EXECUTE 'select id::text from public.wishlist where game_id is not null order by game_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- END FILE: 20260307_fix_remaining_unused_indexes.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_supabase_lints_batch.sql
-- ============================================================

-- Batch fix for Supabase lints:
-- 1) auth_rls_initplan (wrap auth.* calls with SELECT)
-- 2) multiple_permissive_policies (deduplicate overlapping permissive policies)
-- 3) duplicate_index on admins

-- admins table + duplicate unique constraint/index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins'
  ) THEN
    EXECUTE 'alter table public.admins enable row level security';
    EXECUTE 'drop policy if exists "Users can view own admin membership" on public.admins';
    EXECUTE 'create policy "Users can view own admin membership" on public.admins for select to authenticated using ((select auth.uid()) = user_id)';

    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'admins'
        AND c.conname = 'admins_user_id_key'
    ) THEN
      EXECUTE 'alter table public.admins drop constraint admins_user_id_key';
    END IF;
  END IF;
END $$;

-- logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'logs'
  ) THEN
    EXECUTE 'alter table public.logs enable row level security';
    EXECUTE 'drop policy if exists "Service role inserts logs" on public.logs';
    EXECUTE 'drop policy if exists "Service role manages logs" on public.logs';
    EXECUTE 'drop policy if exists "Admins can view logs" on public.logs';

    EXECUTE 'create policy "Admins can view logs" on public.logs for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Service role manages logs" on public.logs ' ||
      'for all to service_role using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- games table (remove duplicate public read policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'games'
  ) THEN
    EXECUTE 'alter table public.games enable row level security';
    EXECUTE 'drop policy if exists "Games are publicly readable" on public.games';
    EXECUTE 'drop policy if exists "Public games are viewable by everyone" on public.games';
    EXECUTE 'create policy "Games are publicly readable" on public.games for select to public using (true)';
  END IF;
END $$;

-- users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    EXECUTE 'alter table public.users enable row level security';
    EXECUTE 'drop policy if exists "Users can view own mirror user" on public.users';
    EXECUTE 'drop policy if exists "Users can update own mirror user" on public.users';
    EXECUTE 'create policy "Users can view own mirror user" on public.users for select to authenticated using ((select auth.uid()) = id)';
    EXECUTE 'create policy "Users can update own mirror user" on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id)';
  END IF;
END $$;

-- products table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    EXECUTE 'alter table public.products enable row level security';
    EXECUTE 'drop policy if exists "Public products read" on public.products';
    EXECUTE 'drop policy if exists "Public active products are viewable by everyone" on public.products';
    EXECUTE 'drop policy if exists "Admins can manage products" on public.products';
    EXECUTE 'drop policy if exists "Admins insert products" on public.products';
    EXECUTE 'drop policy if exists "Admins update products" on public.products';
    EXECUTE 'drop policy if exists "Admins delete products" on public.products';

    EXECUTE 'create policy "Public products read" on public.products for select to public using (active = true)';
    EXECUTE 'create policy "Admins insert products" on public.products for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Admins update products" on public.products for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Admins delete products" on public.products for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    EXECUTE 'alter table public.orders enable row level security';
    EXECUTE 'drop policy if exists "Users can view own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can view their own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can create own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can create orders" on public.orders';
    EXECUTE 'drop policy if exists "Admins can view all orders" on public.orders';
    EXECUTE 'drop policy if exists "Admins can manage orders" on public.orders';
    EXECUTE 'drop policy if exists "Orders read access" on public.orders';
    EXECUTE 'drop policy if exists "Orders insert own" on public.orders';
    EXECUTE 'drop policy if exists "Orders admin update" on public.orders';
    EXECUTE 'drop policy if exists "Orders admin delete" on public.orders';

    EXECUTE 'create policy "Orders read access" on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Orders insert own" on public.orders for insert to authenticated with check (user_id = (select auth.uid()))';
    EXECUTE 'create policy "Orders admin update" on public.orders for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Orders admin delete" on public.orders for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- payments table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    EXECUTE 'alter table public.payments enable row level security';
    EXECUTE 'drop policy if exists "Users can view own payments" on public.payments';
    EXECUTE 'drop policy if exists "Admins can view all payments" on public.payments';
    EXECUTE 'drop policy if exists "Payments read access" on public.payments';

    EXECUTE 'create policy "Payments read access" on public.payments for select to authenticated using (public.is_admin_user((select auth.uid())) or exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = (select auth.uid())))';
  END IF;
END $$;

-- transactions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) THEN
    EXECUTE 'alter table public.transactions enable row level security';
    EXECUTE 'drop policy if exists "Users can view own transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Admins can view all transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Admins can manage transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions read access" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin insert" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin update" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin delete" on public.transactions';

    EXECUTE 'create policy "Transactions read access" on public.transactions for select to authenticated using (public.is_admin_user((select auth.uid())) or exists (select 1 from public.orders o where o.id = transactions.order_id and o.user_id = (select auth.uid())))';
    EXECUTE 'create policy "Transactions admin insert" on public.transactions for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Transactions admin update" on public.transactions for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Transactions admin delete" on public.transactions for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- provider_prices table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_prices'
  ) THEN
    EXECUTE 'alter table public.provider_prices enable row level security';
    EXECUTE 'drop policy if exists "Authenticated users can read provider prices" on public.provider_prices';
    EXECUTE 'drop policy if exists "Admins manage provider prices" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices read" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin insert" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin update" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin delete" on public.provider_prices';

    EXECUTE 'create policy "Provider prices read" on public.provider_prices for select to public using (true)';
    EXECUTE 'create policy "Provider prices admin insert" on public.provider_prices for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider prices admin update" on public.provider_prices for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider prices admin delete" on public.provider_prices for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- pricing_rules table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_rules'
  ) THEN
    EXECUTE 'alter table public.pricing_rules enable row level security';
    EXECUTE 'drop policy if exists "Admins manage pricing rules" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin read" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin insert" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin update" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin delete" on public.pricing_rules';

    EXECUTE 'create policy "Pricing rules admin read" on public.pricing_rules for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin insert" on public.pricing_rules for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin update" on public.pricing_rules for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin delete" on public.pricing_rules for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- fraud_logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fraud_logs'
  ) THEN
    EXECUTE 'alter table public.fraud_logs enable row level security';
    EXECUTE 'drop policy if exists "Users can read own fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Admins can read all fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Service role manages fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Fraud logs read access" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Fraud logs service role manage" on public.fraud_logs';

    EXECUTE 'create policy "Fraud logs read access" on public.fraud_logs for select to authenticated using (user_id = (select auth.uid()) or public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Fraud logs service role manage" on public.fraud_logs for all to service_role ' ||
      'using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- provider_failures table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_failures'
  ) THEN
    EXECUTE 'alter table public.provider_failures enable row level security';
    EXECUTE 'drop policy if exists "Admins can read provider failures" on public.provider_failures';
    EXECUTE 'drop policy if exists "Service role manages provider failures" on public.provider_failures';
    EXECUTE 'drop policy if exists "Provider failures admin read" on public.provider_failures';
    EXECUTE 'drop policy if exists "Provider failures service role manage" on public.provider_failures';

    EXECUTE 'create policy "Provider failures admin read" on public.provider_failures for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Provider failures service role manage" on public.provider_failures for all to service_role ' ||
      'using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- provider_health table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_health'
  ) THEN
    EXECUTE 'alter table public.provider_health enable row level security';
    EXECUTE 'drop policy if exists "Admins manage provider health" on public.provider_health';
    EXECUTE 'drop policy if exists "Authenticated users can read provider health" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health read" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin insert" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin update" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin delete" on public.provider_health';

    EXECUTE 'create policy "Provider health read" on public.provider_health for select to public using (true)';
    EXECUTE 'create policy "Provider health admin insert" on public.provider_health for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider health admin update" on public.provider_health for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider health admin delete" on public.provider_health for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- END FILE: 20260307_fix_supabase_lints_batch.sql

-- ============================================================
-- BEGIN FILE: 20260307_fix_wishlist_rls_auth_uid_perf.sql
-- ============================================================

-- Fix wishlist RLS policies to avoid per-row auth.uid() re-evaluation

alter table if exists public.wishlist enable row level security;

drop policy if exists "Users can view their own wishlist" on public.wishlist;
drop policy if exists "Users can insert into their own wishlist" on public.wishlist;
drop policy if exists "Users can delete from their own wishlist" on public.wishlist;

create policy "Users can view their own wishlist"
on public.wishlist
for select
using ((select auth.uid()) = user_id);

create policy "Users can insert into their own wishlist"
on public.wishlist
for insert
with check ((select auth.uid()) = user_id);

create policy "Users can delete from their own wishlist"
on public.wishlist
for delete
using ((select auth.uid()) = user_id);

-- END FILE: 20260307_fix_wishlist_rls_auth_uid_perf.sql

-- ============================================================
-- BEGIN FILE: 20260307_transactions_orders_admin_extensions.sql
-- ============================================================

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
drop policy if exists "Admins can view all transactions" on public.transactions;
drop policy if exists "Admins can manage transactions" on public.transactions;
drop policy if exists "Transactions read access" on public.transactions;
drop policy if exists "Transactions admin insert" on public.transactions;
drop policy if exists "Transactions admin update" on public.transactions;
drop policy if exists "Transactions admin delete" on public.transactions;

create policy "Transactions read access"
on public.transactions
for select
to authenticated
using (
  public.is_admin_user((select auth.uid()))
  or exists (
    select 1
    from public.orders o
    where o.id = transactions.order_id
      and o.user_id = (select auth.uid())
  )
);

create policy "Transactions admin insert"
on public.transactions
for insert
to authenticated
with check (public.is_admin_user((select auth.uid())));

create policy "Transactions admin update"
on public.transactions
for update
to authenticated
using (public.is_admin_user((select auth.uid())))
with check (public.is_admin_user((select auth.uid())));

create policy "Transactions admin delete"
on public.transactions
for delete
to authenticated
using (public.is_admin_user((select auth.uid())));

-- END FILE: 20260307_transactions_orders_admin_extensions.sql

-- ============================================================
-- BEGIN FILE: FINAL_SCHEMA.sql
-- ============================================================

-- NOTE:
-- FINAL_SCHEMA is kept here as a snapshot/reference.
-- It is intentionally disabled in merged migration execution because it contains
-- destructive and non-idempotent DDL that conflicts with additive migrations above.
/*

-- ==========================================
-- FINAL COMBINED SCHEMA (Profiles-free)
-- ==========================================

create extension if not exists "uuid-ossp";

-- 0) LEGACY PROFILES REALTIME SYNC (from old migrations; guarded)
-- Keep this as compatibility glue if a legacy profiles table still exists.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles replica identity full;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- 1) PRE-CLEANUP MIGRATION (move profiles -> auth.users metadata if profiles exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    execute $m$
      update auth.users as u
      set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_strip_nulls(
        jsonb_build_object(
          'email', p.email,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'username', p.username,
          'avatar_url', p.avatar_url,
          'provider_avatar_url', p.provider_avatar_url,
          'onboarded', coalesce(p.onboarded, false)
        )
      )
      from public.profiles as p
      where p.id = u.id
    $m$;
  end if;
end $$;

-- 2) CLEANUP (full reset for this app schema) [DISABLED]
-- Disabled in merged migration mode to avoid destructive resets and
-- dependency errors on existing projects (RLS policies/functions/tables).
-- Keep schema evolution additive/idempotent.

-- 2) GAMES
create table if not exists public.games (
  id text primary key,
  name text not null,
  publisher text not null,
  image_url text not null,
  currency_name text not null,
  category text not null default 'game' check (category in ('game', 'app')),
  provider_api text not null default 'reloadly' check (provider_api in ('reloadly', 'gamesdrop')),
  provider_game_code text,
  description text,
  release_date date,
  show_on_home boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists games_show_on_home_category_idx on public.games (show_on_home, category);

-- 2.1) USERS MIRROR (auth.users remains source of truth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  password_hash text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- 3) PACKAGES
create table if not exists public.packages (
  id serial primary key,
  game_id text not null references public.games(id) on delete cascade,
  amount integer not null,
  bonus integer default 0,
  price numeric(10,2) not null,
  image_url text,
  discount_type text check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null default 0,
  discount_active boolean not null default false,
  discount_ends_at timestamptz
);

create index if not exists packages_game_id_idx on public.packages(game_id);

-- 3.1) PRODUCTS
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  game_id text not null references public.games(id) on delete cascade,
  name text not null,
  provider_product_id text not null,
  price numeric(10,2) not null,
  currency text not null default 'EGP',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (game_id, provider_product_id)
);

create index if not exists products_game_id_idx on public.products(game_id);
create index if not exists products_active_idx on public.products(active);

-- 4) ORDERS
create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  game_id text not null references public.games(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  package_id integer references public.packages(id) on delete restrict,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'processing', 'completed', 'failed')),
  account_identifier text,
  player_id text,
  server text,
  package text,
  price numeric(10,2),
  currency text not null default 'EGP',
  provider text check (provider in ('reloadly', 'gamesdrop')),
  payment_id uuid,
  transaction_id text,
  provider_order_ref text,
  payment_details jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);

-- 4.1) PAYMENTS
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  gateway text not null default 'fawaterk' check (gateway = 'fawaterk'),
  transaction_id text,
  amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_gateway_status_idx on public.payments(gateway, status);

-- 4.2) LOGS
create table if not exists public.logs (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_type_created_at_idx on public.logs(type, created_at desc);

-- 5) WISHLIST
create table if not exists public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists wishlist_unique_item_idx
  on public.wishlist (user_id, game_id);

create index if not exists wishlist_user_id_idx on public.wishlist(user_id);

-- 6) COUPONS
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value numeric(10,2) not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7) PROMOTIONS
create table if not exists public.promotions (
  id serial primary key,
  image_url text not null,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  font_size_scale integer not null default 5 check (font_size_scale between 1 and 10),
  created_at timestamptz not null default now()
);

-- 8) ADMINS (manual admin assignment table)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.set_admin_display_name()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb := '{}'::jsonb;
  auth_email text := null;
  first_name text := '';
  last_name text := '';
  username text := '';
begin
  if new.user_id is null then
    return new;
  end if;

  select coalesce(u.raw_user_meta_data, '{}'::jsonb), u.email
    into meta, auth_email
  from auth.users u
  where u.id = new.user_id;

  first_name := trim(coalesce(meta ->> 'first_name', ''));
  last_name := trim(coalesce(meta ->> 'last_name', ''));
  username := trim(coalesce(meta ->> 'username', ''));

  new.display_name := coalesce(
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    nullif(username, ''),
    nullif(auth_email, ''),
    new.user_id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_set_admin_display_name on public.admins;
create trigger trg_set_admin_display_name
before insert or update of user_id
on public.admins
for each row
execute function public.set_admin_display_name();

-- Backfill display_name for existing admins rows.
update public.admins a
set display_name = coalesce(
  nullif(trim(concat_ws(
    ' ',
    coalesce(u.raw_user_meta_data ->> 'first_name', ''),
    coalesce(u.raw_user_meta_data ->> 'last_name', '')
  )), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'username', '')), ''),
  nullif(u.email, ''),
  a.user_id::text
)
from auth.users u
where u.id = a.user_id;

-- Admin membership helper used by policies and API.
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_user_id
  )
  or exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'admin'
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;

-- 9) RLS
alter table public.games enable row level security;
alter table public.products enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.logs enable row level security;
alter table public.users enable row level security;
alter table public.wishlist enable row level security;
alter table public.coupons enable row level security;
alter table public.promotions enable row level security;
alter table public.admins enable row level security;

-- Public read
create policy "Public games are viewable by everyone" on public.games
  for select using (true);

create policy "Public packages are viewable by everyone" on public.packages
  for select using (true);

create policy "Coupons are viewable by everyone" on public.coupons
  for select using (true);

create policy "Promotions are viewable by everyone" on public.promotions
  for select using (true);

-- Users mirror: own row only
create policy "Users can view own mirror user" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own mirror user" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Orders: user sees/creates own orders only
create policy "Users can view their own orders" on public.orders
  for select using ((select auth.uid()) = user_id);

create policy "Users can create orders" on public.orders
  for insert with check ((select auth.uid()) = user_id);

create policy "Admins can view all orders" on public.orders
  for select using (public.is_admin_user(auth.uid()));

create policy "Users can view own payments" on public.payments
  for select using (
    exists (
      select 1
      from public.orders o
      where o.id = payments.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "Admins can view all payments" on public.payments
  for select using (public.is_admin_user(auth.uid()));

create policy "Public active products are viewable by everyone" on public.products
  for select using (active = true);

create policy "Admins can manage products" on public.products
  for all using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

create policy "Admins can view logs" on public.logs
  for select using (public.is_admin_user(auth.uid()));

create policy "Service role manages logs" on public.logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Wishlist: user scope
create policy "Users can view their own wishlist" on public.wishlist
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert into their own wishlist" on public.wishlist
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can delete from their own wishlist" on public.wishlist
  for delete using ((select auth.uid()) = user_id);

-- Admin row visibility (minimal)
create policy "Users can view own admin membership" on public.admins
  for select using ((select auth.uid()) = user_id);

-- 10) AUTH USERS METADATA SUPPORT (instead of profiles table)
-- Attempt username uniqueness index on auth.users metadata.
-- In Supabase this may fail for non-owner roles, so we guard it to avoid breaking the whole schema run.
do $$
begin
  execute '
    create unique index if not exists auth_users_username_unique_lower_idx
      on auth.users ((lower(coalesce(raw_user_meta_data ->> ''username'', ''''))))
      where coalesce(raw_user_meta_data ->> ''username'', '''') <> ''''
  ';
exception
  when insufficient_privilege then
    raise notice 'Skipped auth.users index creation: current role is not owner of auth.users.';
end $$;

-- Lookup owner of username (used by API check-username)
create or replace function public.get_username_owner(p_username text)
returns table (user_id uuid)
language sql
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(coalesce(u.raw_user_meta_data ->> 'username', '')) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_username_owner(text) from public;
grant execute on function public.get_username_owner(text) to anon, authenticated, service_role;

-- Sync auth.users -> public.users mirror
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

-- Admin membership helper used by server API
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_user_id
  )
  or exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'admin'
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;

-- Self-delete helper for authenticated users (fallback when server delete endpoint is unavailable).
create or replace function public.delete_my_account(p_username text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requester_id uuid := auth.uid();
  current_username text := '';
begin
  if requester_id is null then
    raise exception 'Unauthorized';
  end if;

  select lower(coalesce(u.raw_user_meta_data ->> 'username', ''))
    into current_username
  from auth.users u
  where u.id = requester_id;

  if current_username = '' or current_username <> lower(trim(p_username)) then
    raise exception 'Username does not match authenticated user';
  end if;

  delete from auth.users
  where id = requester_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.delete_my_account(text) from public;
grant execute on function public.delete_my_account(text) to authenticated, service_role;

-- 11) STORAGE (avatars bucket)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 12) SEED DATA
insert into public.games (id, name, publisher, image_url, currency_name, category, show_on_home)
values
('pubg-mobile', 'PUBG Mobile', 'Level Infinite', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/pubg.jpeg', 'UC', 'game', true),
('free-fire', 'Free Fire', 'Garena', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/freefire.jpeg', 'Diamonds', 'game', true),
('mobile-legends', 'Mobile Legends', 'Moonton', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/mobile-legends2.jpeg', 'Diamonds', 'game', true),
('tiktok', 'TikTok', 'ByteDance', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/tiktok.png', 'Coins', 'app', true),
('steam', 'Steam', 'Valve', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/steam.jpeg', 'Wallet', 'app', true),
('xbox', 'Xbox', 'Microsoft', 'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/xbox.jpeg', 'Gift Card', 'app', true)
on conflict (id) do nothing;

insert into public.packages (game_id, amount, bonus, price)
values
('pubg-mobile', 60, 0, 0.99),
('pubg-mobile', 300, 25, 4.99),
('pubg-mobile', 600, 60, 9.99),
('free-fire', 100, 0, 0.99),
('free-fire', 210, 21, 2.49),
('free-fire', 530, 53, 4.99),
('mobile-legends', 86, 0, 1.50),
('mobile-legends', 172, 17, 2.99),
('tiktok', 70, 0, 0.99),
('tiktok', 350, 0, 4.99),
('steam', 10, 0, 10.00),
('steam', 20, 0, 20.00),
('xbox', 10, 0, 10.00),
('xbox', 25, 0, 25.00)
on conflict do nothing;

insert into public.coupons (code, discount_type, value)
values
('WELCOME10', 'percent', 10),
('SAVE5', 'fixed', 5)
on conflict (code) do nothing;

insert into public.promotions (id, image_url, sort_order)
values
(1, 'https://picsum.photos/seed/gaming1/1200/600', 1),
(2, 'https://picsum.photos/seed/gaming2/1200/600', 2),
(3, 'https://picsum.photos/seed/gaming3/1200/600', 3)
on conflict (id) do nothing;

-- 13) AUTOMATION COMPATIBILITY EXTENSIONS
alter table public.products
  add column if not exists game text,
  add column if not exists title text,
  add column if not exists provider text,
  add column if not exists image text,
  add column if not exists updated_at timestamptz not null default now();

update public.products p
set
  game = coalesce(p.game, g.name, p.game_id),
  title = coalesce(p.title, p.name),
  provider = coalesce(p.provider, g.provider_api, 'reloadly')
from public.games g
where g.id = p.game_id;

alter table public.orders
  add column if not exists payment_invoice_id text,
  add column if not exists updated_at timestamptz not null default now();

update public.orders
set payment_invoice_id = coalesce(payment_invoice_id, payment_id::text)
where payment_invoice_id is null;

alter table public.admins
  add column if not exists id uuid default uuid_generate_v4(),
  add column if not exists permissions jsonb not null default '{}'::jsonb;

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_tx_id text,
  provider_transaction_id text,
  response jsonb not null default '{}'::jsonb,
  response_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists transactions_order_id_idx on public.transactions(order_id);
create index if not exists transactions_provider_idx on public.transactions(provider);
create index if not exists transactions_status_idx on public.transactions(status);

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
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_current_timestamp_updated_at();

-- 14) ADVANCED SCALING EXTENSIONS
alter table public.orders
  add column if not exists country text,
  add column if not exists ip_address text,
  add column if not exists fraud_risk_score numeric(5,2);

do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%provider%'
  loop
    execute format('alter table public.orders drop constraint if exists %I', rec.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_provider_check
  check (provider is null or provider in ('reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'));

create table if not exists public.provider_prices (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12,2) not null,
  currency text not null default 'EGP',
  updated_at timestamptz not null default now(),
  unique (provider, product_id)
);

create table if not exists public.pricing_rules (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  margin_percent numeric(6,2) not null default 0,
  min_profit numeric(12,2) not null default 0,
  max_profit numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

create table if not exists public.fraud_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  ip_address text,
  country text,
  risk_score integer not null default 0,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_failures (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  product_id uuid references public.products(id) on delete set null,
  order_id text references public.orders(id) on delete set null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_health (
  provider text primary key,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  last_response_ms integer,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists provider_prices_product_id_idx on public.provider_prices(product_id);
create index if not exists provider_prices_provider_idx on public.provider_prices(provider);
create index if not exists fraud_logs_user_id_idx on public.fraud_logs(user_id);
create index if not exists fraud_logs_risk_score_idx on public.fraud_logs(risk_score desc);
create index if not exists provider_failures_provider_idx on public.provider_failures(provider);
create index if not exists provider_health_updated_at_idx on public.provider_health(updated_at desc);

alter table public.orders replica identity full;

-- FK coverage indexes (lint/performance)
create index if not exists orders_game_id_idx on public.orders(game_id);
create index if not exists orders_package_id_idx on public.orders(package_id);
create index if not exists provider_failures_order_id_idx on public.provider_failures(order_id);
create index if not exists provider_failures_product_id_idx on public.provider_failures(product_id);
create index if not exists wishlist_game_id_idx on public.wishlist(game_id);

*/
-- END FILE: FINAL_SCHEMA.sql
create extension if not exists pgcrypto;

create table if not exists public.worker_heartbeats (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  status text not null default 'ok',
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);

create index if not exists worker_heartbeats_name_idx on public.worker_heartbeats(worker_name);
create index if not exists worker_heartbeats_last_seen_idx on public.worker_heartbeats(last_seen_at desc);

alter table public.worker_heartbeats enable row level security;

drop policy if exists "Worker heartbeats admin read" on public.worker_heartbeats;
create policy "Worker heartbeats admin read"
  on public.worker_heartbeats
  for select
  to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists "Worker heartbeats service manage" on public.worker_heartbeats;
create policy "Worker heartbeats service manage"
  on public.worker_heartbeats
  for all
  to service_role
  using (true)
  with check (true);
