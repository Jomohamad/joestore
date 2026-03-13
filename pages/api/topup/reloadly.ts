import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireInternalToken } from '../../../src/lib/server/auth';
import { reloadlyProvider } from '../../../src/lib/server/providers/reloadly';
import { currencySchema, parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  requireInternalToken(req);

  const body = parseBody(
    req,
    z.object({
      orderId: trimmedString(1, 80),
      gameId: trimmedString(1, 120),
      playerId: trimmedString(1, 120),
      server: trimmedString(1, 120).optional(),
      packageName: trimmedString(1, 120),
      quantity: z.coerce.number().int().min(1).max(20).default(1),
      providerProductId: trimmedString(1, 120).optional(),
      amount: z.coerce.number().positive(),
      currency: currencySchema.optional().default('EGP'),
    }).strip(),
  );
  const result = await reloadlyProvider.createTopup({
    orderId: String(body.orderId || ''),
    gameId: String(body.gameId || ''),
    playerId: String(body.playerId || ''),
    server: body.server ? String(body.server) : null,
    packageName: String(body.packageName || ''),
    quantity: Number(body.quantity || 1),
    providerProductId: body.providerProductId ? String(body.providerProductId) : null,
    amount: Number(body.amount || 0),
    currency: body.currency ? String(body.currency) : 'EGP',
  });

  res.status(200).json(result);
});
