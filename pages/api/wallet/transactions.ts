import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { walletService } from '../../../src/lib/server/services/wallet';
import { paginationSchema, parseQuery } from '../../../src/lib/server/validation';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const { page, limit } = parseQuery(req, paginationSchema);

  const rows = await walletService.listTransactions(user.id, page, limit);
  res.status(200).json(rows);
});
