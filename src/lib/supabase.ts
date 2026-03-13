import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const hasValidUrl = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co');
const hasValidAnonKey = Boolean(supabaseAnonKey && supabaseAnonKey !== 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE');
const hasValidConfig = hasValidUrl && hasValidAnonKey;
const SUPABASE_CONFIG_ERROR =
  'Supabase env vars are missing/invalid. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.';

type SupabaseClientInstance = ReturnType<typeof createClient>;
const scope = globalThis as typeof globalThis & {
  __JOESTORE_SUPABASE_CLIENT__?: SupabaseClientInstance;
  __SUPABASE_ENV_WARNED__?: boolean;
};

const isBrowser = typeof window !== 'undefined';
const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
})();

if (!hasValidConfig && process.env.NODE_ENV === 'production' && !scope.__SUPABASE_ENV_WARNED__) {
  // Avoid hard-crashing the client bundle when env vars are missing on deploy.
  // API calls will fail with clear network/auth errors until proper env vars are set.
  scope.__SUPABASE_ENV_WARNED__ = true;
  // eslint-disable-next-line no-console
  console.error(SUPABASE_CONFIG_ERROR);
}

if (!scope.__JOESTORE_SUPABASE_CLIENT__) {
  const authStorage = isBrowser ? window.sessionStorage : memoryStorage;
  scope.__JOESTORE_SUPABASE_CLIENT__ = createClient(
    hasValidUrl ? (supabaseUrl as string) : 'https://invalid.local',
    hasValidAnonKey ? (supabaseAnonKey as string) : 'invalid-anon-key',
    {
      auth: hasValidConfig
        ? {
            // Prefer sessionStorage to avoid long-lived tokens in localStorage.
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: authStorage,
          }
        : {
            // Prevent noisy auth-client behavior in local/dev when env vars are missing.
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'sb-joestore-missing-env',
            storage: memoryStorage,
          },
    },
  );
}

export const supabase = scope.__JOESTORE_SUPABASE_CLIENT__;
export const isSupabaseConfigured = hasValidConfig;
export const supabaseConfigErrorMessage = SUPABASE_CONFIG_ERROR;
