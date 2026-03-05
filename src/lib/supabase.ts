import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  throw new Error('Supabase URL is missing or invalid. Please set NEXT_PUBLIC_SUPABASE_URL.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE') {
  throw new Error('Supabase anon key is missing or invalid. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
