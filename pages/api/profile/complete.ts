import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { profileService } from '../../../src/lib/server/services/profile';
import { emailSchema, parseBody, trimmedString, usernameSchema, optionalNullableTrimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'profile:complete', windowMs: 60_000, max: 15 });

  const { user } = await requireAuthUser(req);
  const schema = z.object({
    firstName: trimmedString(1, 100),
    lastName: trimmedString(1, 100),
    username: usernameSchema,
    email: emailSchema,
    avatarUrl: optionalNullableTrimmedString(500),
    providerAvatarUrl: optionalNullableTrimmedString(500),
  }).strip();
  const body = parseBody(req, schema);

  const updated = await profileService.completeProfile({
    requester: user,
    firstName: body.firstName,
    lastName: body.lastName,
    username: body.username,
    email: body.email,
    avatarUrl: body.avatarUrl || null,
    providerAvatarUrl: body.providerAvatarUrl || null,
  });

  const isAdmin = await profileService.isAdmin(updated.id);
  res.status(200).json({ success: true, profile: profileService.buildProfile(updated, isAdmin) });
});
