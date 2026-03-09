import { gamesdropProvider } from '../../providers/gamesdrop';
import type { TopupRequestPayload, TopupResult } from '../../providers/reloadly';

export const gamesdropService = {
  async topup(payload: TopupRequestPayload): Promise<TopupResult> {
    return gamesdropProvider.createTopup(payload);
  },
};

