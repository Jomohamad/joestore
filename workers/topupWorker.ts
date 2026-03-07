import { Worker } from 'bullmq';
import { getRedisConnectionForBull } from '../src/lib/server/services/cache/redisClient';
import { serverEnv } from '../src/lib/server/env';
import { topupEngine } from '../src/lib/server/services/topupEngine';
import { publishTopupResult } from '../src/lib/server/queue/topupQueue';

const boot = async () => {
  const connection = getRedisConnectionForBull();
  if (!connection) {
    // eslint-disable-next-line no-console
    console.error('Redis connection is required for topupWorker');
    return;
  }

  const worker = new Worker(
    'topup-request',
    async (job) => {
      const orderId = String((job.data as Record<string, unknown>)?.orderId || '').trim();
      if (!orderId) return;

      const result = await topupEngine.processOrder(orderId, {
        source: String((job.data as Record<string, unknown>)?.source || 'system'),
      });

      await publishTopupResult({
        orderId,
        status: result.status,
        provider: result.provider,
      });
    },
    {
      connection,
      prefix: serverEnv.bullPrefix,
      concurrency: 5,
    },
  );

  worker.on('failed', async (job, error) => {
    await publishTopupResult({
      orderId: String((job?.data as Record<string, unknown>)?.orderId || ''),
      status: 'failed',
      error: error?.message || 'worker failed',
    });
  });
};

void boot();
