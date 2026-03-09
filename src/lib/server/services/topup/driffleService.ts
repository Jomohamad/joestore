import { driffleProvider } from '../../providers/driffle';
import type { TopupRequestPayload, TopupResult } from '../../providers/reloadly';

export const driffleService = {
  async topup(payload: TopupRequestPayload): Promise<TopupResult> {
    return driffleProvider.createTopup(payload);
  },
};
