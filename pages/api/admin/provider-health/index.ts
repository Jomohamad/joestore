import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const rows = await ordersService.listAdminProviderHealth();
    return res.status(200).json(rows);
  }

  if (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT') {
    const provider = String(req.body?.provider || '').trim().toLowerCase();
    const enabled = req.body?.enabled !== false;
    const priority = req.body?.priority !== undefined ? Number(req.body.priority) : undefined;
    if (!provider) throw new ApiError(400, 'provider is required', 'VALIDATION_ERROR');

    const row = await ordersService.setProviderEnabled(provider, enabled, priority);
    return res.status(200).json(row);
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'POST', 'PUT']);
});
