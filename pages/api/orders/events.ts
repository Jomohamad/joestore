import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const orderId = String(req.query.orderId || req.query.order_id || '').trim();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

  const { user } = await requireAuthUser(req);
  const order = await ordersService.getOrder(orderId);
  if (String(order.user_id || '') !== user.id) {
    await requireAdminUser(req);
  }

  const events = await ordersService.listOrderEvents(orderId);
  res.status(200).json(events);
});
