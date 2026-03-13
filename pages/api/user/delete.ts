import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../src/lib/server/supabaseAdmin';
import { parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);

  const { user } = await requireAuthUser(req, { requireVerified: true });
  const body = parseBody(req, z.object({ username: trimmedString(1, 40) }).strip());
  const requestedUsername = String(body.username || '').trim().toLowerCase();
  const currentUsername = String(user.user_metadata?.username || '').trim().toLowerCase();

  if (!requestedUsername || !currentUsername || requestedUsername !== currentUsername) {
    throw new ApiError(403, 'Username does not match authenticated user', 'USERNAME_MISMATCH');
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new ApiError(500, error.message, 'ACCOUNT_DELETE_FAILED');
  }

  res.status(200).json({ success: true });
});
