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

-- Now insert the new apps
INSERT INTO public.games (name, category, image_url, publisher, rating, reviews_count, description, release_date, genre, popularity, min_price)
VALUES
  (
    'TikTok',
    'app',
    'https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=800&auto=format&fit=crop&q=60',
    'ByteDance',
    4.7,
    15000000,
    'TikTok is the leading destination for short-form mobile video. Our mission is to inspire creativity and bring joy.',
    '2016-09-01',
    'Social',
    99,
    5.00
  ),
  (
    'Steam',
    'app',
    'https://images.unsplash.com/photo-1612287230217-9698623d97ce?w=800&auto=format&fit=crop&q=60',
    'Valve',
    4.8,
    5000000,
    'Steam is the ultimate destination for playing, discussing, and creating games.',
    '2003-09-12',
    'Entertainment',
    95,
    10.00
  ),
  (
    'Xbox',
    'app',
    'https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800&auto=format&fit=crop&q=60',
    'Microsoft',
    4.6,
    8000000,
    'The Xbox app brings together your friends, games, and accomplishments from across your devices.',
    '2001-11-15',
    'Entertainment',
    92,
    10.00
  );
