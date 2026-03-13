import { serverEnv } from '../env';

type RabbitChannel = {
  assertQueue: (name: string, options?: Record<string, unknown>) => Promise<unknown>;
  sendToQueue: (name: string, content: Buffer, options?: Record<string, unknown>) => boolean;
  close: () => Promise<void>;
};

type RabbitConnection = {
  createChannel: () => Promise<RabbitChannel>;
  close: () => Promise<void>;
};

let connection: RabbitConnection | null = null;
let channel: RabbitChannel | null = null;
let disabled = false;

const getChannel = async () => {
  if (disabled || !serverEnv.rabbitmqUrl) return null;
  if (channel) return channel;

  try {
    if (!connection) {
      const amqplib = await import('amqplib');
      connection = (await amqplib.connect(serverEnv.rabbitmqUrl)) as RabbitConnection;
    }

    channel = await connection.createChannel();
    return channel;
  } catch {
    disabled = true;
    channel = null;
    connection = null;
    return null;
  }
};

export const publishRabbitMessage = async (queueName: string, payload: Record<string, unknown>) => {
  const ch = await getChannel();
  if (!ch) return false;

  try {
    await ch.assertQueue(queueName, { durable: true });
    ch.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    return true;
  } catch {
    return false;
  }
};
