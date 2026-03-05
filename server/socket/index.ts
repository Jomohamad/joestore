import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { getUserFromAccessToken } from '../supabase.js';

let io: Server | null = null;

export const createSocketServer = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '');
      const cleaned = token.startsWith('Bearer ') ? token.slice('Bearer '.length).trim() : token.trim();
      if (!cleaned) return next(new Error('Unauthorized'));

      const user = await getUserFromAccessToken(cleaned);
      if (!user) return next(new Error('Unauthorized'));

      socket.data.userId = user.id;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.data.userId || '');
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('disconnect', () => {
      // no-op
    });
  });

  return io;
};

export const emitOrderStatus = (userId: string, payload: {
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string | null;
  updatedAt: string;
  message?: string;
}) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('order.status.updated', payload);
};
