import { env } from '../config/env.js';

export interface TopupRequestPayload {
  orderId: string;
  gameId: string;
  playerId: string;
  server?: string | null;
  packageName: string;
  quantity: number;
}

export interface TopupResult {
  providerRef: string;
  transactionId: string;
  rawStatus: 'completed' | 'failed' | 'processing';
  rawResponse?: unknown;
}

export const reloadlyAdapter = {
  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (env.sandboxMode) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return {
        providerRef: `reloadly-sandbox-${payload.orderId}`,
        transactionId: `RLD-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true },
      };
    }

    // Production integration placeholder: implement Reloadly product/order API mapping here.
    // Use env.reloadlyClientId and env.reloadlyClientSecret to obtain OAuth token.
    throw new Error('Reloadly live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },
};
