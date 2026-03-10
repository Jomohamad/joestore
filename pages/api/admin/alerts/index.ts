import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const limit = Math.min(500, Number(req.query.limit || 200));
  const rows = await supabaseAdmin.from('alerts_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (rows.error) throw rows.error;
  res.status(200).json(rows.data || []);
});
