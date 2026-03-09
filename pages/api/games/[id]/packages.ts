import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../../../src/lib/server/httpCache';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  return respondWithPublicApiCache(req, res, {
    scope: 'public-games-packages',
    ttlSeconds: 90,
    edge: { sMaxAge: 90, staleWhileRevalidate: 600 },
    loader: async () => {
      const { packages } = await ordersService.listPackagesForGame(String(req.query.id || ''));
      return packages;
    },
  });
});
