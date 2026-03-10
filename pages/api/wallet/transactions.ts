import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { walletService } from '../../../src/lib/server/services/wallet';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req);
  const page = Number(req.query.page || 1);
  const limit = Math.min(100, Number(req.query.limit || 50));

  const rows = await walletService.listTransactions(user.id, page, limit);
  res.status(200).json(rows);
});
