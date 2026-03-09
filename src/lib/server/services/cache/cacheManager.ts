import { getRedisClient } from './redisClient';

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

const now = () => Date.now();

const getMemory = (key: string) => {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
};

const setMemory = (key: string, value: string, ttlSeconds: number) => {
  memoryCache.set(key, {
    value,
    expiresAt: now() + Math.max(1, ttlSeconds) * 1000,
  });
};

const deleteMemoryByPrefix = (prefix: string) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
};

const readJson = async <T>(key: string): Promise<T | null> => {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const raw = getMemory(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async (key: string, value: unknown, ttlSeconds: number) => {
  const json = JSON.stringify(value);
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, json, 'EX', Math.max(1, ttlSeconds));
    return;
  }
  setMemory(key, json, ttlSeconds);
};

const deleteByPrefix = async (prefix: string) => {
  const redis = getRedisClient();
  if (redis) {
    let cursor = '0';
    const pattern = `${prefix}*`;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
    return;
  }

  deleteMemoryByPrefix(prefix);
};

export const cacheManager = {
  async getCachedJson<T>(key: string) {
    return readJson<T>(key);
  },

  async setCachedJson(key: string, value: unknown, ttlSeconds = 60) {
    await writeJson(key, value, ttlSeconds);
  },

  async invalidateByPrefix(prefix: string) {
    await deleteByPrefix(prefix);
  },

  async getCachedProducts(gameId?: string) {
    return readJson<unknown[]>(`cache:products:${gameId || 'all'}`);
  },

  async setCachedProducts(products: unknown[], gameId?: string, ttlSeconds = 90) {
    await writeJson(`cache:products:${gameId || 'all'}`, products, ttlSeconds);
  },

  async invalidateCachedProducts(gameId?: string) {
    if (gameId) {
      await deleteByPrefix(`cache:products:${gameId}`);
      await deleteByPrefix('cache:products:all');
      return;
    }
    await deleteByPrefix('cache:products:');
  },

  async cacheProviderPrices(productId: string, prices: unknown, ttlSeconds = 180) {
    await writeJson(`cache:provider-prices:${productId}`, prices, ttlSeconds);
  },

  async getProviderPrices(productId: string) {
    return readJson<Record<string, unknown>>(`cache:provider-prices:${productId}`);
  },

  async cacheTopupResults(orderId: string, result: unknown, ttlSeconds = 600) {
    await writeJson(`cache:topup:${orderId}`, result, ttlSeconds);
  },

  async getCachedTopupResult(orderId: string) {
    return readJson<Record<string, unknown>>(`cache:topup:${orderId}`);
  },

  async incrementCounter(key: string, ttlSeconds: number) {
    const redis = getRedisClient();
    if (redis) {
      const value = await redis.incr(key);
      if (value === 1) {
        await redis.expire(key, Math.max(1, ttlSeconds));
      }
      return value;
    }

    const existing = getMemory(key);
    const current = Number(existing || '0') || 0;
    const next = current + 1;
    setMemory(key, String(next), ttlSeconds);
    return next;
  },
};
