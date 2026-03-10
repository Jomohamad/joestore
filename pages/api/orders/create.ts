import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit, getClientIp } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { enqueueTopupRequest } from '../../../src/lib/server/queue/topupQueue';
import { serverEnv } from '../../../src/lib/server/env';
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
  const couponCode = String(req.body?.couponCode || req.body?.coupon_code || '').trim() || null;

  if (!gameIdentifier || !playerId || !Number.isFinite(Number(packageId))) {
    throw new ApiError(400, 'game, player_id and package_id are required', 'INVALID_ORDER_PAYLOAD');
  }
  if (paymentMethod !== 'fawaterk' && paymentMethod !== 'wallet') {
    throw new ApiError(400, 'Unsupported payment method', 'UNSUPPORTED_PAYMENT_METHOD');
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

  if (paymentMethod === 'wallet') {
    const { walletService } = await import('../../../src/lib/server/services/wallet');
    await walletService.debit({
      userId: user.id,
      amount: price,
      currency: String(order.currency || 'EGP'),
      source: 'wallet',
      referenceType: 'order',
      referenceId: String(order.id),
      metadata: { orderId: order.id },
    });

    const paidOrder = await ordersService.setOrderStatus(String(order.id), 'paid', {
      payment_details: { ...((order.payment_details as Record<string, unknown>) || {}), wallet: true },
    });

    const queued = await enqueueTopupRequest({
      orderId: String(paidOrder.id),
      source: 'manual',
      requestedAt: new Date().toISOString(),
    });

    if (!queued.queued) {
      if (!serverEnv.allowSyncTopupFallback) {
        throw new ApiError(503, 'Topup queue unavailable', 'TOPUP_QUEUE_UNAVAILABLE');
      }
      const processed = await ordersService.processPaidOrder(String(paidOrder.id));
      return res.status(201).json({
        orderId: paidOrder.id,
        status: processed.status,
        paymentInit: null,
        checkoutUrl: null,
        paymentReference: null,
      });
    }

    return res.status(201).json({
      orderId: paidOrder.id,
      status: paidOrder.status,
      queued: true,
      paymentInit: null,
      checkoutUrl: null,
      paymentReference: null,
    });
  }

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
