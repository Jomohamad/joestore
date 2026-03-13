import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../../src/lib/server/httpCache';
import { ordersService } from '../../../src/lib/server/services/orders';
import { parseQuery, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const query = parseQuery(
    req,
    z.object({
      game_id: trimmedString(1, 120).optional(),
      gameId: trimmedString(1, 120).optional(),
    }).strip(),
  );
  const gameId = query.game_id ? String(query.game_id) : query.gameId ? String(query.gameId) : undefined;
  return respondWithPublicApiCache(req, res, {
    scope: 'public-products',
    ttlSeconds: 60,
    edge: { sMaxAge: 60, staleWhileRevalidate: 300 },
    loader: async () => ordersService.listPublicProducts(gameId),
  });
});
