import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const clean = (value?: string) => (value || '').trim().replace(/^['"]|['"]$/g, '');

const required = (name: string, value?: string) => {
  const v = clean(value);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
};

const requiredProdOrDefault = (name: string, value: string | undefined, devDefault: string, isProduction: boolean) => {
  const v = clean(value);
  if (v) return v;
  if (!isProduction) return devDefault;
  throw new Error(`Missing required environment variable: ${name}`);
};

const requiredWhenOrDefault = (
  name: string,
  value: string | undefined,
  defaultValue: string,
  mustRequire: boolean,
) => {
  const v = clean(value);
  if (v) return v;
  if (!mustRequire) return defaultValue;
  throw new Error(`Missing required environment variable: ${name}`);
};

const nodeEnv = clean(process.env.NODE_ENV) || 'development';
const isProduction = nodeEnv === 'production';

export const serverEnv = {
  nodeEnv,
  appBaseUrl:
    clean(process.env.APP_BASE_URL) ||
    clean(process.env.NEXT_PUBLIC_APP_BASE_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  sandboxMode: clean(process.env.SANDBOX_MODE || 'true').toLowerCase() !== 'false',

  supabaseUrl: required(
    'NEXT_PUBLIC_SUPABASE_URL or NEXT_VITE_SUPABASE_URL or VITE_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  ),
  supabaseServiceRole: required('SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),

  jwtSecret: requiredWhenOrDefault(
    'JWT_SECRET',
    process.env.JWT_SECRET,
    'dev-insecure-jwt-secret',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),

  reloadlyClientId: requiredWhenOrDefault(
    'RELOADLY_CLIENT_ID',
    process.env.RELOADLY_CLIENT_ID,
    'sandbox-reloadly-client-id',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
  reloadlyClientSecret: requiredWhenOrDefault(
    'RELOADLY_CLIENT_SECRET',
    process.env.RELOADLY_CLIENT_SECRET,
    'sandbox-reloadly-client-secret',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
  gamesdropApiKey: requiredWhenOrDefault(
    'GAMESDROP_API_KEY',
    process.env.GAMESDROP_API_KEY,
    'sandbox-gamesdrop-api-key',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),

  paymobApiKey: requiredWhenOrDefault(
    'PAYMOB_API_KEY',
    process.env.PAYMOB_API_KEY,
    'sandbox-paymob-api-key',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
  paymobIntegrationId: requiredWhenOrDefault(
    'PAYMOB_INTEGRATION_ID',
    process.env.PAYMOB_INTEGRATION_ID,
    'sandbox-paymob-integration-id',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
  paymobHmacSecret: requiredWhenOrDefault(
    'PAYMOB_HMAC_SECRET',
    process.env.PAYMOB_HMAC_SECRET || process.env.PAYMOB_API_KEY,
    'sandbox-paymob-hmac-secret',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),

  fawrypayApiKey: requiredWhenOrDefault(
    'FAWRYPAY_API_KEY',
    process.env.FAWRYPAY_API_KEY,
    'sandbox-fawrypay-api-key',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
  fawrypaySecret: requiredWhenOrDefault(
    'FAWRYPAY_SECRET',
    process.env.FAWRYPAY_SECRET,
    'sandbox-fawrypay-secret',
    isProduction && clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false',
  ),
};
