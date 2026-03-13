import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAuthUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { enforceRateLimit } from '../../../../src/lib/server/rateLimit';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'payment:create', windowMs: 60_000, max: 30 });
  const { user } = await requireAuthUser(req, { requireVerified: true });
  const body = parseBody(req, z.object({
    orderId: trimmedString(1, 80).optional(),
    order_id: trimmedString(1, 80).optional(),
  }).strip());
  const orderId = String(body.orderId || body.order_id || '').trim();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'PAYMENT_BAD_REQUEST');

  const order = await ordersService.getOrder(orderId);
  if (String(order.user_id || '') !== user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }

  const amount = Number(order.price || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Invalid order amount', 'INVALID_ORDER_AMOUNT');
  }

  const paymentInit = await ordersService.initiatePayment({
    orderId,
    amount,
  });

  res.status(200).json({
    orderId,
    paymentInit,
    checkoutUrl: paymentInit.checkoutUrl,
  });
});
