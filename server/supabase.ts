import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const errorMsg = 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY. Server APIs require a service role key.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;
