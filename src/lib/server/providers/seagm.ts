import { serverEnv } from '../env';
import type { TopupRequestPayload, TopupResult } from './reloadly';

const statusFrom = (value: unknown): TopupResult['rawStatus'] => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('fail') || normalized.includes('error')) return 'failed';
  if (normalized.includes('pending') || normalized.includes('process')) return 'processing';
  return 'completed';
};

const pseudoPrice = (key: string) => {
  const normalized = String(key || '0');
  let sum = 0;
  for (let i = 0; i < normalized.length; i += 1) sum += normalized.charCodeAt(i);
  return Number((7 + (sum % 80) / 10).toFixed(2));
};

export const seagmProvider = {
  async getPrice(providerProductId: string, currency = 'EGP') {
    if (serverEnv.sandboxMode || !serverEnv.seagmApiKey) {
      return {
        provider: 'seagm',
        providerProductId,
        currency,
        price: pseudoPrice(providerProductId),
        source: 'sandbox',
        rawResponse: { sandbox: true },
      };
    }

    const response = await fetch(`${serverEnv.seagmApiBase}/products/${encodeURIComponent(providerProductId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${serverEnv.seagmApiKey}`,
      },
    });

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new Error(String(body?.message || 'SEAGM pricing request failed'));
    }

    const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
    const price = Number(data?.price || data?.amount || 0) || pseudoPrice(providerProductId);

    return {
      provider: 'seagm',
      providerProductId,
      currency,
      price,
      source: 'api',
      rawResponse: body || {},
    };
  },

  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (serverEnv.sandboxMode || !serverEnv.seagmApiKey) {
      return {
        providerRef: `seagm-sandbox-${payload.orderId}`,
        transactionId: `SEA-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true, provider: 'seagm' },
      };
    }

    const response = await fetch(`${serverEnv.seagmApiBase}/topups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${serverEnv.seagmApiKey}`,
      },
      body: JSON.stringify({
        order_id: payload.orderId,
        product_id: payload.providerProductId,
        player_id: payload.playerId,
        server: payload.server || null,
        amount: Number(payload.amount || 0),
        currency: String(payload.currency || 'EGP').toUpperCase(),
      }),
    });

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new Error(String(body?.message || 'SEAGM top-up request failed'));
    }

    const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
    return {
      providerRef: String(data?.reference || data?.order_id || payload.orderId),
      transactionId: String(data?.transaction_id || data?.id || `SEA-${payload.orderId.slice(0, 8).toUpperCase()}`),
      rawStatus: statusFrom(data?.status || body?.status),
      rawResponse: body || {},
    };
  },
};
