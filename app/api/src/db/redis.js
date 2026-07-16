import Redis from 'ioredis';
import { config } from '../config/env.js';

/**
 * Create a real ioredis client. In tests we inject an ioredis-mock instance
 * into buildApp() instead of calling this, so no live Redis is required.
 *
 * lazyConnect keeps construction cheap; we connect explicitly in server.js.
 */
export function createRedis(url = config.redisUrl) {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });
  // Avoid crashing the process on transient Redis errors; the /health probe
  // and rate-limiter surface connectivity problems instead.
  client.on('error', () => {});
  return client;
}

/**
 * Liveness check for the /health readiness probe. Returns true if PING
 * succeeds within a short budget. Works for both ioredis and ioredis-mock.
 */
export async function redisIsUp(client) {
  if (!client) return false;
  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
