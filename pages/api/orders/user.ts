import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService } from '../../../src/lib/server/services/orders';
import { paginationSchema, parseQuery } from '../../../src/lib/server/validation';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const { page, limit } = parseQuery(req, paginationSchema);

  const orders = await ordersService.listUserOrders(user.id, page, limit);
  res.status(200).json(orders);
});
