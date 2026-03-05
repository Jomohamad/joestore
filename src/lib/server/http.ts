import type { NextApiRequest, NextApiResponse } from 'next';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const methodNotAllowed = (res: NextApiResponse, allowed: string[]) => {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
};

export const withErrorHandling =
  (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message, code: error.code, details: error.details });
      }
      console.error('[api:error]', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  };
