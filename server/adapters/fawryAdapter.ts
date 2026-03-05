import { env } from '../config/env.js';
import { hmacSha256, safeEqual } from '../utils/crypto.js';

const baseUrl = env.appBaseUrl || `http://localhost:${env.port}`;

export const fawryAdapter = {
  async createCheckout(orderId: string, amount: number) {
    if (env.sandboxMode) {
      const token = hmacSha256(env.fawrypayHmacSecret, `${orderId}:${amount}`);
      return {
        checkoutUrl: `${baseUrl}/payment/callback/fawry?order_id=${encodeURIComponent(orderId)}&token=${token}&amount=${amount}`,
        paymentReference: `FAWRY-SANDBOX-${orderId.slice(0, 8)}`,
      };
    }

    // Production integration placeholder.
    throw new Error('FawryPay live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },

  verifySignature(payload: Record<string, unknown>) {
    const orderId = String(payload.order_id || '');
    const amount = Number(payload.amount || 0);
    const token = String(payload.token || payload.signature || '');
    if (!orderId || !Number.isFinite(amount) || amount <= 0 || !token) {
      return false;
    }
    const expected = hmacSha256(env.fawrypayHmacSecret, `${orderId}:${amount}`);
    return safeEqual(expected, token);
  },
};
