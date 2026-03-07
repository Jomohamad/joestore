import { ApiError } from '../../http';
import type { TopupRequestPayload, TopupResult } from '../../providers/reloadly';
import { driffleService } from './driffleService';
import { gamesdropService } from './gamesdropService';
import { reloadlyService } from './reloadlyService';
import { seagmService } from './seagmService';
import { unipinService } from './unipinService';

export type TopupProvider = 'reloadly' | 'gamesdrop' | 'unipin' | 'seagm' | 'driffle';

export const topupManager = {
  async process(provider: TopupProvider, payload: TopupRequestPayload): Promise<TopupResult> {
    if (provider === 'driffle') {
      return driffleService.topup(payload);
    }

    if (provider === 'gamesdrop') {
      return gamesdropService.topup(payload);
    }

    if (provider === 'reloadly') {
      return reloadlyService.topup(payload);
    }

    if (provider === 'seagm') {
      return seagmService.topup(payload);
    }

    if (provider === 'unipin') {
      return unipinService.topup(payload);
    }

    throw new ApiError(400, 'Unsupported top-up provider', 'UNSUPPORTED_PROVIDER', { provider });
  },
};
