import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from './createApp.js';
import { env } from '../config/env.js';
import { createSocketServer } from '../socket/index.js';
import { startOrderWorker, stopOrderWorker } from '../queue/orderWorker.js';
import { closeOrderQueue } from '../queue/orderQueue.js';

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

  const httpServer = createServer(app);
  createSocketServer(httpServer);
  startOrderWorker();

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
