import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { paginationSchema, parseQuery } from '../../../../src/lib/server/validation';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  await requireAdminUser(req);

  const { page, limit } = parseQuery(req, paginationSchema);
  const rows = await ordersService.listAdminProviderPrices(page, limit);
  res.status(200).json(rows);
});
