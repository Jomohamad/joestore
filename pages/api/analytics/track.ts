import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { analyticsService } from '../../../src/lib/server/services/analytics';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'analytics:track', windowMs: 60_000, max: 120 });

  let userId: string | null = null;
  try {
    const auth = await requireAuthUser(req);
    userId = auth.user.id;
  } catch {
    userId = null;
  }

  const eventType = String(req.body?.eventType || req.body?.event_type || '').trim();
  if (!eventType) throw new ApiError(400, 'eventType is required', 'VALIDATION_ERROR');

  await analyticsService.track({
    userId,
    eventType,
    metadata: (req.body?.metadata && typeof req.body.metadata === 'object') ? req.body.metadata : {},
  });

  res.status(200).json({ success: true });
});
