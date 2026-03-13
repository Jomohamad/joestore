import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { paginationSchema, parseBody, parseQuery, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const query = parseQuery(
      req,
      paginationSchema.extend({
        search: trimmedString(0, 120).optional(),
        q: trimmedString(0, 120).optional(),
      }).strip(),
    );
    const search = String(query.search || query.q || '').trim();
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 100);
    const users = await ordersService.listAdminUsers(search, page, limit);
    return res.status(200).json(users);
  }

  if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') {
    const body = parseBody(
      req,
      z.object({
        userId: trimmedString(1, 80).optional(),
        user_id: trimmedString(1, 80).optional(),
        role: z.enum(['admin', 'user']),
      }).strip(),
    );
    const userId = String(body.userId || body.user_id || '').trim();
    const role = String(body.role || '').trim().toLowerCase();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    if (role !== 'admin' && role !== 'user') {
      throw new ApiError(400, 'role must be admin or user', 'VALIDATION_ERROR');
    }

    const user = await ordersService.updateAdminUserRole(userId, role as 'admin' | 'user');
    return res.status(200).json(user);
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'PUT', 'POST']);
});

