import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService } from '../../../src/lib/server/services/orders';
import { parseQuery, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const querySchema = z.object({
    orderId: trimmedString(1, 80).optional(),
    order_id: trimmedString(1, 80).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }).strip();
  const query = parseQuery(req, querySchema);
  const orderId = String(query.orderId || query.order_id || '').trim();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const order = await ordersService.getOrder(orderId);
  if (String(order.user_id || '') !== user.id) {
    await requireAdminUser(req);
  }

  const events = await ordersService.listOrderEvents(orderId, query.limit || 200);
  res.status(200).json(events);
});
