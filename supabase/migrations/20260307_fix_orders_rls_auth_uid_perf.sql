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
