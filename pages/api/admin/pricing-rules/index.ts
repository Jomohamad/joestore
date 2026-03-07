import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return methodNotAllowed(res, ['POST', 'PUT', 'PATCH']);
  }
  await requireAdminUser(req);

  const productId = String(req.body?.productId || req.body?.product_id || '').trim();
  const marginPercent = Number(req.body?.marginPercent ?? req.body?.margin_percent ?? 0);
  const minProfit = Number(req.body?.minProfit ?? req.body?.min_profit ?? 0);
  const maxProfit = Number(req.body?.maxProfit ?? req.body?.max_profit ?? 0);

  if (!productId) throw new ApiError(400, 'productId is required', 'VALIDATION_ERROR');

  const rule = await ordersService.upsertPricingRule({
    productId,
    marginPercent,
    minProfit,
    maxProfit,
  });

  res.status(200).json(rule);
});
