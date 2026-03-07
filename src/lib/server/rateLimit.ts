import type { NextApiRequest } from 'next';
import { cacheManager } from './services/cache/cacheManager';
import { ApiError } from './http';

interface Bucket {
  count: number;
  resetAt: number;
}

const fallbackBuckets = new Map<string, Bucket>();

export const getClientIp = (req: NextApiRequest) => {
  const xff = req.headers['x-forwarded-for'];
  if (Array.isArray(xff)) return String(xff[0] || 'unknown').split(',')[0].trim();
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

export const enforceRateLimit = async (
  req: NextApiRequest,
  options: {
    key: string;
    windowMs: number;
    max: number;
  },
) => {
  const ip = getClientIp(req);
  const windowMs = Math.max(1_000, Number(options.windowMs || 60_000));
  const max = Math.max(1, Number(options.max || 1));

  const windowId = Math.floor(Date.now() / windowMs);
  const ttlSeconds = Math.ceil(windowMs / 1000);
  const counterKey = `rl:${options.key}:${ip}:${windowId}`;

  try {
    const hits = await cacheManager.incrementCounter(counterKey, ttlSeconds);
    if (hits > max) {
      throw new ApiError(429, 'Too many requests, please try again later.', 'RATE_LIMITED', {
        retry_after_ms: windowMs,
      });
    }
    return;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const fallbackKey = `${options.key}:${ip}`;
    const current = fallbackBuckets.get(fallbackKey);
    const timestamp = Date.now();

    if (!current || current.resetAt <= timestamp) {
      fallbackBuckets.set(fallbackKey, {
        count: 1,
        resetAt: timestamp + windowMs,
      });
      return;
    }

    if (current.count >= max) {
      throw new ApiError(429, 'Too many requests, please try again later.', 'RATE_LIMITED', {
        retry_after_ms: Math.max(0, current.resetAt - timestamp),
      });
    }

    current.count += 1;
    fallbackBuckets.set(fallbackKey, current);
  }
};
