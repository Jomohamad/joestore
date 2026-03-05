import { serverEnv } from '../env';
import type { TopupRequestPayload, TopupResult } from './reloadly';

export const gamesdropProvider = {
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

    throw new Error('GamesDrop live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },
};
