import type { NextApiRequest, NextApiResponse } from 'next';
import createHandler from './create';
import userHandler from './user';
import { methodNotAllowed } from '../../../src/lib/server/http';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') return createHandler(req, res);
  if (req.method === 'GET') return userHandler(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}
