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
