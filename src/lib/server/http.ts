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
    const persistError = async (payload: {
      type: string;
      message: string;
      metadata?: Record<string, unknown>;
    }) => {
      try {
        const { logsService } = await import('./services/logs');
        await logsService.write(payload.type, payload.message, payload.metadata || {});
      } catch {
        // Ignore logging failures to avoid recursive API errors.
      }
    };

    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        await persistError({
          type: 'api.error',
          message: error.message,
          metadata: {
            code: error.code,
            status: error.status,
            path: req.url || '',
            method: req.method || '',
          },
        });
        return res.status(error.status).json({ error: error.message, code: error.code, details: error.details });
      }
      console.error('[api:error]', error);
      await persistError({
        type: 'api.unhandled_error',
        message: error instanceof Error ? error.message : 'Internal Server Error',
        metadata: {
          path: req.url || '',
          method: req.method || '',
        },
      });
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  };
