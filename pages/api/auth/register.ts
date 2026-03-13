import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { supabaseAnon } from '../../../src/lib/server/supabaseAdmin';
import { serverEnv } from '../../../src/lib/server/env';
import { buildAppUser, syncPublicUserFromAuth } from '../../../src/lib/server/users';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { auditService } from '../../../src/lib/server/services/audit';
import { emailSchema, parseBody, trimmedString, usernameSchema } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'auth:register', windowMs: 60_000, max: 10 });

  const schema = z.object({
    email: emailSchema,
    password: z.string().min(8).max(256),
    username: usernameSchema.optional().default(''),
    firstName: trimmedString(1, 100),
    lastName: trimmedString(1, 100),
  }).strip();
  const { email, password, username, firstName, lastName } = parseBody(req, schema);
  const normalizedUsername = String(username || '').trim().toLowerCase();

  const redirectTo = `${serverEnv.appBaseUrl}/login`;

  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        username: normalizedUsername,
        first_name: firstName,
        last_name: lastName,
        email,
      },
    },
  });

  if (error) {
    await auditService.log({
      actorUserId: null,
      action: 'auth.register.failed',
      resourceType: 'auth',
    });
    throw new ApiError(400, error.message, 'REGISTER_FAILED');
  }

  if (data.user) {
    await syncPublicUserFromAuth(data.user);
    await auditService.log({
      actorUserId: data.user.id,
      action: 'auth.register.success',
      resourceType: 'auth',
    });
  }

  res.status(200).json({
    user: data.user ? buildAppUser(data.user) : null,
    requiresEmailConfirmation: !Boolean(data.session),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
  });
});
