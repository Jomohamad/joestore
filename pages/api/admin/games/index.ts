import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const games = await ordersService.listGames();
    res.status(200).json(games);
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const id = req.body?.id ? String(req.body.id) : undefined;
    const name = String(req.body?.name || '').trim();
    const provider_api = String(req.body?.provider_api || req.body?.providerApi || 'reloadly').trim().toLowerCase();
    const active = req.body?.active !== false;

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
