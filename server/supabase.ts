import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const errorMsg = 'Missing Supabase URL or Key. Please check your .env file or Vercel Environment Variables.';
  console.error(errorMsg);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export default supabase;
