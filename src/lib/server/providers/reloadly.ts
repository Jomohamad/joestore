import { serverEnv } from '../env';

export interface TopupRequestPayload {
  orderId: string;
  gameId: string;
  playerId: string;
  server?: string | null;
  packageName: string;
  quantity: number;
  providerProductId?: string | null;
  amount?: number | null;
  currency?: string | null;
}

export interface TopupResult {
  providerRef: string;
  transactionId: string;
  rawStatus: 'completed' | 'failed' | 'processing';
  rawResponse?: unknown;
}

const pseudoPriceFromKey = (key: string, floor = 1) => {
  const normalized = String(key || '0');
  let sum = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    sum += normalized.charCodeAt(i);
  }
  return Number((floor + (sum % 100) / 10).toFixed(2));
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

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

const getReloadlyAccessToken = async () => {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 15_000) {
    return cachedAccessToken.token;
  }

  const response = await fetch(`${serverEnv.reloadlyAuthBase}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: serverEnv.reloadlyClientId,
      client_secret: serverEnv.reloadlyClientSecret,
      grant_type: 'client_credentials',
      audience: 'https://topups.reloadly.com',
    }),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(String(body?.message || body?.error_description || 'Reloadly token request failed'));
  }

  const expiresInSec = Number(body.expires_in || 300);
  cachedAccessToken = {
    token: String(body.access_token),
    expiresAt: Date.now() + Math.max(60, expiresInSec) * 1000,
  };

  return cachedAccessToken.token;
};

export const reloadlyProvider = {
  async getPrice(providerProductId: string, currency = 'EGP') {
    if (serverEnv.sandboxMode) {
      return {
        provider: 'reloadly',
        providerProductId,
        currency,
        price: pseudoPriceFromKey(providerProductId, 4),
        source: 'sandbox',
        rawResponse: { sandbox: true },
      };
    }

    const accessToken = await getReloadlyAccessToken();
    const operatorId = Number(providerProductId || 0);
    if (!Number.isFinite(operatorId) || operatorId <= 0) {
      throw new Error('Reloadly pricing requires numeric provider_product_id');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.providerTimeoutMs);

    try {
      const response = await fetch(`${serverEnv.reloadlyTopupsBase}/operators/${operatorId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/com.reloadly.topups-v1+json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        throw new Error(String(body?.message || body?.errorCode || 'Reloadly pricing request failed'));
      }

      const denomination = body?.suggestedAmountsMap;
      let price = 0;
      if (denomination && typeof denomination === 'object') {
        const keys = Object.keys(denomination);
        if (keys.length > 0) {
          const first = Number((denomination as Record<string, unknown>)[keys[0]]);
          if (Number.isFinite(first) && first > 0) {
            price = first;
          }
        }
      }

      if (!price) {
        price = pseudoPriceFromKey(providerProductId, 4);
      }

      return {
        provider: 'reloadly',
        providerProductId,
        currency,
        price: Number(price),
        source: 'api',
        rawResponse: body || {},
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (serverEnv.sandboxMode) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return {
        providerRef: `reloadly-sandbox-${payload.orderId}`,
        transactionId: `RLD-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true, provider: 'reloadly' },
      };
    }

    const operatorId = Number(payload.providerProductId || 0);
    if (!Number.isFinite(operatorId) || operatorId <= 0) {
      throw new Error('Reloadly requires a numeric provider_product_id mapped in products table');
    }

    const accessToken = await getReloadlyAccessToken();
    const amount = Number(payload.amount || payload.quantity || 1);
    const currency = String(payload.currency || 'EGP').toUpperCase();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.providerTimeoutMs);

    try {
      const response = await fetch(`${serverEnv.reloadlyTopupsBase}/topups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/com.reloadly.topups-v1+json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          operatorId,
          amount,
          useLocalAmount: false,
          customIdentifier: payload.orderId,
          recipientPhone: {
            countryCode: String(payload.server || 'EG').toUpperCase(),
            number: payload.playerId,
          },
          senderName: 'JOEStore',
          currencyCode: currency,
        }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        throw new Error(String(body?.message || body?.errorCode || 'Reloadly top-up request failed'));
      }

      const status = resolveTopupStatus(body?.status);
      const providerRef = String(
        body?.customIdentifier || body?.operatorTransactionId || body?.transactionId || body?.id || payload.orderId,
      );
      const transactionId = String(
        body?.transactionId || body?.operatorTransactionId || body?.id || `RLD-${payload.orderId.slice(0, 8).toUpperCase()}`,
      );

      return {
        providerRef,
        transactionId,
        rawStatus: status,
        rawResponse: body || {},
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
