import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAuthUser } from '../../../../src/lib/server/auth';
import { walletTopupService } from '../../../../src/lib/server/services/walletTopups';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const { user } = await requireAuthUser(req);

  const topupId = String(req.query.topupId || req.query.topup_id || '').trim();
  if (!topupId) throw new ApiError(400, 'topupId is required', 'VALIDATION_ERROR');

  const topup = await walletTopupService.getTopupStatus(topupId);
  if (String(topup.user_id || '') !== user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }

  res.status(200).json({
    topupId: topup.id,
    status: topup.status,
    amount: topup.amount,
    currency: topup.currency,
  });
});
