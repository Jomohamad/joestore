import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { walletService } from '../../../src/lib/server/services/wallet';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req);
  const wallet = await walletService.getWallet(user.id);
  res.status(200).json(wallet);
});
