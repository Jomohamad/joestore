import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const search = String(req.query.search || req.query.q || '').trim();
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 100);
    const users = await ordersService.listAdminUsers(search, page, limit);
    return res.status(200).json(users);
  }

  if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') {
    const userId = String(req.body?.userId || req.body?.user_id || '').trim();
    const role = String(req.body?.role || '').trim().toLowerCase();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    if (role !== 'admin' && role !== 'user') {
      throw new ApiError(400, 'role must be admin or user', 'VALIDATION_ERROR');
    }

    const user = await ordersService.updateAdminUserRole(userId, role as 'admin' | 'user');
    return res.status(200).json(user);
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'PUT', 'POST']);
});

