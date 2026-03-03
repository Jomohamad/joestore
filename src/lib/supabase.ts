import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  throw new Error('Supabase URL is missing or invalid. Please set VITE_SUPABASE_URL.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE') {
  throw new Error('Supabase anon key is missing or invalid. Please set VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
