-- Harden orders RLS to block client-side writes (server/API should use service_role).

alter table public.orders enable row level security;

drop policy if exists "Users can create orders" on public.orders;

drop policy if exists "Service role manages orders" on public.orders;
create policy "Service role manages orders"
  on public.orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
