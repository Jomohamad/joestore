import { createClient } from '@supabase/supabase-js';

// Fallback to the project ID user provided in SQL if env var is missing
const FALLBACK_URL = 'https://zcyyrvyltnpmdflupftn.supabase.co';
const FALLBACK_KEY = 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.error('Supabase URL is missing or invalid. Please set VITE_SUPABASE_URL in your environment.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE') {
  console.warn('Supabase Anon Key is missing or using placeholder. Authentication features may not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
