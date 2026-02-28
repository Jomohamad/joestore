-- Enable UUID extension (optional but good practice)
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist
drop table if exists orders;
drop table if exists packages;
drop table if exists games;

-- Create Games Table
create table games (
  id text primary key,
  name text not null,
  publisher text not null,
  image_url text not null,
  currency_name text not null,
  currency_icon text not null,
  color_theme text not null,
  category text not null default 'game'
);

-- Create Packages Table
create table packages (
  id serial primary key,
  game_id text not null references games(id),
  amount integer not null,
  bonus integer default 0,
  price decimal(10, 2) not null
);

-- Create Orders Table
create table orders (
  id text primary key,
  game_id text not null references games(id),
  package_id integer not null references packages(id),
  player_id text not null,
  amount decimal(10, 2) not null,
  status text not null,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) Policies (Optional: Start open, then restrict)
alter table games enable row level security;
alter table packages enable row level security;
alter table orders enable row level security;

-- Allow public read access to games and packages
create policy "Public games are viewable by everyone" on games for select using (true);
create policy "Public packages are viewable by everyone" on packages for select using (true);

-- Allow anyone to create orders (for this demo app)
create policy "Anyone can create orders" on orders for insert with check (true);
create policy "Users can view their own orders" on orders for select using (true); -- In a real app, filter by user_id

-- Seed Data (Example for a few games, copy full list from db.ts)
insert into games (id, name, publisher, image_url, currency_name, currency_icon, color_theme, category) values
('pubg-mobile', 'PUBG Mobile', 'Level Infinite', '/pics/pubg.svg', 'UC', 'uc-icon', '#F59E0B', 'game'),
('free-fire', 'Free Fire', 'Garena', '/pics/freefire.svg', 'Diamonds', 'diamond-icon', '#EF4444', 'game'),
('mobile-legends', 'Mobile Legends', 'Moonton', '/pics/mlbb.svg', 'Diamonds', 'diamond-icon', '#3B82F6', 'game');

insert into packages (game_id, amount, bonus, price) values
('pubg-mobile', 60, 0, 50),
('pubg-mobile', 300, 25, 250),
('pubg-mobile', 600, 60, 500),
('free-fire', 100, 0, 50),
('free-fire', 210, 21, 105);
