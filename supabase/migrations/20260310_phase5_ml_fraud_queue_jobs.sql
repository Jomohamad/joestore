create extension if not exists pgcrypto;

create table if not exists public.queue_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists queue_jobs_status_idx on public.queue_jobs(status);
create index if not exists queue_jobs_run_at_idx on public.queue_jobs(run_at);

create table if not exists public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_id text,
  signal_type text not null,
  score numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fraud_signals_user_idx on public.fraud_signals(user_id);
create index if not exists fraud_signals_order_idx on public.fraud_signals(order_id);

alter table public.queue_jobs enable row level security;
alter table public.fraud_signals enable row level security;

drop policy if exists "Queue jobs service manage" on public.queue_jobs;
create policy "Queue jobs service manage"
  on public.queue_jobs
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Fraud signals admin read" on public.fraud_signals;
create policy "Fraud signals admin read"
  on public.fraud_signals
  for select
  to authenticated
  using (public.is_admin_user((select auth.uid())));

drop policy if exists "Fraud signals service manage" on public.fraud_signals;
create policy "Fraud signals service manage"
  on public.fraud_signals
  for all
  to service_role
  using (true)
  with check (true);
