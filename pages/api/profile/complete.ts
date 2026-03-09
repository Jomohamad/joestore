import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { profileService } from '../../../src/lib/server/services/profile';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { user } = await requireAuthUser(req);

  const updated = await profileService.completeProfile({
    requester: user,
    firstName: String(req.body?.firstName || ''),
    lastName: String(req.body?.lastName || ''),
    username: String(req.body?.username || ''),
    email: String(req.body?.email || ''),
    avatarUrl: req.body?.avatarUrl ? String(req.body.avatarUrl) : null,
    providerAvatarUrl: req.body?.providerAvatarUrl ? String(req.body.providerAvatarUrl) : null,
  });

  const isAdmin = await profileService.isAdmin(updated.id);
  res.status(200).json({ success: true, profile: profileService.buildProfile(updated, isAdmin) });
});
