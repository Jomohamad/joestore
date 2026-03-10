import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { walletService } from '../../../../src/lib/server/services/wallet';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const userId = String(req.body?.userId || req.body?.user_id || '').trim();
  const amount = Number(req.body?.amount || 0);
  const currency = String(req.body?.currency || 'EGP').trim().toUpperCase();
  const reason = String(req.body?.reason || 'admin_credit').trim();

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'userId and positive amount are required', 'VALIDATION_ERROR');
  }

  const result = await walletService.credit({
    userId,
    amount,
    currency,
    source: 'admin',
    referenceType: 'admin_credit',
    referenceId: reason || null,
    metadata: { reason },
  });

  res.status(200).json({ success: true, ...result });
});
