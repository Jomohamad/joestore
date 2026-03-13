import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../../../src/lib/server/httpCache';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseQuery, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const query = parseQuery(req, z.object({ id: trimmedString(1, 120) }).strip());
  return respondWithPublicApiCache(req, res, {
    scope: 'public-games-packages',
    ttlSeconds: 90,
    edge: { sMaxAge: 90, staleWhileRevalidate: 600 },
    loader: async () => {
      const { packages } = await ordersService.listPackagesForGame(String(query.id || ''));
      return packages;
    },
  });
});
