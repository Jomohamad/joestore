import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { enforceRateLimit } from '../../../../src/lib/server/rateLimit';

const firstHeader = (value: string | string[] | undefined) => {
  if (!value) return '';
  return Array.isArray(value) ? String(value[0] || '') : String(value);
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const { provider } = req.query;

  await enforceRateLimit(req, { key: `payment:${provider}:verify`, windowMs: 60_000, max: 60 });

  const signature =
    firstHeader(req.headers[`x-${provider}-signature`]) ||
    firstHeader(req.headers['x-signature']) ||
    firstHeader(req.headers.signature);

  const order = await ordersService.verifyPaymentAndFulfill((req.body || {}) as Record<string, unknown>, {
    signature: signature || null,
    provider: provider ? String(provider) : undefined,
  });

  res.status(200).json({
    success: true,
    orderId: order.id,
    status: order.status,
  });
});
