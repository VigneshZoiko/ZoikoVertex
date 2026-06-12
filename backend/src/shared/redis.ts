import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

let client: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (client) return client;
  if (!env.REDIS_URL) {
    logger.warn('[redis] REDIS_URL not configured — Redis features disabled');
    return null;
  }
  client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  client.on('error', (err) => {
    logger.error({ err }, '[redis] Connection error');
  });
  return client;
}

export async function withRedis<T>(fn: (redis: IORedis) => Promise<T>, fallback: T): Promise<T> {
  const r = getRedis();
  if (!r) return fallback;
  try {
    if (r.status !== 'ready') await r.connect();
    return await fn(r);
  } catch (err) {
    logger.error({ err }, '[redis] Operation failed, using fallback');
    return fallback;
  }
}
