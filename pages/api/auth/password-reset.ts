import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { supabaseAnon } from '../../../src/lib/server/supabaseAdmin';
import { serverEnv } from '../../../src/lib/server/env';
import { auditService } from '../../../src/lib/server/services/audit';
import { emailSchema, parseBody } from '../../../src/lib/server/validation';
import { z } from 'zod';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'auth:password_reset', windowMs: 60_000, max: 10 });

  const schema = z.object({ email: emailSchema }).strip();
  const { email } = parseBody(req, schema);

  const redirectTo = `${serverEnv.appBaseUrl}/login`;
  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    await auditService.log({
      actorUserId: null,
      action: 'auth.password_reset.failed',
      resourceType: 'auth',
    });
    throw new ApiError(400, error.message, 'PASSWORD_RESET_FAILED');
  }

  await auditService.log({
    actorUserId: null,
    action: 'auth.password_reset.requested',
    resourceType: 'auth',
  });

  res.status(200).json({ success: true });
});
