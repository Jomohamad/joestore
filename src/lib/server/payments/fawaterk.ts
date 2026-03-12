import { createHmac, timingSafeEqual } from 'crypto';
import { serverEnv } from '../env';

export interface FawaterkCreateSessionInput {
  orderId: string;
  amount: number;
  customerEmail?: string | null;
  customerName?: string | null;
  currency?: string;
}

export interface FawaterkCreateSessionResult {
  checkoutUrl: string;
  paymentReference: string;
  transactionId: string;
  rawResponse?: unknown;
}

export interface FawaterkVerifyOptions {
  signature?: string | null;
  rawBody?: string | Buffer | null;
  provider?: string;
}

const hash = (value: string) =>
  createHmac('sha256', serverEnv.fawaterkWebhookSecret)
    .update(value)
    .digest('hex');

const signatureFor = (secret: string, value: string) =>
  createHmac('sha256', secret)
    .update(value)
    .digest('hex');

const safeEqual = (a: string, b: string) => {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
};

const getPayloadOrderId = (payload: Record<string, unknown>) => {
  const direct = String(payload.order_id || payload.orderId || payload.merchant_order_id || '').trim();
  if (direct) return direct;

  const meta = payload.metadata;
  if (meta && typeof meta === 'object') {
    const fromMeta = String((meta as Record<string, unknown>).order_id || (meta as Record<string, unknown>).orderId || '').trim();
    if (fromMeta) return fromMeta;
  }

  return '';
};

const getPayloadAmount = (payload: Record<string, unknown>) => {
  const direct = Number(payload.amount || payload.total || payload.order_amount || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const data = payload.data;
  if (data && typeof data === 'object') {
    const nested = Number((data as Record<string, unknown>).amount || (data as Record<string, unknown>).total || 0);
    if (Number.isFinite(nested) && nested > 0) return nested;
  }

  return 0;
};

const getPayloadTransactionId = (payload: Record<string, unknown>) => {
  return String(
    payload.transaction_id ||
      payload.transactionId ||
      payload.payment_id ||
      payload.reference ||
      payload.id ||
      payload.txn_id ||
      '',
  ).trim();
};

const getPayloadStatus = (payload: Record<string, unknown>) => {
  const status = String(payload.status || payload.payment_status || payload.order_status || '').trim().toLowerCase();
  if (!status) return 'unknown';
  return status;
};

const mapPaymentStatus = (status: string) => {
  return status.includes('paid') || status.includes('success') || status.includes('completed')
    ? ('paid' as const)
    : ('failed' as const);
};

export const fawaterkPayment = {
  async createSession(input: FawaterkCreateSessionInput): Promise<FawaterkCreateSessionResult> {
    if (serverEnv.sandboxMode) {
      const token = hash(`${input.orderId}:${Number(input.amount).toFixed(2)}`);
      const checkoutUrl = `${serverEnv.appBaseUrl}/payment/callback/fawaterk?order_id=${encodeURIComponent(
        input.orderId,
      )}&amount=${encodeURIComponent(input.amount)}&token=${encodeURIComponent(token)}&status=paid`;
      const reference = `FAWATERK-SANDBOX-${input.orderId.slice(0, 8)}`;
      return {
        checkoutUrl,
        paymentReference: reference,
        transactionId: reference,
        rawResponse: { sandbox: true, provider: 'fawaterk' },
      };
    }

    const callbackUrl = `${serverEnv.appBaseUrl}/payment/callback/fawaterk`;
    const webhookUrl = `${serverEnv.appBaseUrl}/api/payment/fawaterk/webhook`;

    const payload = {
      amount: Number(input.amount),
      currency: input.currency || 'EGP',
      order_id: input.orderId,
      customer: {
        email: input.customerEmail || 'customer@joestore.app',
        name: input.customerName || 'JOEStore Customer',
      },
      callback_url: callbackUrl,
      webhook_url: webhookUrl,
      metadata: {
        order_id: input.orderId,
      },
    };

    const response = await fetch(`${serverEnv.fawaterkApiBase}/invoice_init_payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serverEnv.fawaterkApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String((body as Record<string, unknown>).message || 'Fawaterk payment session creation failed'));
    }

    const bodyObj = body as Record<string, unknown>;
    const checkoutUrl = String(
      bodyObj.checkout_url ||
        (bodyObj.data && typeof bodyObj.data === 'object' ? (bodyObj.data as Record<string, unknown>).payment_url : '') ||
        '',
    );

    if (!checkoutUrl) {
      throw new Error('Fawaterk response missing checkout URL');
    }

    const transactionId = String(
      bodyObj.transaction_id ||
        bodyObj.reference ||
        (bodyObj.data && typeof bodyObj.data === 'object'
          ? (bodyObj.data as Record<string, unknown>).transaction_id || (bodyObj.data as Record<string, unknown>).id
          : '') ||
        `fawaterk-${input.orderId}`,
    );

    return {
      checkoutUrl,
      paymentReference: transactionId,
      transactionId,
      rawResponse: body,
    };
  },

  verifyPayload(payload: Record<string, unknown>, options?: FawaterkVerifyOptions) {
    const orderId = getPayloadOrderId(payload);
    const amount = getPayloadAmount(payload);
    const transactionId = getPayloadTransactionId(payload);
    const status = getPayloadStatus(payload);

    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      return { valid: false, reason: 'Invalid payload', orderId: '', amount: 0, transactionId: '', status: 'failed' as const };
    }

    if (serverEnv.sandboxMode) {
      const token = String(payload.token || options?.signature || payload.signature || '').trim();
      if (!token) {
        return { valid: false, reason: 'Missing sandbox token', orderId, amount, transactionId, status: 'failed' as const };
      }
      const expected = hash(`${orderId}:${Number(amount).toFixed(2)}`);
      const valid = safeEqual(token, expected);
      return {
        valid,
        reason: valid ? '' : 'Invalid sandbox token',
        orderId,
        amount,
        transactionId: transactionId || `fawaterk-sandbox-${orderId}`,
        status: mapPaymentStatus(status),
      };
    }

    const headerSignature = String(options?.signature || payload.signature || payload.hmac || payload.hash || '').trim();
    if (!headerSignature) {
      return { valid: false, reason: 'Missing signature', orderId, amount, transactionId, status: 'failed' as const };
    }

    const material = `${orderId}:${Number(amount).toFixed(2)}:${transactionId}`;
    const candidates = [
      signatureFor(serverEnv.fawaterkSecretKey, material),
      signatureFor(serverEnv.fawaterkWebhookSecret, material),
    ];

    const rawBodyText =
      typeof options?.rawBody === 'string'
        ? options.rawBody
        : Buffer.isBuffer(options?.rawBody)
          ? options.rawBody.toString('utf8')
          : '';

    if (rawBodyText) {
      candidates.push(signatureFor(serverEnv.fawaterkWebhookSecret, rawBodyText));
      candidates.push(signatureFor(serverEnv.fawaterkSecretKey, rawBodyText));
    }

    const valid = candidates.some((candidate) => safeEqual(headerSignature, candidate));

    return {
      valid,
      reason: valid ? '' : 'Invalid signature',
      orderId,
      amount,
      transactionId,
      status: mapPaymentStatus(status),
    };
  },
};
