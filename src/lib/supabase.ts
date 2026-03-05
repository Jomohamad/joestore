import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const hasValidUrl = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co');
const hasValidAnonKey = Boolean(supabaseAnonKey && supabaseAnonKey !== 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE');

if (!hasValidUrl || !hasValidAnonKey) {
  // Avoid hard-crashing the client bundle when env vars are missing on deploy.
  // API calls will fail with clear network/auth errors until proper env vars are set.
  // eslint-disable-next-line no-console
  console.error(
    'Supabase env vars are missing/invalid. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.',
  );
}

export const supabase = createClient(
  hasValidUrl ? (supabaseUrl as string) : 'https://invalid.local',
  hasValidAnonKey ? (supabaseAnonKey as string) : 'invalid-anon-key',
);
