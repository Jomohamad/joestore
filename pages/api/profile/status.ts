import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { profileService } from '../../../src/lib/server/services/profile';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { user } = await requireAuthUser(req);
  const isAdmin = await profileService.isAdmin(user.id);
  const profile = profileService.buildProfile(user, isAdmin);
  const exists = Boolean(profile.username && profile.first_name && profile.last_name);

  res.status(200).json({ exists, onboarded: Boolean(profile.onboarded), profile });
});
