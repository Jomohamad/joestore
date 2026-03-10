create extension if not exists pgcrypto;

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'expired')),
  reward_amount numeric(12,2) not null default 0,
  reward_currency text not null default 'EGP',
  order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_user_id)
);

create index if not exists referral_attributions_referrer_idx on public.referral_attributions(referrer_user_id);

create table if not exists public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'game', 'category', 'first_purchase')),
  game_id text,
  category text,
  percent numeric(5,2),
  fixed_amount numeric(10,2),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists discount_rules_active_idx on public.discount_rules(active);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx on public.analytics_events(event_type);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);

alter table if exists public.orders
  add column if not exists order_discounts jsonb not null default '{}'::jsonb;

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.discount_rules enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "Referral codes read own" on public.referral_codes;
create policy "Referral codes read own"
  on public.referral_codes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Referral codes service role manage" on public.referral_codes;
create policy "Referral codes service role manage"
  on public.referral_codes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Referral attributions read own" on public.referral_attributions;
create policy "Referral attributions read own"
  on public.referral_attributions
  for select
  to authenticated
  using (referrer_user_id = (select auth.uid()) or referred_user_id = (select auth.uid()));

drop policy if exists "Referral attributions service role manage" on public.referral_attributions;
create policy "Referral attributions service role manage"
  on public.referral_attributions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Discount rules public read" on public.discount_rules;
create policy "Discount rules public read"
  on public.discount_rules
  for select
  to public
  using (active = true);

drop policy if exists "Discount rules admin manage" on public.discount_rules;
create policy "Discount rules admin manage"
  on public.discount_rules
  for all
  to authenticated
  using (public.is_admin_user((select auth.uid())))
  with check (public.is_admin_user((select auth.uid())));

drop policy if exists "Analytics events service role manage" on public.analytics_events;
create policy "Analytics events service role manage"
  on public.analytics_events
  for all
  to service_role
  using (true)
  with check (true);
