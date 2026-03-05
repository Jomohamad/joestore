import { Worker } from 'bullmq';
import { env } from '../config/env.js';

let worker: Worker | null = null;

export const startOrderWorker = () => {
  if (worker) return worker;

  worker = new Worker(
    'order-fulfillment',
    async (job) => {
      const { fulfillmentService } = await import('../services/fulfillmentService.js');
      await fulfillmentService.processOrder(job.data.orderId);
    },
    {
      connection: {
        url: env.redisUrl,
      },
      concurrency: 4,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[worker] completed job=${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[worker] failed job=${job?.id}`, error);
  });

  return worker;
};

export const stopOrderWorker = async () => {
  if (!worker) return;
  await worker.close();
  worker = null;
};
