import { reloadlyProvider, type TopupRequestPayload, type TopupResult } from '../../providers/reloadly';

export const reloadlyService = {
  async topup(payload: TopupRequestPayload): Promise<TopupResult> {
    return reloadlyProvider.createTopup(payload);
  },
};

