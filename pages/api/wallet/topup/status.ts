import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAuthUser } from '../../../../src/lib/server/auth';
import { walletTopupService } from '../../../../src/lib/server/services/walletTopups';
import { parseQuery, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const { user } = await requireAuthUser(req, { requireVerified: true });

  const query = parseQuery(
    req,
    z.object({
      topupId: trimmedString(1, 80).optional(),
      topup_id: trimmedString(1, 80).optional(),
    }).strip(),
  );
  const topupId = String(query.topupId || query.topup_id || '').trim();
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
