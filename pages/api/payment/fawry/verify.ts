import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const order = await ordersService.verifyAndFulfill({ provider: 'fawry', payload: req.body || {} });
  res.status(200).json({ success: true, orderId: order.id, status: order.status });
});
