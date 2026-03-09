import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService, type CanonicalOrderStatus } from '../../../src/lib/server/services/orders';

const STATUS_VALUES: CanonicalOrderStatus[] = ['pending', 'paid', 'processing', 'completed', 'failed'];

const readOrderId = (req: NextApiRequest) => String(req.query.orderId || req.query.order_id || req.body?.orderId || req.body?.order_id || '').trim();

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'PATCH', 'POST']);
  }
  await enforceRateLimit(req, { key: 'orders:status', windowMs: 60_000, max: 100 });

  const orderId = readOrderId(req);
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

  if (req.method === 'GET') {
    const { user } = await requireAuthUser(req);
    const order = await ordersService.getOrder(orderId);
    if (String(order.user_id || '') !== user.id) {
      await requireAdminUser(req);
    }

    return res.status(200).json({
      orderId: order.id,
      status: order.status,
      provider: order.provider || null,
      transaction_id: order.transaction_id || null,
      updated_at: order.updated_at || order.created_at || null,
      order,
    });
  }

  await requireAdminUser(req);
  const status = String(req.body?.status || '').trim().toLowerCase() as CanonicalOrderStatus;
  if (!STATUS_VALUES.includes(status)) {
    throw new ApiError(400, 'Invalid status value', 'VALIDATION_ERROR', { allowed: STATUS_VALUES });
  }

  const order = await ordersService.manualSetOrderStatus(orderId, status);
  return res.status(200).json({ success: true, order });
});

