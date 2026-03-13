import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { auditService } from '../../../../src/lib/server/services/audit';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const auth = await requireAdminUser(req);
  const body = parseBody(
    req,
    z.object({
      orderId: trimmedString(1, 80).optional(),
      order_id: trimmedString(1, 80).optional(),
      refundMode: z.enum(['gateway', 'wallet']).optional(),
      refund_mode: z.enum(['gateway', 'wallet']).optional(),
    }).strip(),
  );
  const orderId = String(body.orderId || body.order_id || '').trim();
  const refundMode = String(body.refundMode || body.refund_mode || 'gateway').trim().toLowerCase();
  if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');

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
