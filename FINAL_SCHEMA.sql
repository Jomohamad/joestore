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

-- 2) CLEANUP (full reset for this app schema)
do $$
begin
  begin
    execute 'drop view if exists public.users_profile cascade';
  exception
    when wrong_object_type then
      execute 'drop table if exists public.users_profile cascade';
  end;
end $$;
drop function if exists public.get_username_owner(text);
drop function if exists public.is_admin_user(uuid);
drop function if exists public.delete_my_account(text);
drop function if exists public.set_admin_display_name();

drop table if exists public.order_items;
drop table if exists public.orders;
drop table if exists public.wishlist;
drop table if exists public.packages;
drop table if exists public.games;
drop table if exists public.coupons;
drop table if exists public.promotions;
drop table if exists public.admins;
drop table if exists public.profiles;
drop table if exists public.users;

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
  show_on_home boolean not null default true
);

create index if not exists games_show_on_home_category_idx on public.games (show_on_home, category);

-- 2.1) USERS MIRROR (auth.users remains source of truth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  password_hash text,
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

-- 4) ORDERS
create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  game_id text not null references public.games(id) on delete restrict,
  package_id integer not null references public.packages(id) on delete restrict,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  payment_method text,
  payment_provider text check (payment_provider in ('paymob', 'fawrypay')),
  account_identifier text,
  player_id text,
  server text,
  package text,
  price numeric(10,2),
  transaction_id text,
  provider_order_ref text,
  payment_details jsonb not null default '{}'::jsonb,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);

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

-- 9) RLS
alter table public.games enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
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
  for select using (auth.uid() = user_id);

create policy "Users can create orders" on public.orders
  for insert with check (auth.uid() = user_id);

-- Wishlist: user scope
create policy "Users can view their own wishlist" on public.wishlist
  for select using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist" on public.wishlist
  for insert with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist" on public.wishlist
  for delete using (auth.uid() = user_id);

-- Admin row visibility (minimal)
create policy "Users can view own admin membership" on public.admins
  for select using (auth.uid() = user_id);

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
