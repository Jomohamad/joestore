create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references auth.users(id) on delete set null,
  export_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  result_url text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_exports_type_idx on public.data_exports(export_type);
create index if not exists data_exports_status_idx on public.data_exports(status);

alter table public.audit_logs enable row level security;
alter table public.data_exports enable row level security;

drop policy if exists "Audit logs admin read" on public.audit_logs;
create policy "Audit logs admin read"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists "Audit logs service role manage" on public.audit_logs;
create policy "Audit logs service role manage"
  on public.audit_logs
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Data exports admin read" on public.data_exports;
create policy "Data exports admin read"
  on public.data_exports
  for select
  to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists "Data exports admin create" on public.data_exports;
create policy "Data exports admin create"
  on public.data_exports
  for insert
  to authenticated
  with check (public.is_admin_user((select auth.uid())));

drop policy if exists "Data exports service role manage" on public.data_exports;
create policy "Data exports service role manage"
  on public.data_exports
  for all
  to service_role
  using (true)
  with check (true);
