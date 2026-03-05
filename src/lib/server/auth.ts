import type { NextApiRequest } from 'next';
import { ApiError } from './http';
import { supabaseAdmin } from './supabaseAdmin';

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
};

export const requireAuthUser = async (req: NextApiRequest) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
  }

  return { user: data.user, token };
};

export const requireInternalToken = (req: NextApiRequest) => {
  const token = String(req.headers['x-internal-token'] || '');
  if (!token || token !== process.env.JWT_SECRET) {
    throw new ApiError(401, 'Unauthorized internal route', 'INTERNAL_UNAUTHORIZED');
  }
};
