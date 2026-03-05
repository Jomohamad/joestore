import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req);
  const order = await ordersService.getOrder(String(req.query.id || ''));
  if (String(order.user_id) !== user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }

  res.status(200).json(order);
});
