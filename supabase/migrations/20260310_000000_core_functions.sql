-- Core functions for JOEStore
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = p_user_id and is_admin = true
  );
end;
$$ language plpgsql security definer;
