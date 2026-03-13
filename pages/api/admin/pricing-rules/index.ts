import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { paginationSchema, parseBody, parseQuery, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const { page, limit } = parseQuery(req, paginationSchema);
    const rows = await ordersService.listAdminPricingRules(page, limit);
    res.status(200).json(rows);
    return;
  }

  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH']);
  }

  const body = parseBody(
    req,
    z.object({
      productId: trimmedString(1, 80).optional(),
      product_id: trimmedString(1, 80).optional(),
      marginPercent: z.coerce.number().min(0).max(1000).optional(),
      margin_percent: z.coerce.number().min(0).max(1000).optional(),
      minProfit: z.coerce.number().min(0).optional(),
      min_profit: z.coerce.number().min(0).optional(),
      maxProfit: z.coerce.number().min(0).optional(),
      max_profit: z.coerce.number().min(0).optional(),
    }).strip(),
  );
  const productId = String(body.productId || body.product_id || '').trim();
  const marginPercent = Number(body.marginPercent ?? body.margin_percent ?? 0);
  const minProfit = Number(body.minProfit ?? body.min_profit ?? 0);
  const maxProfit = Number(body.maxProfit ?? body.max_profit ?? 0);

  if (!productId) throw new ApiError(400, 'productId is required', 'VALIDATION_ERROR');

  const rule = await ordersService.upsertPricingRule({
    productId,
    marginPercent,
    minProfit,
    maxProfit,
  });

  res.status(200).json(rule);
});
