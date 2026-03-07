import { Queue, type JobsOptions } from 'bullmq';
import { serverEnv } from '../env';
import { logsService } from '../services/logs';
import { getRedisConnectionForBull } from '../services/cache/redisClient';
import { publishRabbitMessage } from './rabbitMq';

export interface TopupQueuePayload {
  orderId: string;
  source: 'payment-webhook' | 'admin-retry' | 'manual' | 'system';
  requestedAt: string;
  retryCount?: number;
}

let queue: Queue | null = null;
let queueInitFailed = false;

const getTopupQueue = () => {
  if (queueInitFailed) return null;
  if (queue) return queue;

  const connection = getRedisConnectionForBull();
  if (!connection) return null;

  try {
    queue = new Queue('topup-request', {
      connection,
      prefix: serverEnv.bullPrefix,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    return queue;
  } catch {
    queueInitFailed = true;
    queue = null;
    return null;
  }
};

const publishEvent = async (name: string, payload: Record<string, unknown>) => {
  const rabbitPublished = await publishRabbitMessage(name, payload);
  await logsService.write('queue.publish', `Published ${name}`, {
    queue: name,
    rabbitmq: rabbitPublished,
    payload,
  });
};

export const enqueueTopupRequest = async (payload: TopupQueuePayload, options?: JobsOptions) => {
  const eventPayload = payload as unknown as Record<string, unknown>;
  await publishEvent('payment-confirmed', eventPayload);
  await publishEvent('topup-request', eventPayload);

  const q = getTopupQueue();
  if (!q) {
    await logsService.write('queue.fallback', 'BullMQ queue unavailable, fallback to sync handler', eventPayload);
    return { queued: false, jobId: null as string | null };
  }

  const job = await q.add('topup-request', payload, {
    attempts: serverEnv.topupJobAttempts,
    backoff: {
      type: 'exponential',
      delay: serverEnv.topupJobBackoffMs,
    },
    ...options,
  });

  return { queued: true, jobId: String(job.id || '') || null };
};

export const publishTopupResult = async (payload: Record<string, unknown>) => {
  await publishEvent('topup-result', payload);
};

export const processQueuedTopups = async (maxJobs = 1) => {
  const q = getTopupQueue();
  if (!q) return { processed: 0, queueAvailable: false };

  const count = Math.max(1, Math.min(20, Number(maxJobs || 1)));
  const jobs = await q.getJobs(['waiting', 'delayed'], 0, count - 1, true);
  let processed = 0;

  for (const job of jobs) {
    const data = (job.data || {}) as TopupQueuePayload;
    const orderId = String(data.orderId || '').trim();
    if (!orderId) {
      await job.remove();
      continue;
    }

    try {
      const { topupEngine } = await import('../services/topupEngine');
      const result = await topupEngine.processOrder(orderId, {
        source: String(data.source || 'system'),
      });

      await publishTopupResult({
        orderId,
        status: result.status,
        provider: result.provider,
      });

      await job.remove();
      processed += 1;
    } catch (error) {
      const currentRetry = Number(data.retryCount || 0);
      if (currentRetry + 1 >= serverEnv.topupJobAttempts) {
        await publishTopupResult({
          orderId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Topup processing failed',
        });
        await job.remove();
      } else {
        const delay = serverEnv.topupJobBackoffMs * Math.pow(2, currentRetry);
        await q.add(
          'topup-request',
          {
            ...data,
            retryCount: currentRetry + 1,
          },
          {
            delay,
            attempts: serverEnv.topupJobAttempts,
            backoff: {
              type: 'exponential',
              delay: serverEnv.topupJobBackoffMs,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        await job.remove();
      }
    }
  }

  return {
    processed,
    queueAvailable: true,
  };
};
