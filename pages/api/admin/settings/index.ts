import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseBody, trimmedString, optionalNullableTrimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const settings = await ordersService.listAdminSettings();
    return res.status(200).json(settings);
  }

  if (req.method === 'PUT' || req.method === 'POST' || req.method === 'PATCH') {
    const body = parseBody(
      req,
      z.object({
        key: trimmedString(1, 120),
        value: z.unknown().optional(),
        description: optionalNullableTrimmedString(200),
      }).strip(),
    );
    const key = String(body.key || '').trim();
    if (!key) throw new ApiError(400, 'key is required', 'VALIDATION_ERROR');
    if (body.value) {
      const serialized = JSON.stringify(body.value);
      if (serialized.length > 8000) {
        throw new ApiError(400, 'value payload too large', 'VALIDATION_ERROR');
      }
    }

    const setting = await ordersService.upsertAdminSetting({
      key,
      value: body.value ?? {},
      description: body.description ? String(body.description) : null,
    });

    return res.status(200).json(setting);
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'POST', 'PATCH']);
});
