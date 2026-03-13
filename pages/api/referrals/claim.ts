import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { referralService } from '../../../src/lib/server/services/referrals';
import { parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const { user } = await requireAuthUser(req, { requireVerified: true });

  const body = parseBody(req, z.object({ code: trimmedString(1, 64) }).strip());
  const code = String(body.code || '').trim();
  if (!code) throw new ApiError(400, 'code is required', 'VALIDATION_ERROR');

  const result = await referralService.claimCode({ userId: user.id, code });
  res.status(200).json(result);
});
