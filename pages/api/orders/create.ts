import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit, getClientIp } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { enqueueTopupRequest } from '../../../src/lib/server/queue/topupQueue';
import { serverEnv } from '../../../src/lib/server/env';
import { fraudService } from '../../../src/lib/server/services/fraud';
import { parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'orders:create', windowMs: 60_000, max: 30 });

  const { user } = await requireAuthUser(req, { requireVerified: true });

  const schema = z.object({
    game_id: trimmedString(1, 120).optional(),
    game_slug: trimmedString(1, 120).optional(),
    gameId: trimmedString(1, 120).optional(),
    package_id: z.coerce.number().int().positive().optional(),
    packageId: z.coerce.number().int().positive().optional(),
    package: trimmedString(1, 120).optional(),
    packageName: trimmedString(1, 120).optional(),
    player_id: trimmedString(1, 120).optional(),
    playerId: trimmedString(1, 120).optional(),
    accountIdentifier: trimmedString(1, 120).optional(),
    server: trimmedString(1, 120).optional(),
    quantity: z.coerce.number().int().min(1).max(20).default(1),
    paymentMethod: z.enum(['fawaterk', 'wallet']).optional(),
    payment_method: z.enum(['fawaterk', 'wallet']).optional(),
    couponCode: trimmedString(1, 64).optional(),
    coupon_code: trimmedString(1, 64).optional(),
    country: trimmedString(1, 8).optional(),
    amount: z.coerce.number().nonnegative().optional(),
    paymentDetails: z.record(z.unknown()).optional(),
  }).strip();
  const body = parseBody(req, schema);

  const gameIdentifier = String(body.game_id || body.game_slug || body.gameId || '').trim();
  const packageId = body.package_id ?? body.packageId ?? null;
  const packageName = String(body.package || body.packageName || '').trim() || null;
  const playerId = String(body.player_id || body.playerId || body.accountIdentifier || '').trim();
  const server = String(body.server || '').trim() || null;
  const quantity = Number(body.quantity || 1);
  const paymentMethod = String(body.paymentMethod || body.payment_method || 'fawaterk').trim().toLowerCase();
  const couponCode = String(body.couponCode || body.coupon_code || '').trim() || null;
  if (body.paymentDetails) {
    const serialized = JSON.stringify(body.paymentDetails);
    if (serialized.length > 5000) {
      throw new ApiError(400, 'paymentDetails payload is too large', 'INVALID_ORDER_PAYLOAD');
    }
  }

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
    amount: Number(body.amount || 0),
    paymentAmount: Number(body.amount || 0),
    paymentCountry: body.country ? String(body.country) : null,
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
      body.paymentDetails && typeof body.paymentDetails === 'object'
        ? {
            ...(body.paymentDetails as Record<string, unknown>),
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
