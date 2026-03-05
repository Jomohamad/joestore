import type { NextFunction, Request, Response } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const userId = req.authUser?.id || 'anon';
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms user=${userId}`);
  });
  next();
};
