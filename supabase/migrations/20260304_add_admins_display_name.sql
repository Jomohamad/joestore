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
