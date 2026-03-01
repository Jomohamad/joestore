-- First, ensure all necessary columns exist
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
