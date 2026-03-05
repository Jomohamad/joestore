import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http.js';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[api:error]', err);
  return res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
};
