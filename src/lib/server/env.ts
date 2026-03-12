import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const clean = (value?: string) => (value || '').trim().replace(/^['"]|['"]$/g, '');

const required = (name: string, value?: string) => {
  const v = clean(value);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
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
const sandboxDisabled = clean(process.env.SANDBOX_MODE || 'true').toLowerCase() === 'false';
const mustRequireProd = isProduction;

export const serverEnv = {
  nodeEnv,
  appBaseUrl:
    clean(process.env.APP_BASE_URL) ||
    clean(process.env.NEXT_PUBLIC_APP_BASE_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  sandboxMode: !sandboxDisabled,

  supabaseUrl: required(
    'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL',
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    'SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  supabaseServiceRole: required('SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),

  jwtSecret: requiredWhenOrDefault(
    'JWT_SECRET',
    process.env.JWT_SECRET,
    'dev-insecure-jwt-secret',
    mustRequireProd,
  ),
  internalApiToken: requiredWhenOrDefault(
    'INTERNAL_API_TOKEN',
    process.env.INTERNAL_API_TOKEN,
    'dev-insecure-internal-token',
    mustRequireProd,
  ),

  reloadlyClientId: requiredWhenOrDefault(
    'RELOADLY_CLIENT_ID',
    process.env.RELOADLY_CLIENT_ID,
    'sandbox-reloadly-client-id',
    mustRequireProd,
  ),
  reloadlyClientSecret: requiredWhenOrDefault(
    'RELOADLY_CLIENT_SECRET',
    process.env.RELOADLY_CLIENT_SECRET,
    'sandbox-reloadly-client-secret',
    mustRequireProd,
  ),
  reloadlyAuthBase:
    clean(process.env.RELOADLY_AUTH_BASE) ||
    'https://auth.reloadly.com',
  reloadlyTopupsBase:
    clean(process.env.RELOADLY_TOPUPS_BASE) ||
    'https://topups.reloadly.com',
  gamesdropApiKey: requiredWhenOrDefault(
    'GAMESDROP_API_KEY',
    process.env.GAMESDROP_API_KEY,
    'sandbox-gamesdrop-api-key',
    mustRequireProd,
  ),
  gamesdropApiBase:
    clean(process.env.GAMESDROP_API_BASE) ||
    'https://api.gamesdrop.com/v1',
  providerTimeoutMs: Number(clean(process.env.PROVIDER_TIMEOUT_MS || '15000')) || 15000,
  redisUrl: clean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || ''),
  redisTls: clean(process.env.REDIS_TLS || 'false').toLowerCase() === 'true',
  queueMode: clean(process.env.QUEUE_MODE || 'bullmq').toLowerCase(),
  rabbitmqUrl: clean(process.env.RABBITMQ_URL || ''),
  bullPrefix: clean(process.env.BULLMQ_PREFIX || 'joestore'),
  topupJobAttempts: Number(clean(process.env.TOPUP_JOB_ATTEMPTS || '3')) || 3,
  topupJobBackoffMs: Number(clean(process.env.TOPUP_JOB_BACKOFF_MS || '2000')) || 2000,

  fawaterkApiBase:
    clean(process.env.FAWATERK_API_BASE) ||
    'https://api.fawaterk.com/api/v2',
  fawaterkApiKey: requiredWhenOrDefault(
    'FAWATERK_API_KEY',
    process.env.FAWATERK_API_KEY,
    'sandbox-fawaterk-api-key',
    mustRequireProd,
  ),
  fawaterkSecretKey: requiredWhenOrDefault(
    'FAWATERK_SECRET_KEY or FAWATERK_SECRET',
    process.env.FAWATERK_SECRET_KEY || process.env.FAWATERK_SECRET,
    'sandbox-fawaterk-secret-key',
    mustRequireProd,
  ),
  fawaterkWebhookSecret: requiredWhenOrDefault(
    'FAWATERK_WEBHOOK_SECRET',
    process.env.FAWATERK_WEBHOOK_SECRET || process.env.FAWATERK_SECRET_KEY || process.env.FAWATERK_SECRET,
    'sandbox-fawaterk-webhook-secret',
    mustRequireProd,
  ),

  unipinApiKey: clean(process.env.UNIPIN_API_KEY || ''),
  unipinApiBase: clean(process.env.UNIPIN_API_BASE) || 'https://api.unipin.com/v1',

  seagmApiKey: clean(process.env.SEAGM_API_KEY || ''),
  seagmApiBase: clean(process.env.SEAGM_API_BASE) || 'https://api.seagm.com/v1',

  driffleApiKey: clean(process.env.DRIFFLE_API_KEY || ''),
  driffleApiBase: clean(process.env.DRIFFLE_API_BASE) || 'https://api.driffle.com/v1',

  geolocationApiBase: clean(process.env.GEOLOCATION_API_BASE || 'https://ipapi.co'),
  geolocationApiKey: clean(process.env.GEOLOCATION_API_KEY || ''),
  fraudMaxOrdersPerMinute: Number(clean(process.env.FRAUD_MAX_ORDERS_PER_MINUTE || '6')) || 6,
  fraudBlockRiskScore: Number(clean(process.env.FRAUD_BLOCK_RISK_SCORE || '80')) || 80,
  allowSyncTopupFallback: clean(process.env.ALLOW_SYNC_TOPUP_FALLBACK || '').toLowerCase()
    ? clean(process.env.ALLOW_SYNC_TOPUP_FALLBACK || '').toLowerCase() === 'true'
    : !isProduction,
  alertWebhookUrl: clean(process.env.ALERT_WEBHOOK_URL || ''),
};
