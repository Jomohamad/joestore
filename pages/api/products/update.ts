import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return methodNotAllowed(res, ['PUT', 'PATCH', 'POST']);
  }
  await enforceRateLimit(req, { key: 'products:update', windowMs: 60_000, max: 60 });
  await requireAdminUser(req);

  const id = String(req.body?.id || '').trim();
  const game_id = String(req.body?.game_id || req.body?.gameId || '').trim();
  const name = String(req.body?.name || req.body?.title || '').trim();
  const provider_product_id = String(req.body?.provider_product_id || req.body?.providerProductId || '').trim();
  const provider = String(req.body?.provider || 'reloadly').trim().toLowerCase();
  const price = Number(req.body?.price || 0);
  const currency = String(req.body?.currency || 'EGP').trim().toUpperCase();
  const active = req.body?.active !== false;

  if (!id || !game_id || !name || !provider_product_id || !Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, 'id, game_id, name, provider_product_id and price are required', 'VALIDATION_ERROR');
  }

  const product = await ordersService.upsertAdminProduct({
    id,
    game_id,
    name,
    provider_product_id,
    price,
    currency,
    active,
    provider:
      provider === 'gamesdrop' || provider === 'unipin' || provider === 'seagm' || provider === 'driffle'
        ? provider
        : 'reloadly',
    image: req.body?.image ? String(req.body.image) : null,
  });

  res.status(200).json(product);
});
