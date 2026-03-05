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

const requiredProdOrDefault = (name: string, value: string | undefined, devDefault: string, isProduction: boolean) => {
  const v = clean(value);
  if (v) return v;
  if (!isProduction) return devDefault;
  throw new Error(`Missing required environment variable: ${name}`);
};

const nodeEnv = clean(process.env.NODE_ENV) || 'development';
const isProduction = nodeEnv === 'production';
const sandboxMode = clean(process.env.SANDBOX_MODE || 'true').toLowerCase() !== 'false';

export const env = {
  nodeEnv,
  port: Number(clean(process.env.PORT) || '3000'),
  appBaseUrl: clean(process.env.APP_BASE_URL) || '',
  redisUrl: clean(process.env.REDIS_URL) || 'redis://127.0.0.1:6379',

  supabaseUrl: required('SUPABASE_URL or VITE_SUPABASE_URL', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),

  jwtSecret: requiredProdOrDefault('JWT_SECRET', process.env.JWT_SECRET, 'dev-insecure-jwt-secret', isProduction),

  reloadlyClientId: sandboxMode
    ? clean(process.env.RELOADLY_CLIENT_ID) || 'sandbox-reloadly-client-id'
    : required('RELOADLY_CLIENT_ID', process.env.RELOADLY_CLIENT_ID),
  reloadlyClientSecret: sandboxMode
    ? clean(process.env.RELOADLY_CLIENT_SECRET) || 'sandbox-reloadly-client-secret'
    : required('RELOADLY_CLIENT_SECRET', process.env.RELOADLY_CLIENT_SECRET),
  gamesdropApiKey: sandboxMode
    ? clean(process.env.GAMESDROP_API_KEY) || 'sandbox-gamesdrop-api-key'
    : required('GAMESDROP_API_KEY', process.env.GAMESDROP_API_KEY),

  paymobApiKey: sandboxMode
    ? clean(process.env.PAYMOB_API_KEY) || 'sandbox-paymob-api-key'
    : required('PAYMOB_API_KEY', process.env.PAYMOB_API_KEY),
  paymobHmacSecret: sandboxMode
    ? clean(process.env.PAYMOB_HMAC_SECRET) || 'sandbox-paymob-hmac-secret'
    : required('PAYMOB_HMAC_SECRET', process.env.PAYMOB_HMAC_SECRET),

  fawrypayApiKey: sandboxMode
    ? clean(process.env.FAWRYPAY_API_KEY) || 'sandbox-fawrypay-api-key'
    : required('FAWRYPAY_API_KEY', process.env.FAWRYPAY_API_KEY),
  fawrypayHmacSecret: sandboxMode
    ? clean(process.env.FAWRYPAY_HMAC_SECRET) || 'sandbox-fawrypay-hmac-secret'
    : required('FAWRYPAY_HMAC_SECRET', process.env.FAWRYPAY_HMAC_SECRET),

  sandboxMode,
};

export type AppEnv = typeof env;
