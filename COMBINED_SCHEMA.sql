-- ==========================================
-- 1. BASE SCHEMA (Tables & Basic Policies)
-- ==========================================

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

-- ==========================================
-- 2. SCHEMA UPDATES (New Columns)
-- ==========================================

-- Add new columns for filtering
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "genre" text DEFAULT 'Action';
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "popularity" integer DEFAULT 0;
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "min_price" decimal DEFAULT 0.99;

-- Update existing games with random data for demonstration
UPDATE "public"."games" 
SET 
  "genre" = CASE 
    WHEN "category" = 'app' THEN
      CASE floor(random() * 4)
        WHEN 0 THEN 'Social'
        WHEN 1 THEN 'Entertainment'
        WHEN 2 THEN 'Productivity'
        ELSE 'Lifestyle'
      END
    ELSE
      CASE floor(random() * 5)
        WHEN 0 THEN 'Action'
        WHEN 1 THEN 'RPG'
        WHEN 2 THEN 'Strategy'
        WHEN 3 THEN 'Sports'
        ELSE 'Adventure'
      END
  END,
  "popularity" = floor(random() * 100),
  "min_price" = (floor(random() * 10) + 1) * 0.99;

-- ==========================================
-- 3. SECURITY POLICIES (Public Read & RLS Fixes)
-- ==========================================

-- Enable RLS on tables
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."packages" ENABLE ROW LEVEL SECURITY;

-- Allow public read access to games
DROP POLICY IF EXISTS "Public can view games" ON "public"."games";
CREATE POLICY "Public can view games" 
ON "public"."games" 
FOR SELECT 
USING (true);

-- Allow public read access to packages
DROP POLICY IF EXISTS "Public can view packages" ON "public"."packages";
CREATE POLICY "Public can view packages" 
ON "public"."packages" 
FOR SELECT 
USING (true);

-- Ensure anon role has usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON "public"."games" TO anon;
GRANT SELECT ON "public"."packages" TO anon;

-- Fix Orders Table Security
-- Drop unsafe policy
DROP POLICY IF EXISTS "Anyone can create orders" ON "public"."orders";

-- Ensure RLS is enabled
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. LATEST UPDATES (New Apps & Columns)
-- ==========================================

-- First, ensure all necessary columns exist (Idempotent check)
DO $$
BEGIN
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'rating') THEN
        ALTER TABLE public.games ADD COLUMN rating decimal(3, 1) DEFAULT 0.0;
    END IF;

    -- Add reviews_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'reviews_count') THEN
        ALTER TABLE public.games ADD COLUMN reviews_count integer DEFAULT 0;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'description') THEN
        ALTER TABLE public.games ADD COLUMN description text;
    END IF;

    -- Add release_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'release_date') THEN
        ALTER TABLE public.games ADD COLUMN release_date date;
    END IF;

    -- Add genre column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'genre') THEN
        ALTER TABLE public.games ADD COLUMN genre text;
    END IF;

    -- Add popularity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'popularity') THEN
        ALTER TABLE public.games ADD COLUMN popularity integer DEFAULT 0;
    END IF;

    -- Add min_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'min_price') THEN
        ALTER TABLE public.games ADD COLUMN min_price decimal(10, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Now insert the new apps with explicit IDs and Storage URLs
-- IMPORTANT: You must replace 'zcyyrvyltnpmdflupftn' with your actual Supabase project ID
-- You can find it in your Supabase dashboard URL: https://supabase.com/dashboard/project/<project_id>
INSERT INTO public.games (id, name, category, image_url, publisher, rating, reviews_count, description, release_date, genre, popularity, min_price, currency_name, currency_icon, color_theme)
VALUES
  (
    'tiktok',
    'TikTok',
    'app',
    'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/tiktok.jpg',
    'ByteDance',
    4.7,
    15000000,
    'TikTok is the leading destination for short-form mobile video. Our mission is to inspire creativity and bring joy.',
    '2016-09-01',
    'Social',
    99,
    5.00,
    'Coins',
    'coin-icon',
    '#000000'
  ),
  (
    'steam',
    'Steam',
    'app',
    'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/steam.jpg',
    'Valve',
    4.8,
    5000000,
    'Steam is the ultimate destination for playing, discussing, and creating games.',
    '2003-09-12',
    'Entertainment',
    95,
    10.00,
    'Wallet',
    'wallet-icon',
    '#171a21'
  ),
  (
    'xbox',
    'Xbox',
    'app',
    'https://zcyyrvyltnpmdflupftn.supabase.co/storage/v1/object/public/images/xbox.jpg',
    'Microsoft',
    4.6,
    8000000,
    'The Xbox app brings together your friends, games, and accomplishments from across your devices.',
    '2001-11-15',
    'Entertainment',
    92,
    10.00,
    'Gift Card',
    'card-icon',
    '#107C10'
  )
ON CONFLICT (id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  reviews_count = EXCLUDED.reviews_count,
  release_date = EXCLUDED.release_date,
  genre = EXCLUDED.genre,
  popularity = EXCLUDED.popularity,
  min_price = EXCLUDED.min_price;
