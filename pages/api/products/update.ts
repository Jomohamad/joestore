import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAdminUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { ordersService } from '../../../src/lib/server/services/orders';
import { currencySchema, parseBody, trimmedString, optionalNullableTrimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return methodNotAllowed(res, ['PUT', 'PATCH', 'POST']);
  }
  await enforceRateLimit(req, { key: 'products:update', windowMs: 60_000, max: 60 });
  await requireAdminUser(req);

  const body = parseBody(
    req,
    z.object({
      id: trimmedString(1, 80),
      game_id: trimmedString(1, 120).optional(),
      gameId: trimmedString(1, 120).optional(),
      name: trimmedString(1, 120).optional(),
      title: trimmedString(1, 120).optional(),
      provider_product_id: trimmedString(1, 120).optional(),
      providerProductId: trimmedString(1, 120).optional(),
      provider: z.enum(['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle']).optional(),
      price: z.coerce.number().positive(),
      currency: currencySchema.optional().default('EGP'),
      active: z.boolean().optional(),
      image: optionalNullableTrimmedString(500),
    }).strip(),
  );
  const id = String(body.id || '').trim();
  const game_id = String(body.game_id || body.gameId || '').trim();
  const name = String(body.name || body.title || '').trim();
  const provider_product_id = String(body.provider_product_id || body.providerProductId || '').trim();
  const provider = String(body.provider || 'reloadly').trim().toLowerCase();
  const price = Number(body.price || 0);
  const currency = String(body.currency || 'EGP').trim().toUpperCase();
  const active = body.active !== false;

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
    image: body.image ? String(body.image) : null,
  });

  res.status(200).json(product);
});
