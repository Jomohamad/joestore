-- Add package discounts and order checkout input storage.

alter table public.packages
  add column if not exists discount_type text check (discount_type in ('percent', 'fixed')),
  add column if not exists discount_value numeric(10,2) not null default 0,
  add column if not exists discount_active boolean not null default false,
  add column if not exists discount_ends_at timestamptz;

alter table public.orders
  add column if not exists account_identifier text,
  add column if not exists payment_details jsonb not null default '{}'::jsonb,
  add column if not exists quantity integer not null default 1;
