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
