import Redis from 'ioredis';
import config from '../config/index.js';

if (!config.redisUrl) {
  throw new Error('[Redis] REDIS_URL is missing in .env');
}

/**
 * Singleton Redis client.
 *
 * ioredis automatically handles reconnection with exponential back-off,
 * so this single instance is safe to share across the entire app and
 * across multiple serverless warm invocations on Vercel.
 */
const redis = new Redis(config.redisUrl, {
  // Don't crash the process on connection loss — retry silently.
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully.');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

export default redis;
