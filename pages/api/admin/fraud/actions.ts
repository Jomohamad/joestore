import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { logsService } from '../../../../src/lib/server/services/logs';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const action = String(req.body?.action || '').trim().toLowerCase();

  if (action === 'block_user') {
    const userId = String(req.body?.userId || req.body?.user_id || '').trim();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    const user = await ordersService.setUserBlocked(userId, true);
    await logsService.write('admin.fraud.block_user', 'Admin blocked user via fraud panel', { userId });
    return res.status(200).json({ success: true, user });
  }

  if (action === 'flag_order') {
    const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
    if (!orderId) throw new ApiError(400, 'orderId is required', 'VALIDATION_ERROR');
    const order = await ordersService.manualSetOrderStatus(orderId, 'failed');
    await logsService.write('admin.fraud.flag_order', 'Admin flagged order via fraud panel', { orderId });
    return res.status(200).json({ success: true, order });
  }

  if (action === 'reduce_risk') {
    const userId = String(req.body?.userId || req.body?.user_id || '').trim();
    if (!userId) throw new ApiError(400, 'userId is required', 'VALIDATION_ERROR');
    const deltaRaw = Number(req.body?.riskDelta ?? req.body?.risk_delta ?? -10);
    const delta = deltaRaw > 0 ? -deltaRaw : deltaRaw;
    const user = await ordersService.adjustUserFraudRisk(userId, delta);
    await logsService.write('admin.fraud.reduce_risk', 'Admin reduced fraud risk', { userId, delta });
    return res.status(200).json({ success: true, user });
  }

  throw new ApiError(400, 'Unsupported action', 'VALIDATION_ERROR');
});
