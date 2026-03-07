import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const settings = await ordersService.listAdminSettings();
    return res.status(200).json(settings);
  }

  if (req.method === 'PUT' || req.method === 'POST' || req.method === 'PATCH') {
    const key = String(req.body?.key || '').trim();
    if (!key) throw new ApiError(400, 'key is required', 'VALIDATION_ERROR');

    const setting = await ordersService.upsertAdminSetting({
      key,
      value: req.body?.value ?? {},
      description: req.body?.description ? String(req.body.description) : null,
    });

    return res.status(200).json(setting);
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'POST', 'PATCH']);
});
