import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService, type CanonicalOrderStatus } from '../../../../src/lib/server/services/orders';

const STATUS_VALUES: CanonicalOrderStatus[] = ['pending', 'paid', 'processing', 'completed', 'failed'];

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'POST') return methodNotAllowed(res, ['PATCH', 'POST']);
  await requireAdminUser(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  const status = String(req.body?.status || '').trim().toLowerCase() as CanonicalOrderStatus;

  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');
  if (!STATUS_VALUES.includes(status)) {
    throw new ApiError(400, 'Invalid status value', 'VALIDATION_ERROR', { allowed: STATUS_VALUES });
  }

  const order = await ordersService.manualSetOrderStatus(orderId, status);
  res.status(200).json({ success: true, order });
});

