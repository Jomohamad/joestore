import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit, getClientIp } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { fraudService } from '../../../src/lib/server/services/fraud';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'orders:create', windowMs: 60_000, max: 30 });

  const { user } = await requireAuthUser(req);

  const gameIdentifier = String(req.body?.game_id || req.body?.game_slug || req.body?.gameId || '').trim();
  const packageId = req.body?.package_id ?? req.body?.packageId ?? null;
  const packageName = String(req.body?.package || req.body?.packageName || '').trim() || null;
  const playerId = String(req.body?.player_id || req.body?.playerId || req.body?.accountIdentifier || '').trim();
  const server = String(req.body?.server || '').trim() || null;
  const quantity = Number(req.body?.quantity || 1);
  const paymentMethod = String(req.body?.paymentMethod || req.body?.payment_method || 'fawaterk').trim().toLowerCase();

  if (!gameIdentifier || !playerId) {
    throw new ApiError(400, 'game and player_id are required', 'INVALID_ORDER_PAYLOAD');
  }
  if (paymentMethod !== 'fawaterk') {
    throw new ApiError(400, 'Only fawaterk payment gateway is supported', 'UNSUPPORTED_PAYMENT_METHOD');
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
    packageId: packageId !== null && packageId !== undefined ? Number(packageId) : null,
    packageName,
    playerId,
    server,
    quantity,
    legacyAmount: Number(req.body?.amount || 0),
    ipAddress,
    country: fraudCheck.country,
    fraudRiskScore: fraudCheck.riskScore,
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

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    paymentInit,
    checkoutUrl: paymentInit.checkoutUrl,
    paymentReference: paymentInit.paymentReference,
  });
});
