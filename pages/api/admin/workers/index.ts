import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const rows = await supabaseAdmin.from('worker_heartbeats').select('*').order('last_seen_at', { ascending: false });
  if (rows.error) throw rows.error;
  res.status(200).json(rows.data || []);
});
