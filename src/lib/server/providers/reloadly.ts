import { serverEnv } from '../env';

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

export const reloadlyProvider = {
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

    throw new Error('Reloadly live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },
};
