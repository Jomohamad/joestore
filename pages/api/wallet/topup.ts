import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { walletTopupService } from '../../../src/lib/server/services/walletTopups';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'wallet:topup', windowMs: 60_000, max: 15 });

  const { user } = await requireAuthUser(req);
  const amount = Number(req.body?.amount || 0);
  const currency = String(req.body?.currency || 'EGP').trim().toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be a positive number', 'WALLET_TOPUP_INVALID');
  }

  const session = await walletTopupService.createTopup({
    userId: user.id,
    amount,
    currency,
  });

  res.status(201).json(session);
});
