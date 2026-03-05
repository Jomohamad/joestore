import { Router } from 'express';
import { authService } from '../services/authService.js';
import { asyncHandler } from '../utils/http.js';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await authService.register({
      email: req.body?.email,
      password: req.body?.password,
      username: req.body?.username,
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
    });
    res.json(result);
  }),
);

authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await authService.login({
      email: req.body?.email,
      password: req.body?.password,
    });
    res.json(result);
  }),
);
