import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { ordersService, type PaymentProvider } from '../../../src/lib/server/services/orders';

const normalizePaymentProvider = (value: unknown): PaymentProvider => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'fawry' || v === 'fawrypay') return 'fawry';
  return 'paymob';
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { user } = await requireAuthUser(req);

  const gameIdentifier = String(req.body?.game_id || req.body?.game_slug || req.body?.gameId || '').trim();
  const packageId = req.body?.package_id ?? req.body?.packageId ?? null;
  const packageName = String(req.body?.package || req.body?.packageName || '').trim() || null;
  const playerId = String(req.body?.player_id || req.body?.playerId || req.body?.accountIdentifier || '').trim();
  const server = String(req.body?.server || '').trim() || null;
  const quantity = Number(req.body?.quantity || 1);
  const paymentProvider = normalizePaymentProvider(req.body?.payment_provider || req.body?.paymentProvider || req.body?.paymentMethod);

  if (!gameIdentifier || !playerId) {
    throw new ApiError(400, 'game and player_id are required', 'INVALID_ORDER_PAYLOAD');
  }

  const { order, price } = await ordersService.createOrder({
    userId: user.id,
    gameIdentifier,
    packageId: packageId !== null && packageId !== undefined ? Number(packageId) : null,
    packageName,
    playerId,
    server,
    quantity,
    paymentProvider,
    legacyAmount: Number(req.body?.amount || 0),
    paymentDetails: req.body?.paymentDetails && typeof req.body.paymentDetails === 'object' ? req.body.paymentDetails : {},
  });

  const paymentInit = await ordersService.initiatePayment({
    orderId: String(order.id),
    provider: paymentProvider,
    amount: price,
  });

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    paymentInit,
    checkoutUrl: paymentInit.checkoutUrl,
    paymentReference: paymentInit.paymentReference,
  });
});
