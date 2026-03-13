import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { paginationSchema, parseQuery, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await enforceRateLimit(req, { key: 'orders:list', windowMs: 60_000, max: 80 });

  const query = parseQuery(
    req,
    paginationSchema.extend({
      scope: trimmedString(0, 20).optional(),
      search: trimmedString(0, 120).optional(),
      q: trimmedString(0, 120).optional(),
    }).strip(),
  );
  const scope = String(query.scope || '').trim().toLowerCase();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  if (scope === 'admin' || scope === 'all') {
    await requireAdminUser(req);
    const search = String(query.search || query.q || '').trim();
    const rows = await ordersService.listAdminOrders(search, page, Math.min(limit, 100));
    return res.status(200).json(rows);
  }

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const rows = await ordersService.listUserOrders(user.id, page, Math.min(limit, 100));
  return res.status(200).json(rows);
});

