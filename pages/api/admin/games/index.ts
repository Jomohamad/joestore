import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const games = await ordersService.listGames();
    res.status(200).json(games);
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const body = parseBody(
      req,
      z.object({
        id: trimmedString(1, 80).optional(),
        name: trimmedString(1, 120),
        provider_api: z.enum(['reloadly', 'gamesdrop']).optional(),
        providerApi: z.enum(['reloadly', 'gamesdrop']).optional(),
        active: z.boolean().optional(),
      }).strip(),
    );
    const id = body.id ? String(body.id) : undefined;
    const name = String(body.name || '').trim();
    const provider_api = String(body.provider_api || body.providerApi || 'reloadly').trim().toLowerCase();
    const active = body.active !== false;

    if (!name) throw new ApiError(400, 'name is required', 'VALIDATION_ERROR');
    if (provider_api !== 'reloadly' && provider_api !== 'gamesdrop') {
      throw new ApiError(400, 'provider_api must be reloadly or gamesdrop', 'VALIDATION_ERROR');
    }

    const game = await ordersService.upsertAdminGame({
      id,
      name,
      provider_api: provider_api as 'reloadly' | 'gamesdrop',
      active,
    });

    res.status(200).json(game);
    return;
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH']);
});
