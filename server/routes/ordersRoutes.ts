import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { paymentService } from '../services/paymentService.js';
import { ordersService } from '../services/ordersService.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const ordersRoutes = Router();

ordersRoutes.use(authMiddleware);

const normalizePaymentMethod = (value: unknown): 'fawry' | 'wallet' | 'card' | 'paypal' => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'wallet' || raw === 'card' || raw === 'paypal' || raw === 'fawry' || raw === 'fawrypay') {
    return raw === 'fawrypay' ? 'fawry' : raw;
  }
  throw new HttpError(400, 'Invalid payment method', 'INVALID_PAYMENT_METHOD');
};

const buildPaymentPayload = (
  method: 'fawry' | 'wallet' | 'card' | 'paypal',
  details: Record<string, unknown>,
) => {
  if (method === 'fawry') {
    return {
      paymentProvider: 'fawrypay' as const,
      paymentDetails: {
        channel: 'fawry',
      },
    };
  }

  if (method === 'wallet') {
    const walletPhone = String(details.walletPhone || details.phone || '').trim();
    const walletProvider = String(details.walletProvider || details.provider || '').trim();
    if (!/^[0-9+][0-9\s-]{7,19}$/.test(walletPhone)) {
      throw new HttpError(400, 'Invalid wallet phone number', 'INVALID_WALLET_PHONE');
    }
    return {
      paymentProvider: 'paymob' as const,
      paymentDetails: {
        walletPhone,
        walletProvider: walletProvider || null,
      },
    };
  }

  if (method === 'paypal') {
    const paypalId = String(details.paypalId || details.accountId || '').trim();
    if (!paypalId || paypalId.length < 3) {
      throw new HttpError(400, 'Invalid PayPal account ID', 'INVALID_PAYPAL_ID');
    }
    return {
      paymentProvider: 'paymob' as const,
      paymentDetails: {
        paypalId,
      },
    };
  }

  const cardHolder = String(details.cardHolder || details.nameOnCard || '').trim();
  const expiry = String(details.expiry || '').trim();
  const cardNumberRaw = String(details.cardNumber || '').trim().replace(/\D/g, '');
  if (!cardHolder) {
    throw new HttpError(400, 'Card holder is required', 'INVALID_CARD_HOLDER');
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    throw new HttpError(400, 'Card expiry must be MM/YY', 'INVALID_CARD_EXPIRY');
  }
  if (cardNumberRaw.length < 12 || cardNumberRaw.length > 19) {
    throw new HttpError(400, 'Invalid card number', 'INVALID_CARD_NUMBER');
  }

  const last4 = cardNumberRaw.slice(-4);
  const maskedCard = `**** **** **** ${last4}`;

  return {
    paymentProvider: 'paymob' as const,
    paymentDetails: {
      cardHolder,
      expiry,
      cardNumberMasked: maskedCard,
      last4,
    },
  };
};

ordersRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.authUser?.id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const gameId = String(req.body?.game_id || req.body?.gameId || '').trim();
    const packageIdRaw = req.body?.package_id ?? req.body?.packageId ?? null;
    const packageId = packageIdRaw !== null && packageIdRaw !== undefined ? Number(packageIdRaw) : null;
    const packageName = String(req.body?.package || req.body?.packageName || '').trim() || null;
    const accountIdentifier = String(req.body?.player_id || req.body?.playerId || req.body?.accountIdentifier || '')
      .trim();
    const server = String(req.body?.server || '').trim() || null;
    const quantity = Number(req.body?.quantity || 1);
    const paymentMethod = normalizePaymentMethod(
      req.body?.paymentMethod || req.body?.payment_method || req.body?.paymentProvider || req.body?.payment_provider,
    );
    const paymentDetailsInput =
      req.body?.paymentDetails && typeof req.body.paymentDetails === 'object'
        ? (req.body.paymentDetails as Record<string, unknown>)
        : {};
    const paymentPayload = buildPaymentPayload(paymentMethod, paymentDetailsInput);

    const { order, price } = await ordersService.createOrder({
      userId,
      gameId,
      packageId: Number.isInteger(packageId) && Number(packageId) > 0 ? Number(packageId) : null,
      packageName,
      accountIdentifier,
      server,
      quantity,
      paymentProvider: paymentPayload.paymentProvider,
      paymentMethod,
      paymentDetails: paymentPayload.paymentDetails,
    });

    const checkout = await paymentService.createPaymentCheckout({
      orderId: order.id,
      price,
      paymentProvider: paymentPayload.paymentProvider,
    });

    res.status(201).json({
      orderId: order.id,
      checkoutUrl: checkout.checkoutUrl,
      paymentReference: checkout.paymentReference,
      status: order.status,
    });
  }),
);

ordersRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.authUser?.id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const data = await ordersService.listUserOrders(userId, page, limit);
    res.json(data);
  }),
);

ordersRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.authUser?.id;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const order = await ordersService.getOrderById(req.params.id);
    if (String(order.user_id) !== userId) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    res.json(order);
  }),
);
