import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const rows = await ordersService.listAdminProviderHealth();
    return res.status(200).json(rows);
  }

  if (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT') {
    const body = parseBody(
      req,
      z.object({
        provider: trimmedString(1, 40),
        enabled: z.boolean().optional(),
        priority: z.coerce.number().int().min(0).max(9999).optional(),
      }).strip(),
    );
    const provider = String(body.provider || '').trim().toLowerCase();
    const enabled = body.enabled !== false;
    const priority = body.priority !== undefined ? Number(body.priority) : undefined;
    if (!provider) throw new ApiError(400, 'provider is required', 'VALIDATION_ERROR');

    const row = await ordersService.setProviderEnabled(provider, enabled, priority);
    return res.status(200).json(row);
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'POST', 'PUT']);
});
