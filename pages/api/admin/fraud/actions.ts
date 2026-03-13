import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { logsService } from '../../../../src/lib/server/services/logs';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const body = parseBody(
    req,
    z.object({
      action: z.enum(['block_user', 'flag_order', 'reduce_risk']),
      userId: trimmedString(1, 80).optional(),
      user_id: trimmedString(1, 80).optional(),
      orderId: trimmedString(1, 80).optional(),
      order_id: trimmedString(1, 80).optional(),
      riskDelta: z.coerce.number().optional(),
      risk_delta: z.coerce.number().optional(),
    }).strip(),
  );
  const action = String(body.action || '').trim().toLowerCase();

  if (action === 'block_user') {
    const userId = String(body.userId || body.user_id || '').trim();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    const user = await ordersService.setUserBlocked(userId, true);
    await logsService.write('admin.fraud.block_user', 'Admin blocked user via fraud panel', { userId });
    return res.status(200).json({ success: true, user });
  }

  if (action === 'flag_order') {
    const orderId = String(body.orderId || body.order_id || '').trim();
    if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');
    const order = await ordersService.manualSetOrderStatus(orderId, 'failed');
    await logsService.write('admin.fraud.flag_order', 'Admin flagged order via fraud panel', { orderId });
    return res.status(200).json({ success: true, order });
  }

  if (action === 'reduce_risk') {
    const userId = String(body.userId || body.user_id || '').trim();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    const deltaRaw = Number(body.riskDelta ?? body.risk_delta ?? -10);
    const delta = deltaRaw > 0 ? -deltaRaw : deltaRaw;
    const user = await ordersService.adjustUserFraudRisk(userId, delta);
    await logsService.write('admin.fraud.reduce_risk', 'Admin reduced fraud risk', { userId, delta });
    return res.status(200).json({ success: true, user });
  }

  throw new ApiError(400, 'Unsupported action', 'VALIDATION_ERROR');
});
