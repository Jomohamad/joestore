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
