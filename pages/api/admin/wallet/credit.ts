import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { walletService } from '../../../../src/lib/server/services/wallet';
import { currencySchema, parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const body = parseBody(
    req,
    z.object({
      userId: trimmedString(1, 80).optional(),
      user_id: trimmedString(1, 80).optional(),
      amount: z.coerce.number().positive().max(100000),
      currency: currencySchema.optional().default('EGP'),
      reason: trimmedString(1, 120).optional(),
    }).strip(),
  );
  const userId = String(body.userId || body.user_id || '').trim();
  const amount = Number(body.amount || 0);
  const currency = String(body.currency || 'EGP').trim().toUpperCase();
  const reason = String(body.reason || 'admin_credit').trim();

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
