import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../src/lib/server/http';
import { supabaseAdmin } from '../../src/lib/server/supabaseAdmin';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { data, error } = await supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  res.status(200).json(data || []);
});
