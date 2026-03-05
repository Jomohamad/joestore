import { createServer } from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from './createApp.js';
import { env } from '../config/env.js';
import { createSocketServer } from '../socket/index.js';
import { startOrderWorker, stopOrderWorker } from '../queue/orderWorker.js';
import { closeOrderQueue } from '../queue/orderQueue.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

const canConnectRedis = async (redisUrl: string): Promise<boolean> => {
  try {
    const parsed = new URL(redisUrl);
    const host = parsed.hostname || '127.0.0.1';
    const port = Number(parsed.port || '6379');

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Redis connection timeout'));
      }, 1000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.end();
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    return true;
  } catch {
    return false;
  }
};

export const startServer = async () => {
  const app = createApp();

  if (env.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = createServer(app);
  createSocketServer(httpServer);

  const redisReachable = await canConnectRedis(env.redisUrl);
  if (redisReachable) {
    startOrderWorker();
  } else {
    console.warn(`[queue] Redis is unreachable at ${env.redisUrl}. Worker disabled; inline fulfillment fallback is active.`);
  }

  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    await stopOrderWorker();
    await closeOrderQueue();
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
