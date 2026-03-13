import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';
import { parseQuery } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const query = parseQuery(req, z.object({ limit: z.coerce.number().int().min(1).max(500).optional() }).strip());
  const limit = Number(query.limit || 200);
  const rows = await supabaseAdmin.from('fraud_signals').select('*').order('created_at', { ascending: false }).limit(limit);
  if (rows.error) throw rows.error;
  res.status(200).json(rows.data || []);
});
