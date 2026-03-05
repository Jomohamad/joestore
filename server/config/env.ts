import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const clean = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/^['"]|['"]$/g, '');
};

const required = (name: string, value?: string) => {
  const v = clean(value);
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
};

export const env = {
  nodeEnv: clean(process.env.NODE_ENV) || 'development',
  port: Number(clean(process.env.PORT) || '3000'),
  appBaseUrl: clean(process.env.APP_BASE_URL) || '',
  redisUrl: required('REDIS_URL', process.env.REDIS_URL),

  supabaseUrl: required('SUPABASE_URL or VITE_SUPABASE_URL', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),

  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),

  reloadlyClientId: required('RELOADLY_CLIENT_ID', process.env.RELOADLY_CLIENT_ID),
  reloadlyClientSecret: required('RELOADLY_CLIENT_SECRET', process.env.RELOADLY_CLIENT_SECRET),
  gamesdropApiKey: required('GAMESDROP_API_KEY', process.env.GAMESDROP_API_KEY),

  paymobApiKey: required('PAYMOB_API_KEY', process.env.PAYMOB_API_KEY),
  paymobHmacSecret: required('PAYMOB_HMAC_SECRET', process.env.PAYMOB_HMAC_SECRET),

  fawrypayApiKey: required('FAWRYPAY_API_KEY', process.env.FAWRYPAY_API_KEY),
  fawrypayHmacSecret: required('FAWRYPAY_HMAC_SECRET', process.env.FAWRYPAY_HMAC_SECRET),

  sandboxMode: clean(process.env.SANDBOX_MODE || 'true').toLowerCase() !== 'false',
};

export type AppEnv = typeof env;
