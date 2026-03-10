import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../src/lib/server/http';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const nodeEnv = String(process.env.NODE_ENV || 'development');
  const isProduction = nodeEnv === 'production';
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE',
    'FAWATERK_API_KEY',
    'FAWATERK_SECRET_KEY',
    'FAWATERK_WEBHOOK_SECRET',
    'INTERNAL_API_TOKEN',
    'JWT_SECRET',
  ];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (isProduction && missing.length > 0) {
    return res.status(500).json({ status: 'error', missing_env: missing });
  }

  const { supabaseAdmin } = await import('../../src/lib/server/supabaseAdmin');
  const { error } = await supabaseAdmin.from('games').select('count', { count: 'exact', head: true });
  if (error) throw error;

  res.status(200).json({ status: 'ok', database: 'connected', env: missing.length ? 'missing_nonprod' : 'ok' });
});
