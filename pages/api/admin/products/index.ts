import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 200);
    const products = await ordersService.listAdminProducts(page, limit);
    res.status(200).json(products);
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const id = req.body?.id ? String(req.body.id) : undefined;
    const game_id = String(req.body?.game_id || req.body?.gameId || '').trim();
    const name = String(req.body?.name || '').trim();
    const provider_product_id = String(req.body?.provider_product_id || req.body?.providerProductId || '').trim();
    const provider = String(req.body?.provider || 'reloadly').trim().toLowerCase();
    const price = Number(req.body?.price || 0);
    const currency = String(req.body?.currency || 'EGP').trim().toUpperCase();
    const active = req.body?.active !== false;

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
      image: req.body?.image ? String(req.body.image) : null,
    });

    res.status(200).json(product);
    return;
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id || req.body?.product_id || req.query.id || '').trim();
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
