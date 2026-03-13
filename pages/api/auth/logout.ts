import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { auditService } from '../../../src/lib/server/services/audit';
import { parseBody, optionalTrimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { user } = await requireAuthUser(req);
  const schema = z.object({
    reason: optionalTrimmedString(120).optional(),
  }).strip();
  const { reason } = parseBody(req, schema);

  await auditService.log({
    actorUserId: user.id,
    action: 'auth.logout',
    resourceType: 'auth',
    metadata: reason ? { reason } : undefined,
  });

  res.status(200).json({ success: true });
});
