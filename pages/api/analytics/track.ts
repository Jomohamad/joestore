import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { analyticsService } from '../../../src/lib/server/services/analytics';
import { parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

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

  const body = parseBody(
    req,
    z.object({
      eventType: trimmedString(1, 80).optional(),
      event_type: trimmedString(1, 80).optional(),
      metadata: z.record(z.unknown()).optional(),
    }).strip(),
  );
  const eventType = String(body.eventType || body.event_type || '').trim();
  if (!eventType) throw new ApiError(400, 'eventType is required', 'VALIDATION_ERROR');

  if (body.metadata) {
    const serialized = JSON.stringify(body.metadata);
    if (serialized.length > 4000) {
      throw new ApiError(400, 'metadata payload too large', 'VALIDATION_ERROR');
    }
  }

  await analyticsService.track({
    userId,
    eventType,
    metadata: (body.metadata && typeof body.metadata === 'object') ? body.metadata : {},
  });

  res.status(200).json({ success: true });
});
