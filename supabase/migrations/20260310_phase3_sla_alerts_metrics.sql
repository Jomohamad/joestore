create extension if not exists pgcrypto;

create table if not exists public.provider_sla (
  provider text primary key,
  target_success_rate numeric(5,2) not null default 95,
  target_latency_ms integer not null default 1500,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists alerts_log_type_idx on public.alerts_log(type);
create index if not exists alerts_log_created_at_idx on public.alerts_log(created_at desc);

alter table public.provider_sla enable row level security;
alter table public.alerts_log enable row level security;

drop policy if exists "Provider SLA public read" on public.provider_sla;
create policy "Provider SLA public read"
  on public.provider_sla
  for select
  to public
  using (true);

drop policy if exists "Provider SLA admin manage" on public.provider_sla;
create policy "Provider SLA admin manage"
  on public.provider_sla
  for all
  to authenticated
  using (public.is_admin_user((select auth.uid())))
  with check (public.is_admin_user((select auth.uid())));

drop policy if exists "Alerts log admin read" on public.alerts_log;
create policy "Alerts log admin read"
  on public.alerts_log
  for select
  to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists "Alerts log service manage" on public.alerts_log;
create policy "Alerts log service manage"
  on public.alerts_log
  for all
  to service_role
  using (true)
  with check (true);
