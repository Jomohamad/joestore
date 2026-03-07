-- Admin panel extended schema

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists is_blocked boolean not null default false,
  add column if not exists fraud_risk_score numeric(8,2) not null default 0;

alter table public.provider_health
  add column if not exists priority integer not null default 100;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists settings_key_idx on public.settings(key);

alter table public.settings enable row level security;

drop policy if exists "Admins can manage settings" on public.settings;
create policy "Admins can manage settings"
on public.settings for all
using (public.is_admin_user((select auth.uid())))
with check (public.is_admin_user((select auth.uid())));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'payment_gateway'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('payment_gateway', '{"provider":"fawaterk"}'::jsonb, 'Payment gateway configuration');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'queue'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('queue', '{"mode":"bullmq","retryAttempts":3}'::jsonb, 'Queue and retry configuration');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.settings WHERE key = 'redis'
  ) THEN
    INSERT INTO public.settings (key, value, description)
    VALUES ('redis', '{"enabled":true}'::jsonb, 'Redis runtime settings');
  END IF;
END $$;
