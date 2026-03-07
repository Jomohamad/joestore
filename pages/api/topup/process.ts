import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser, requireInternalToken } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { enqueueTopupRequest, processQueuedTopups } from '../../../src/lib/server/queue/topupQueue';
import { ordersService } from '../../../src/lib/server/services/orders';

const authorize = async (req: NextApiRequest) => {
  try {
    requireInternalToken(req);
    return;
  } catch {
    await requireAdminUser(req);
  }
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'topup:process', windowMs: 60_000, max: 80 });
  await authorize(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  if (!orderId) {
    const limit = Math.max(1, Math.min(20, Number(req.body?.limit || req.query.limit || 1)));
    const queueResult = await processQueuedTopups(limit);
    return res.status(200).json({
      success: true,
      mode: 'queue-drain',
      ...queueResult,
    });
  }

  const order = await ordersService.getOrder(orderId);
  const status = String(order.status || '').toLowerCase();
  if (status !== 'paid' && status !== 'failed') {
    throw new ApiError(400, 'Order must be paid or failed to process top-up', 'ORDER_NOT_READY_FOR_TOPUP');
  }

  if (status === 'failed') {
    await ordersService.manualSetOrderStatus(orderId, 'paid');
  }

  const queued = await enqueueTopupRequest({
    orderId,
    source: 'manual',
    requestedAt: new Date().toISOString(),
  });

  if (!queued.queued) {
    const processed = await ordersService.processPaidOrder(orderId);
    return res.status(200).json({ success: true, queued: false, order: processed });
  }

  return res.status(200).json({
    success: true,
    queued: true,
    jobId: queued.jobId,
    orderId,
  });
});
