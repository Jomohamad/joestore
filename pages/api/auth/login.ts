import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { supabaseAdmin, supabaseAnon } from '../../../src/lib/server/supabaseAdmin';
import { buildAppUser, syncPublicUserFromAuth } from '../../../src/lib/server/users';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { auditService } from '../../../src/lib/server/services/audit';
import { emailSchema, parseBody } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'auth:login', windowMs: 60_000, max: 20 });

  const schema = z.object({
    email: emailSchema,
    password: z.string().min(6).max(256),
  }).strip();
  const { email, password } = parseBody(req, schema);
  const normalizedEmail = email.toLowerCase();

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: normalizedEmail, password });

  if (error || !data.user || !data.session) {
    await auditService.log({
      actorUserId: null,
      action: 'auth.login.failed',
      resourceType: 'auth',
      metadata: {
        reason: 'invalid_credentials',
      },
    });
    throw new ApiError(401, error?.message || 'Invalid credentials', 'LOGIN_FAILED');
  }

  await syncPublicUserFromAuth(data.user);

  const userFlags = await supabaseAdmin
    .from('users')
    .select('is_blocked')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!userFlags.error && userFlags.data?.is_blocked) {
    await supabaseAnon.auth.signOut({ scope: 'local' });
    await auditService.log({
      actorUserId: data.user.id,
      action: 'auth.login.blocked',
      resourceType: 'auth',
    });
    throw new ApiError(403, 'Account is blocked. Please contact support.', 'ACCOUNT_BLOCKED');
  }

  await auditService.log({
    actorUserId: data.user.id,
    action: 'auth.login.success',
    resourceType: 'auth',
  });

  res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: buildAppUser(data.user),
  });
});
