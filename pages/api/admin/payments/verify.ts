import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const paymentId = String(req.body?.paymentId || req.body?.payment_id || '').trim();
  if (!paymentId) throw new ApiError(400, 'paymentId is required', 'VALIDATION_ERROR');

  const payment = await ordersService.adminVerifyPayment(paymentId);
  res.status(200).json({ success: true, payment });
});
