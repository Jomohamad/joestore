import { env } from '../config/env.js';
import type { TopupRequestPayload, TopupResult } from './reloadlyAdapter.js';

export const gamesdropAdapter = {
  async createTopup(payload: TopupRequestPayload): Promise<TopupResult> {
    if (env.sandboxMode) {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      return {
        providerRef: `gamesdrop-sandbox-${payload.orderId}`,
        transactionId: `GDS-${payload.orderId.slice(0, 8).toUpperCase()}`,
        rawStatus: 'completed',
        rawResponse: { sandbox: true },
      };
    }

    // Production integration placeholder: implement GamesDrop API request here.
    throw new Error('GamesDrop live integration is not implemented yet. Enable SANDBOX_MODE=true.');
  },
};
