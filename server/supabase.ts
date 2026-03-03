import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load local-first env files for dev (`.env.local`) and fallback to `.env`.
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceRoleKey =
  rawServiceRoleKey && !rawServiceRoleKey.includes('PASTE_YOUR_SERVICE_ROLE_KEY_HERE')
    ? rawServiceRoleKey
    : undefined;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  const errorMsg =
    'Missing Supabase URL or key. Set VITE_SUPABASE_URL (or SUPABASE_URL) and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Server will run with anon key and limited privileges.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
