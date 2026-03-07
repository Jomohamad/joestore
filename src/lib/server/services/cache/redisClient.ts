import Redis from 'ioredis';
import { serverEnv } from '../../env';

let redisClient: Redis | null = null;
let disabled = false;

const redisUrl = String(serverEnv.redisUrl || '').trim();

export const getRedisClient = () => {
  if (disabled || !redisUrl) return null;
  if (redisClient) return redisClient;

  const tlsEnabled = serverEnv.redisTls || redisUrl.startsWith('rediss://');

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    tls: tlsEnabled ? {} : undefined,
    lazyConnect: true,
  });

  redisClient.on('error', () => {
    disabled = true;
    try {
      redisClient?.disconnect();
    } catch {
      // ignore disconnect failures
    }
    redisClient = null;
  });

  return redisClient;
};

export const getRedisConnectionForBull = () => {
  if (!redisUrl || disabled) return null;

  const parsed = new URL(redisUrl);
  const dbValue = Number((parsed.pathname || '').replace('/', '') || 0);
  const tlsEnabled = serverEnv.redisTls || parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: Number(parsed.port || (tlsEnabled ? 6380 : 6379)),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isFinite(dbValue) ? dbValue : 0,
    tls: tlsEnabled ? {} : undefined,
  };
};
