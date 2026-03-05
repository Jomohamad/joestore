import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireInternalToken } from '../../../src/lib/server/auth';
import { gamesdropProvider } from '../../../src/lib/server/providers/gamesdrop';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  requireInternalToken(req);

  const result = await gamesdropProvider.createTopup({
    orderId: String(req.body?.orderId || ''),
    gameId: String(req.body?.gameId || ''),
    playerId: String(req.body?.playerId || ''),
    server: req.body?.server ? String(req.body.server) : null,
    packageName: String(req.body?.packageName || ''),
    quantity: Number(req.body?.quantity || 1),
  });

  res.status(200).json(result);
});
