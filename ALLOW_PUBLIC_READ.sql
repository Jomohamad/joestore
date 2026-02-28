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
