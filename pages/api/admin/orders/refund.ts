import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

  const order = await ordersService.adminRefundOrder(orderId);
  res.status(200).json({ success: true, order });
});
