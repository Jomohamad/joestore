import { unipinProvider } from '../../providers/unipin';
import type { TopupRequestPayload, TopupResult } from '../../providers/reloadly';

export const unipinService = {
  async topup(payload: TopupRequestPayload): Promise<TopupResult> {
    return unipinProvider.createTopup(payload);
  },
};
