import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await enforceRateLimit(req, { key: 'orders:list', windowMs: 60_000, max: 80 });

  const scope = String(req.query.scope || '').trim().toLowerCase();
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  if (scope === 'admin' || scope === 'all') {
    await requireAdminUser(req);
    const search = String(req.query.search || req.query.q || '').trim();
    const rows = await ordersService.listAdminOrders(search, page, Math.min(limit, 100));
    return res.status(200).json(rows);
  }

  const { user } = await requireAuthUser(req);
  const rows = await ordersService.listUserOrders(user.id, page, Math.min(limit, 100));
  return res.status(200).json(rows);
});

