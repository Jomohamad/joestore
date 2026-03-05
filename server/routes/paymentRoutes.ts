import { Router } from 'express';
import { asyncHandler } from '../utils/http.js';
import { paymentService } from '../services/paymentService.js';

export const paymentRoutes = Router();

paymentRoutes.post(
  '/verify/paymob',
  asyncHandler(async (req, res) => {
    const order = await paymentService.verifyPayment({
      provider: 'paymob',
      payload: req.body || {},
    });
    res.json({ success: true, orderId: order.id, status: order.status });
  }),
);

paymentRoutes.post(
  '/verify/fawry',
  asyncHandler(async (req, res) => {
    const order = await paymentService.verifyPayment({
      provider: 'fawry',
      payload: req.body || {},
    });
    res.json({ success: true, orderId: order.id, status: order.status });
  }),
);
