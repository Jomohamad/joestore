import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return methodNotAllowed(res, ['PATCH', 'POST']);
  }
  await requireAdminUser(req);

  const userId = String(req.body?.userId || req.body?.user_id || '').trim();
  if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');

  const blocked = req.body?.blocked !== false;
  const user = await ordersService.setUserBlocked(userId, blocked);
  res.status(200).json(user);
});
