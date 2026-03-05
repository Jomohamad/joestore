import { fawryAdapter } from '../adapters/fawryAdapter.js';
import { paymobAdapter } from '../adapters/paymobAdapter.js';
import { enqueueOrderFulfillment } from '../queue/orderQueue.js';
import { emitOrderStatus } from '../socket/index.js';
import { HttpError } from '../utils/http.js';
import { ordersService } from './ordersService.js';

export const paymentService = {
  async createPaymentCheckout(params: {
    orderId: string;
    price: number;
    paymentProvider: 'paymob' | 'fawrypay';
  }) {
    if (params.paymentProvider === 'fawrypay') {
      return fawryAdapter.createCheckout(params.orderId, params.price);
    }

    return paymobAdapter.createCheckout(params.orderId, params.price);
  },

  async verifyPayment(params: {
    provider: 'paymob' | 'fawry';
    payload: Record<string, unknown>;
  }) {
    const provider = params.provider === 'fawry' ? 'fawrypay' : 'paymob';
    const payload = params.payload;

    const orderId = String(payload.order_id || payload.orderId || '');
    if (!orderId) {
      throw new HttpError(400, 'order_id is required', 'PAYMENT_VERIFY_BAD_REQUEST');
    }

    const order = await ordersService.getOrderById(orderId);

    const allowed =
      provider === 'paymob' ? paymobAdapter.verifySignature(payload) : fawryAdapter.verifySignature(payload);

    if (!allowed) {
      throw new HttpError(400, 'Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
    }

    if (String(order.payment_provider || order.payment_method || '').toLowerCase() !== provider) {
      throw new HttpError(400, 'Payment provider mismatch', 'PAYMENT_PROVIDER_MISMATCH');
    }

    const paymentRef = String(payload.txn_id || payload.transaction_id || payload.reference || `${provider}-${order.id}`);

    const updated = await ordersService.setOrderStatus(order.id, 'processing', {
      transaction_id: paymentRef,
    });

    emitOrderStatus(String(updated.user_id), {
      orderId: updated.id,
      status: 'processing',
      transactionId: updated.transaction_id || null,
      updatedAt: new Date().toISOString(),
      message: 'Payment verified. Processing order.',
    });

    await enqueueOrderFulfillment({
      orderId: updated.id,
      userId: String(updated.user_id),
    });

    return updated;
  },
};
