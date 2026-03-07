import { serverEnv } from '../env';
import type { TopupRequestPayload, TopupResult } from './reloadly';

const resolveTopupStatus = (value: unknown): TopupResult['rawStatus'] => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('fail') || normalized.includes('error') || normalized.includes('cancel')) {
    return 'failed';
  }
  if (normalized.includes('process') || normalized.includes('pend')) {
    return 'processing';
  }
  return 'completed';
};

const pseudoPriceFromKey = (key: string, floor = 1) => {
  const normalized = String(key || '0');
  let sum = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    sum += normalized.charCodeAt(i);
  }
  return Number((floor + (sum % 100) / 10).toFixed(2));
};

export const gamesdropProvider = {
  async getPrice(providerProductId: string, currency = 'EGP') {
    if (serverEnv.sandboxMode) {
      return {
        provider: 'gamesdrop',
        providerProductId,
        currency,
        price: pseudoPriceFromKey(providerProductId, 5),
        source: 'sandbox',
        rawResponse: { sandbox: true },
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.providerTimeoutMs);

    try {
      const response = await fetch(`${serverEnv.gamesdropApiBase}/products/${encodeURIComponent(providerProductId)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-api-key': serverEnv.gamesdropApiKey,
          Authorization: `Bearer ${serverEnv.gamesdropApiKey}`,
        },
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        throw new Error(String(body?.message || body?.error || 'GamesDrop pricing request failed'));
      }

      const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
      const price = Number(data?.price || data?.amount || 0) || pseudoPriceFromKey(providerProductId, 5);

      return {
        provider: 'gamesdrop',
        providerProductId,
        currency,
        price,
        source: 'api',
        rawResponse: body || {},
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (serverEnv.sandboxMode) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        providerRef: `gamesdrop-sandbox-${payload.orderId}`,
        transactionId: `GDS-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true, provider: 'gamesdrop' },
      };
    }

    if (!payload.providerProductId) {
      throw new Error('GamesDrop requires provider_product_id mapped in products table');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.providerTimeoutMs);

    try {
      const response = await fetch(`${serverEnv.gamesdropApiBase}/topups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': serverEnv.gamesdropApiKey,
          Authorization: `Bearer ${serverEnv.gamesdropApiKey}`,
        },
        body: JSON.stringify({
          order_id: payload.orderId,
          game_id: payload.gameId,
          product_id: payload.providerProductId,
          player_id: payload.playerId,
          server: payload.server || null,
          quantity: Number(payload.quantity || 1),
          amount: Number(payload.amount || 0),
          currency: String(payload.currency || 'EGP').toUpperCase(),
        }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        throw new Error(String(body?.message || body?.error || 'GamesDrop top-up request failed'));
      }

      const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body || {};
      const status = resolveTopupStatus(data?.status || body?.status);

      return {
        providerRef: String(data?.reference || data?.order_id || data?.id || payload.orderId),
        transactionId: String(data?.transaction_id || data?.id || `GDS-${payload.orderId.slice(0, 8).toUpperCase()}`),
        rawStatus: status,
        rawResponse: body || {},
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
