import { Queue } from 'bullmq';
import { env } from '../config/env.js';

let orderQueue: Queue | null = null;

const getOrderQueue = () => {
  if (!orderQueue) {
    orderQueue = new Queue('order-fulfillment', {
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
  }

  return orderQueue;
};

export const enqueueOrderFulfillment = async (payload: {
  orderId: string;
  userId: string;
}) => {
  const queue = getOrderQueue();
  await queue.add('fulfill-order', payload);
};

export const closeOrderQueue = async () => {
  if (!orderQueue) return;
  await orderQueue.close();
  orderQueue = null;
};
