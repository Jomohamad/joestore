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
  return Number((8 + (sum % 70) / 10).toFixed(2));
};

export const driffleProvider = {
  async getPrice(providerProductId: string, currency = 'EGP') {
    if (serverEnv.sandboxMode || !serverEnv.driffleApiKey) {
      return {
        provider: 'driffle',
        providerProductId,
        currency,
        price: pseudoPrice(providerProductId),
        source: 'sandbox',
        rawResponse: { sandbox: true },
      };
    }

    const response = await fetch(`${serverEnv.driffleApiBase}/products/${encodeURIComponent(providerProductId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${serverEnv.driffleApiKey}`,
      },
    });

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new Error(String(body?.message || 'Driffle pricing request failed'));
    }

    const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
    const price = Number(data?.price || data?.amount || 0) || pseudoPrice(providerProductId);

    return {
      provider: 'driffle',
      providerProductId,
      currency,
      price,
      source: 'api',
      rawResponse: body || {},
    };
  },

  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (serverEnv.sandboxMode || !serverEnv.driffleApiKey) {
      return {
        providerRef: `driffle-sandbox-${payload.orderId}`,
        transactionId: `DRF-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true, provider: 'driffle' },
      };
    }

    const response = await fetch(`${serverEnv.driffleApiBase}/topups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${serverEnv.driffleApiKey}`,
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
      throw new Error(String(body?.message || 'Driffle top-up request failed'));
    }

    const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
    return {
      providerRef: String(data?.reference || data?.order_id || payload.orderId),
      transactionId: String(data?.transaction_id || data?.id || `DRF-${payload.orderId.slice(0, 8).toUpperCase()}`),
      rawStatus: statusFrom(data?.status || body?.status),
      rawResponse: body || {},
    };
  },
};
