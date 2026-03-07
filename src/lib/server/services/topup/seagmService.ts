import { seagmProvider } from '../../providers/seagm';
import type { TopupRequestPayload, TopupResult } from '../../providers/reloadly';

export const seagmService = {
  async topup(payload: TopupRequestPayload): Promise<TopupResult> {
    return seagmProvider.createTopup(payload);
  },
};
