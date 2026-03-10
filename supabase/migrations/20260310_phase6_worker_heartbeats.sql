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
