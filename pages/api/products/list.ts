import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../../src/lib/server/httpCache';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const gameId = req.query.game_id ? String(req.query.game_id) : req.query.gameId ? String(req.query.gameId) : undefined;
  return respondWithPublicApiCache(req, res, {
    scope: 'public-products',
    ttlSeconds: 60,
    edge: { sMaxAge: 60, staleWhileRevalidate: 300 },
    loader: async () => ordersService.listPublicProducts(gameId),
  });
});
