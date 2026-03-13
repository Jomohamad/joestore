import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { paginationSchema, parseQuery, trimmedString } from '../../../../src/lib/server/validation';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const query = parseQuery(
    req,
    paginationSchema.extend({
      search: trimmedString(0, 120).optional(),
      q: trimmedString(0, 120).optional(),
    }).strip(),
  );
  const search = String(query.search || query.q || '').trim();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 50);

  const orders = await ordersService.listAdminOrders(search, page, limit);
  res.status(200).json(orders);
});
