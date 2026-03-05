import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { fulfillmentService } from '../services/fulfillmentService.js';

export const shippingRoutes = Router();

shippingRoutes.use(authMiddleware);

shippingRoutes.post(
  '/reloadly',
  asyncHandler(async (req, res) => {
    const order = await fulfillmentService.processOrder(String(req.body?.orderId || ''));
    res.json({ success: true, orderId: order.id, status: order.status });
  }),
);

shippingRoutes.post(
  '/gamesdrop',
  asyncHandler(async (req, res) => {
    const order = await fulfillmentService.processOrder(String(req.body?.orderId || ''));
    res.json({ success: true, orderId: order.id, status: order.status });
  }),
);
