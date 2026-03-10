import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { auditService } from '../../../../src/lib/server/services/audit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  const refundMode = String(req.body?.refundMode || req.body?.refund_mode || 'gateway').trim().toLowerCase();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

  const auth = await requireAdminUser(req);
  const order = await ordersService.adminRefundOrder(orderId, {
    refundMode: refundMode === 'wallet' ? 'wallet' : 'gateway',
  });
  await auditService.log({
    actorUserId: auth.user.id,
    action: 'admin.order.refund',
    resourceType: 'order',
    resourceId: orderId,
    metadata: { refundMode },
  });
  res.status(200).json({ success: true, order });
});
