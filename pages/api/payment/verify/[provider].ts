import type { NextApiRequest, NextApiResponse } from 'next';
import paymobVerify from '../paymob/verify';
import fawryVerify from '../fawry/verify';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const provider = String(req.query.provider || '').trim().toLowerCase();
  if (provider === 'paymob') return paymobVerify(req, res);
  if (provider === 'fawry' || provider === 'fawrypay') return fawryVerify(req, res);

  throw new ApiError(400, 'Unknown payment provider', 'UNKNOWN_PROVIDER');
});
