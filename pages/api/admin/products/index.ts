import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { currencySchema, paginationSchema, parseBody, parseQuery, trimmedString, optionalNullableTrimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const { page, limit } = parseQuery(req, paginationSchema);
    const products = await ordersService.listAdminProducts(page, limit);
    res.status(200).json(products);
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const body = parseBody(
      req,
      z.object({
        id: trimmedString(1, 80).optional(),
        game_id: trimmedString(1, 120).optional(),
        gameId: trimmedString(1, 120).optional(),
        name: trimmedString(1, 120),
        provider_product_id: trimmedString(1, 120).optional(),
        providerProductId: trimmedString(1, 120).optional(),
        provider: z.enum(['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle']).optional(),
        price: z.coerce.number().positive(),
        currency: currencySchema.optional().default('EGP'),
        active: z.boolean().optional(),
        image: optionalNullableTrimmedString(500),
      }).strip(),
    );
    const id = body.id ? String(body.id) : undefined;
    const game_id = String(body.game_id || body.gameId || '').trim();
    const name = String(body.name || '').trim();
    const provider_product_id = String(body.provider_product_id || body.providerProductId || '').trim();
    const provider = String(body.provider || 'reloadly').trim().toLowerCase();
    const price = Number(body.price || 0);
    const currency = String(body.currency || 'EGP').trim().toUpperCase();
    const active = body.active !== false;

    if (!game_id || !name || !provider_product_id || !Number.isFinite(price) || price <= 0) {
      throw new ApiError(400, 'game_id, name, provider_product_id and valid price are required', 'VALIDATION_ERROR');
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
    return;
  }

  if (req.method === 'DELETE') {
    const body = parseBody(
      req,
      z.object({
        id: trimmedString(1, 80).optional(),
        product_id: trimmedString(1, 80).optional(),
      }).strip(),
    );
    const query = parseQuery(req, z.object({ id: trimmedString(1, 80).optional() }).strip());
    const id = String(body.id || body.product_id || query.id || '').trim();
    if (!id) {
      throw new ApiError(400, 'id is required', 'VALIDATION_ERROR');
    }
    const deleted = await ordersService.deleteAdminProduct(id);
    if (!deleted) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    res.status(200).json({ success: true, id });
    return;
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
});
