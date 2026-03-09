import type { NextApiRequest } from 'next';
import { ApiError } from './http';
import { supabaseAdmin } from './supabaseAdmin';
import { serverEnv } from './env';

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

export const requireAdminUser = async (req: NextApiRequest) => {
  const { user, token } = await requireAuthUser(req);

  const roleLookup = await supabaseAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!roleLookup.error && String(roleLookup.data?.role || '').toLowerCase() === 'admin') {
    return { user, token };
  }

  const adminsTableLookup = await supabaseAdmin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminsTableLookup.error && adminsTableLookup.data?.user_id) {
    return { user, token };
  }

  throw new ApiError(403, 'Admin access required', 'FORBIDDEN');
};

export const requireInternalToken = (req: NextApiRequest) => {
  const token = String(req.headers['x-internal-token'] || '');
  if (!token || token !== serverEnv.jwtSecret) {
    throw new ApiError(401, 'Unauthorized internal route', 'INTERNAL_UNAUTHORIZED');
  }
};
