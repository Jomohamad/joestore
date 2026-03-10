alter table if exists public.orders
  add column if not exists discount_code text,
  add column if not exists discount_type text check (discount_type in ('percent', 'fixed')),
  add column if not exists discount_value numeric(10,2),
  add column if not exists discount_amount numeric(10,2);

create index if not exists orders_discount_code_idx on public.orders(discount_code);
