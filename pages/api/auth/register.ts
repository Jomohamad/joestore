import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { supabaseAnon } from '../../../src/lib/server/supabaseAdmin';
import { serverEnv } from '../../../src/lib/server/env';
import { buildAppUser, syncPublicUserFromAuth } from '../../../src/lib/server/users';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'auth:register', windowMs: 60_000, max: 10 });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const username = String(req.body?.username || '').trim().toLowerCase();
  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  if (username && !USERNAME_REGEX.test(username)) {
    throw new ApiError(400, 'Username must be 3-30 chars and only letters, numbers, dot, underscore, or hyphen', 'VALIDATION_ERROR');
  }

  const redirectTo = `${serverEnv.appBaseUrl}/login`;

  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
        email,
      },
    },
  });

  if (error) {
    throw new ApiError(400, error.message, 'REGISTER_FAILED');
  }

  if (data.user) {
    await syncPublicUserFromAuth(data.user);
  }

  res.status(200).json({
    user: data.user ? buildAppUser(data.user) : null,
    requiresEmailConfirmation: !Boolean(data.session),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
  });
});
