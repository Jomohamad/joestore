import { serverEnv } from '../env';
import { hmacSha256, safeEqual } from './crypto';

export const paymobPayment = {
  async initiate(orderId: string, amount: number) {
    if (serverEnv.sandboxMode) {
      const token = hmacSha256(serverEnv.paymobHmacSecret, `${orderId}:${amount}`);
      return {
        checkoutUrl: `${serverEnv.appBaseUrl}/payment/callback/paymob?order_id=${encodeURIComponent(orderId)}&token=${token}&amount=${amount}`,
        paymentReference: `PAYMOB-SANDBOX-${orderId.slice(0, 8)}`,
      };
    }

    throw new Error('Paymob live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },

  verify(payload: Record<string, unknown>) {
    const orderId = String(payload.order_id || payload.orderId || '');
    const amount = Number(payload.amount || 0);
    const token = String(payload.token || payload.hmac || '');

    if (!orderId || !Number.isFinite(amount) || amount <= 0 || !token) return false;

    const expected = hmacSha256(serverEnv.paymobHmacSecret, `${orderId}:${amount}`);
    return safeEqual(expected, token);
  },
};
