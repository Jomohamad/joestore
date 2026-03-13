import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { parseBody, parseQuery, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') return methodNotAllowed(res, ['DELETE', 'POST']);
  await enforceRateLimit(req, { key: 'products:delete', windowMs: 60_000, max: 40 });
  await requireAdminUser(req);

  const body = parseBody(
    req,
    z.object({
      id: trimmedString(1, 80).optional(),
      product_id: trimmedString(1, 80).optional(),
    }).strip(),
  );
  const query = parseQuery(req, z.object({ id: trimmedString(1, 80).optional() }).strip());
  const id = String(body.id || body.product_id || query.id || '').trim();
  if (!id) throw new ApiError(400, 'Product id is required', 'VALIDATION_ERROR');

  const deleted = await ordersService.deleteAdminProduct(id);
  if (!deleted) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  res.status(200).json({ success: true, id });
});

