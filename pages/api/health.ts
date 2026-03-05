import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../src/lib/server/http';
import { supabaseAdmin } from '../../src/lib/server/supabaseAdmin';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { error } = await supabaseAdmin.from('games').select('count', { count: 'exact', head: true });
  if (error) throw error;

  res.status(200).json({ status: 'ok', database: 'connected' });
});
