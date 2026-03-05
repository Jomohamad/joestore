import type { NextFunction, Request, Response } from 'express';
import { getUserFromAccessToken } from '../supabase.js';
import { HttpError } from '../utils/http.js';

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
};

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return next(new HttpError(401, 'Unauthorized', 'UNAUTHORIZED'));
  }

  const user = await getUserFromAccessToken(token);
  if (!user) {
    return next(new HttpError(401, 'Invalid token', 'INVALID_TOKEN'));
  }

  req.authUser = user;
  return next();
};
