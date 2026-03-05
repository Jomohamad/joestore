import express from 'express';
import { requestLogger } from '../middleware/requestLogger.js';
import { authRoutes } from '../routes/authRoutes.js';
import { gamesRoutes } from '../routes/gamesRoutes.js';
import { ordersRoutes } from '../routes/ordersRoutes.js';
import { paymentRoutes } from '../routes/paymentRoutes.js';
import { shippingRoutes } from '../routes/shippingRoutes.js';
import { profileRoutes } from '../routes/profileRoutes.js';
import { miscRoutes } from '../routes/miscRoutes.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authMiddleware } from '../middleware/auth.js';
import { profileService } from '../services/profileService.js';
import { supabaseAdmin } from '../supabase.js';

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use('/api', miscRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/profile', profileRoutes);

  // Legacy compatibility endpoint currently used by frontend.
  app.get(
    '/api/check-username',
    asyncHandler(async (req, res) => {
      const rawUsername = String(req.query.username || '').trim();
      if (!profileService.validateUsername(rawUsername)) {
        throw new HttpError(400, 'Invalid username format', 'INVALID_USERNAME');
      }

      let requesterId: string | null = null;
      const authorization = String(req.headers.authorization || '');
      if (authorization.startsWith('Bearer ')) {
        const token = authorization.slice('Bearer '.length).trim();
        const { data } = await supabaseAdmin.auth.getUser(token);
        requesterId = data.user?.id || null;
      }

      const owner = await profileService.getUsernameOwner(rawUsername);
      if (!owner || owner === requesterId) {
        return res.json({ available: true, suggestions: [] });
      }

      const candidates = [`${rawUsername}1`, `${rawUsername}_01`, `${rawUsername}.x`, `${rawUsername}99`, `${rawUsername}_pro`]
        .map((s) => s.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30))
        .filter((s) => profileService.validateUsername(s));

      const suggestions: string[] = [];
      for (const c of candidates) {
        if (suggestions.length >= 5) break;
        const existing = await profileService.getUsernameOwner(c);
        if (!existing) suggestions.push(c);
      }

      return res.json({ available: false, suggestions });
    }),
  );

  app.delete(
    '/api/user/delete',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const authUser = req.authUser;
      if (!authUser) {
        throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
      }

      const requestedUsername = String(req.body?.username || '').trim().toLowerCase();
      const currentUsername = String(authUser.user_metadata?.username || '').trim().toLowerCase();
      if (!requestedUsername || !currentUsername || requestedUsername !== currentUsername) {
        throw new HttpError(403, 'Username does not match authenticated user', 'USERNAME_MISMATCH');
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      if (error) {
        throw new HttpError(500, error.message, 'ACCOUNT_DELETE_FAILED');
      }

      res.json({ success: true });
    }),
  );

  return app;
};
