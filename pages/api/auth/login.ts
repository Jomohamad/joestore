import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { supabaseAnon } from '../../../src/lib/server/supabaseAdmin';
import { buildAppUser, syncPublicUserFromAuth } from '../../../src/lib/server/users';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'auth:login', windowMs: 60_000, max: 20 });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    throw new ApiError(401, error?.message || 'Invalid credentials', 'LOGIN_FAILED');
  }

  await syncPublicUserFromAuth(data.user);

  res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: buildAppUser(data.user),
  });
});
