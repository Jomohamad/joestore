import { env } from '../config/env.js';
import { hmacSha256, safeEqual } from '../utils/crypto.js';

const baseUrl = env.appBaseUrl || `http://localhost:${env.port}`;

export const paymobAdapter = {
  async createCheckout(orderId: string, amount: number) {
    if (env.sandboxMode) {
      const token = hmacSha256(env.paymobHmacSecret, `${orderId}:${amount}`);
      return {
        checkoutUrl: `${baseUrl}/payment/callback/paymob?order_id=${encodeURIComponent(orderId)}&token=${token}&amount=${amount}`,
        paymentReference: `PAYMOB-SANDBOX-${orderId.slice(0, 8)}`,
      };
    }

    // Production integration placeholder.
    throw new Error('Paymob live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },

  verifySignature(payload: Record<string, unknown>) {
    const orderId = String(payload.order_id || '');
    const amount = Number(payload.amount || 0);
    const token = String(payload.token || payload.hmac || '');
    if (!orderId || !Number.isFinite(amount) || amount <= 0 || !token) {
      return false;
    }
    const expected = hmacSha256(env.paymobHmacSecret, `${orderId}:${amount}`);
    return safeEqual(expected, token);
  },
};
