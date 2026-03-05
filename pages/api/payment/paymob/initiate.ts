import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAuthUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAuthUser(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'PAYMENT_BAD_REQUEST');

  const order = await ordersService.getOrder(orderId);
  const price = Number(order.price || 0);
  const paymentInit = await ordersService.initiatePayment({ orderId, provider: 'paymob', amount: price });

  res.status(200).json({ orderId, paymentInit, checkoutUrl: paymentInit.checkoutUrl });
});
