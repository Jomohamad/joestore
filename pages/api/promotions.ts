import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../src/lib/server/httpCache';
import { supabaseAdmin } from '../../src/lib/server/supabaseAdmin';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  return respondWithPublicApiCache(req, res, {
    scope: 'public-promotions',
    ttlSeconds: 120,
    edge: { sMaxAge: 120, staleWhileRevalidate: 600 },
    loader: async () => {
      const { data, error } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
});
