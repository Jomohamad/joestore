import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { respondWithPublicApiCache } from '../../../src/lib/server/httpCache';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  return respondWithPublicApiCache(req, res, {
    scope: 'public-providers',
    ttlSeconds: 45,
    edge: { sMaxAge: 45, staleWhileRevalidate: 240 },
    loader: async () => {
      const rows = await ordersService.listAdminProviderHealth();
      return (rows as Array<Record<string, unknown>>).map((row) => ({
        provider: String(row.provider || '').toLowerCase(),
        enabled: row.enabled !== false,
        priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : null,
        success_count: Number(row.success_count || 0),
        failure_count: Number(row.failure_count || 0),
        last_response_ms: Number(row.last_response_ms || 0),
        updated_at: row.updated_at || null,
      }));
    },
  });
});

