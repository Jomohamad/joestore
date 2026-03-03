-- Move profile data into auth.users metadata, move admin flags into admins table, then remove profiles table.
begin;

-- 1) Move profile fields into auth.users.raw_user_meta_data
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
insert into public.admins (user_id, note)
select u.id, 'migrated from auth.users metadata'
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
