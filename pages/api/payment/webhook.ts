import type { NextApiRequest, NextApiResponse } from 'next';
import fawaterkWebhookHandler from './fawaterk/webhook';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return fawaterkWebhookHandler(req, res);
}
