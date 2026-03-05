import { serverEnv } from '../env';
import { hmacSha256, safeEqual } from './crypto';

export const fawryPayment = {
  async initiate(orderId: string, amount: number) {
    if (serverEnv.sandboxMode) {
      const token = hmacSha256(serverEnv.fawrypaySecret, `${orderId}:${amount}`);
      return {
        checkoutUrl: `${serverEnv.appBaseUrl}/payment/callback/fawry?order_id=${encodeURIComponent(orderId)}&token=${token}&amount=${amount}`,
        paymentReference: `FAWRY-SANDBOX-${orderId.slice(0, 8)}`,
      };
    }

    throw new Error('Fawry live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },

  verify(payload: Record<string, unknown>) {
    const orderId = String(payload.order_id || payload.orderId || '');
    const amount = Number(payload.amount || 0);
    const token = String(payload.token || payload.signature || '');

    if (!orderId || !Number.isFinite(amount) || amount <= 0 || !token) return false;

    const expected = hmacSha256(serverEnv.fawrypaySecret, `${orderId}:${amount}`);
    return safeEqual(expected, token);
  },
};
