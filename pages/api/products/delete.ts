import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') return methodNotAllowed(res, ['DELETE', 'POST']);
  await enforceRateLimit(req, { key: 'products:delete', windowMs: 60_000, max: 40 });
  await requireAdminUser(req);

  const id = String(req.body?.id || req.body?.product_id || req.query.id || '').trim();
  if (!id) throw new ApiError(400, 'Product id is required', 'VALIDATION_ERROR');

  const deleted = await ordersService.deleteAdminProduct(id);
  if (!deleted) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  res.status(200).json({ success: true, id });
});

