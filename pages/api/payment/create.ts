import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit, getClientIp } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { fraudService } from '../../../src/lib/server/services/fraud';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'payment:create:generic', windowMs: 60_000, max: 30 });
  const { user } = await requireAuthUser(req);

  const orderId = String(req.body?.orderId || req.body?.order_id || '').trim();
  if (orderId) {
    const order = await ordersService.getOrder(orderId);
    if (String(order.user_id || '') !== user.id) {
      throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
    }

    const amount = Number(order.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Invalid order amount', 'INVALID_ORDER_AMOUNT');
    }

    const paymentInit = await ordersService.initiatePayment({ orderId, amount });
    return res.status(200).json({
      orderId,
      paymentInit,
      checkoutUrl: paymentInit.checkoutUrl,
      paymentReference: paymentInit.paymentReference,
    });
  }

  const gameIdentifier = String(req.body?.game_id || req.body?.game_slug || req.body?.gameId || '').trim();
  const packageId = req.body?.package_id ?? req.body?.packageId ?? null;
  const packageName = String(req.body?.package || req.body?.packageName || '').trim() || null;
  const playerId = String(req.body?.player_id || req.body?.playerId || req.body?.accountIdentifier || '').trim();
  const server = String(req.body?.server || '').trim() || null;
  const quantity = Number(req.body?.quantity || 1);
  const couponCode = String(req.body?.couponCode || req.body?.coupon_code || '').trim() || null;

  if (!gameIdentifier || !playerId || !Number.isFinite(Number(packageId))) {
    throw new ApiError(400, 'game, player_id and package_id are required', 'INVALID_ORDER_PAYLOAD');
  }

  const ipAddress = getClientIp(req);
  const fraudCheck = await fraudService.assessOrder({
    userId: user.id,
    ipAddress,
    playerId,
    amount: Number(req.body?.amount || 0),
    paymentAmount: Number(req.body?.amount || 0),
    paymentCountry: req.body?.country ? String(req.body.country) : null,
  });

  if (fraudCheck.blocked) {
    throw new ApiError(403, 'Order blocked by fraud protection rules', 'ORDER_BLOCKED_FRAUD', {
      riskScore: fraudCheck.riskScore,
      reasons: fraudCheck.reasons,
    });
  }

  const { order, price } = await ordersService.createOrder({
    userId: user.id,
    gameIdentifier,
    packageId: Number(packageId),
    packageName,
    playerId,
    server,
    quantity,
    ipAddress,
    country: fraudCheck.country,
    fraudRiskScore: fraudCheck.riskScore,
    couponCode,
    paymentDetails:
      req.body?.paymentDetails && typeof req.body.paymentDetails === 'object'
        ? {
            ...(req.body.paymentDetails as Record<string, unknown>),
            fraud: {
              riskScore: fraudCheck.riskScore,
              reasons: fraudCheck.reasons,
              country: fraudCheck.country,
            },
          }
        : {
            fraud: {
              riskScore: fraudCheck.riskScore,
              reasons: fraudCheck.reasons,
              country: fraudCheck.country,
            },
          },
  });

  const paymentInit = await ordersService.initiatePayment({
    orderId: String(order.id),
    amount: price,
  });

  return res.status(201).json({
    orderId: order.id,
    status: order.status,
    paymentInit,
    checkoutUrl: paymentInit.checkoutUrl,
    paymentReference: paymentInit.paymentReference,
  });
});
