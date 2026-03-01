-- ==========================================
-- FINAL COMBINED SCHEMA
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CLEANUP (Be careful in production, this resets tables)
drop table if exists order_items;
drop table if exists orders;
drop table if exists wishlist;
drop table if exists packages;
drop table if exists games;
drop table if exists coupons;

-- 2. GAMES TABLE
create table if not exists games (
  id text primary key,
  name text not null,
  publisher text not null,
  image_url text not null,
  currency_name text not null,
  currency_icon text not null,
  color_theme text not null,
  category text not null default 'game',
  genre text default 'Action',
  popularity integer default 0,
  min_price decimal(10, 2) default 0.99,
  rating decimal(3, 1) default 0.0,
  reviews_count integer default 0,
  description text,
  release_date date
);

-- 3. PACKAGES TABLE
create table if not exists packages (
  id serial primary key,
  game_id text not null references games(id),
  amount integer not null,
  bonus integer default 0,
  price decimal(10, 2) not null
);

-- 4. ORDERS TABLE
create table if not exists orders (
  id text primary key,
  user_id uuid references auth.users(id),
  game_id text not null references games(id),
  package_id integer not null references packages(id),
  player_id text not null,
  amount decimal(10, 2) not null,
  status text not null,
  payment_method text,
  created_at timestamptz default now()
);

-- 5. WISHLIST TABLE (Updated to support specific packages)
create table if not exists wishlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  game_id text not null references games(id),
  package_id integer references packages(id), -- Optional: if null, wishlisting the whole game
  created_at timestamptz default now(),
  unique(user_id, game_id, package_id)
);

-- 6. COUPONS TABLE
create table if not exists coupons (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value decimal(10, 2) not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 6.5 PROMOTIONS TABLE
create table if not exists promotions (
  id serial primary key,
  subtitle_en text not null,
  subtitle_ar text not null,
  image_url text not null,
  link_url text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 7. RLS POLICIES

-- Enable RLS
alter table games enable row level security;
alter table packages enable row level security;
alter table orders enable row level security;
alter table wishlist enable row level security;
alter table coupons enable row level security;
alter table promotions enable row level security;

-- Games & Packages: Public Read
drop policy if exists "Public games are viewable by everyone" on games;
create policy "Public games are viewable by everyone" on games for select using (true);

drop policy if exists "Public packages are viewable by everyone" on packages;
create policy "Public packages are viewable by everyone" on packages for select using (true);

-- Orders: Users see their own, Anon can insert (if we allow guest checkout, but user asked to restrict)
-- Updating policy based on request: "If not logged in, cannot add to cart" -> implies checkout requires login?
-- User said: "Anyone logged in keep info cloud, anyone not logged in keep local".
-- But also: "If not logged in, cannot add products to cart".
-- So orders will likely always have a user_id if we enforce login.
drop policy if exists "Users can view their own orders" on orders;
create policy "Users can view their own orders" on orders for select using (auth.uid() = user_id);

drop policy if exists "Users can create orders" on orders;
create policy "Users can create orders" on orders for insert with check (auth.uid() = user_id);

-- Wishlist: Users only
drop policy if exists "Users can view their own wishlist" on wishlist;
create policy "Users can view their own wishlist" on wishlist for select using (auth.uid() = user_id);

drop policy if exists "Users can insert into their own wishlist" on wishlist;
create policy "Users can insert into their own wishlist" on wishlist for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete from their own wishlist" on wishlist;
create policy "Users can delete from their own wishlist" on wishlist for delete using (auth.uid() = user_id);

-- Coupons: Public Read (to validate)
drop policy if exists "Coupons are viewable by everyone" on coupons;
create policy "Coupons are viewable by everyone" on coupons for select using (true);

-- Promotions: Public Read
drop policy if exists "Promotions are viewable by everyone" on promotions;
create policy "Promotions are viewable by everyone" on promotions for select using (true);

-- 8. SEED DATA

-- Games
insert into games (id, name, publisher, image_url, currency_name, currency_icon, color_theme, category, genre, popularity, min_price) values
('pubg-mobile', 'PUBG Mobile', 'Level Infinite', '/pics/pubg.svg', 'UC', 'uc-icon', '#F59E0B', 'game', 'Action', 98, 0.99),
('free-fire', 'Free Fire', 'Garena', '/pics/freefire.svg', 'Diamonds', 'diamond-icon', '#EF4444', 'game', 'Action', 95, 0.99),
('mobile-legends', 'Mobile Legends', 'Moonton', '/pics/mlbb.svg', 'Diamonds', 'diamond-icon', '#3B82F6', 'game', 'Strategy', 92, 1.50),
('tiktok', 'TikTok', 'ByteDance', '/pics/tiktok.jpg', 'Coins', 'coin-icon', '#000000', 'app', 'Social', 99, 5.00),
('steam', 'Steam', 'Valve', '/pics/steam.svg', 'Wallet', 'wallet-icon', '#171a21', 'app', 'Entertainment', 95, 10.00),
('xbox', 'Xbox', 'Microsoft', '/pics/xbox.jpg', 'Gift Card', 'card-icon', '#107C10', 'app', 'Entertainment', 92, 10.00)
on conflict (id) do nothing;

-- Packages
insert into packages (game_id, amount, bonus, price) values
('pubg-mobile', 60, 0, 0.99),
('pubg-mobile', 300, 25, 4.99),
('pubg-mobile', 600, 60, 9.99),
('free-fire', 100, 0, 0.99),
('free-fire', 210, 21, 2.49),
('tiktok', 70, 0, 0.99),
('tiktok', 350, 0, 4.99)
on conflict do nothing;

-- Coupons
insert into coupons (code, discount_type, value) values
('WELCOME10', 'percent', 10),
('SAVE5', 'fixed', 5)
on conflict (code) do nothing;

-- Promotions
insert into promotions (id, subtitle_en, subtitle_ar, image_url, sort_order) values
(1, 'Get 20% extra Diamonds on Free Fire', 'احصل على 20% جواهر إضافية في فري فاير', 'https://picsum.photos/seed/gaming1/1200/600', 1),
(2, 'Exclusive skins available now', 'سكنات حصرية متوفرة الآن', 'https://picsum.photos/seed/gaming2/1200/600', 2),
(3, 'Save big on all App Subscriptions', 'وفر الكثير على جميع اشتراكات التطبيقات', 'https://picsum.photos/seed/gaming3/1200/600', 3)
on conflict (id) do nothing;
