import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 100);
  const rows = await ordersService.listAdminTransactions(page, limit);
  res.status(200).json(rows);
});

