import { createClient } from '@supabase/supabase-js';

// Fallback to the project ID user provided in SQL if env var is missing
const FALLBACK_URL = 'https://zcyyrvyltnpmdflupftn.supabase.co';
const FALLBACK_KEY = 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase keys are missing from environment variables. Using fallbacks.');
  console.warn('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
