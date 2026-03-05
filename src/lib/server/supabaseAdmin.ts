import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env';

export const supabaseAdmin = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAnon = createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
