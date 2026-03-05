import { Queue } from 'bullmq';
import { env } from '../config/env.js';

export const orderQueue = new Queue('order-fulfillment', {
  connection: {
    url: env.redisUrl,
  },
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

export const enqueueOrderFulfillment = async (payload: {
  orderId: string;
  userId: string;
}) => {
  await orderQueue.add('fulfill-order', payload);
};

export const closeOrderQueue = async () => {
  await orderQueue.close();
};
