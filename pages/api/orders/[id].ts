import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService } from '../../../src/lib/server/services/orders';
import { parseQuery, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const query = parseQuery(req, z.object({ id: trimmedString(1, 80) }).strip());
  const order = await ordersService.getOrder(String(query.id || ''));
  if (String(order.user_id) !== user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }

  res.status(200).json(order);
});
