import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { ordersService } from '../../../src/lib/server/services/orders';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const gameId = req.query.game_id ? String(req.query.game_id) : req.query.gameId ? String(req.query.gameId) : undefined;
  const products = await ordersService.listPublicProducts(gameId);
  res.status(200).json(products);
});

