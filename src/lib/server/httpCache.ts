import type { NextApiRequest, NextApiResponse } from 'next';
import { cacheManager } from './services/cache/cacheManager';

type EdgeCacheOptions = {
  sMaxAge: number;
  staleWhileRevalidate?: number;
  browserMaxAge?: number;
};

const normalizeSeconds = (value: number, fallback: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
};

export const setPublicEdgeCacheHeaders = (res: NextApiResponse, options: EdgeCacheOptions) => {
  const sMaxAge = normalizeSeconds(options.sMaxAge, 60);
  const stale = normalizeSeconds(options.staleWhileRevalidate ?? Math.max(sMaxAge * 2, 120), Math.max(sMaxAge * 2, 120));
  const browser = normalizeSeconds(options.browserMaxAge ?? 0, 0);

  const cacheControl = `public, max-age=${browser}, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}`;
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('CDN-Cache-Control', cacheControl);
  res.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}`);
};

export const setPrivateNoStoreHeaders = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
};

const buildCacheKey = (req: NextApiRequest, scope: string) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      for (const v of value) query.append(key, String(v));
    } else if (value !== undefined) {
      query.append(key, String(value));
    }
  }
  const qs = query.toString();
  return `cache:api:${scope}:${req.url || ''}:${qs}`;
};

export const respondWithPublicApiCache = async <T>(
  req: NextApiRequest,
  res: NextApiResponse,
  options: {
    scope: string;
    ttlSeconds: number;
    edge: EdgeCacheOptions;
    loader: () => Promise<T>;
  },
) => {
  setPublicEdgeCacheHeaders(res, options.edge);

  const key = buildCacheKey(req, options.scope);
  const cached = await cacheManager.getCachedJson<T>(key);
  if (cached !== null) {
    res.setHeader('X-Api-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  const payload = await options.loader();
  await cacheManager.setCachedJson(key, payload, options.ttlSeconds);
  res.setHeader('X-Api-Cache', 'MISS');
  return res.status(200).json(payload);
};

