import Redis from 'ioredis';

/**
 * Shared Redis — the SAME instance app/api reads its rate limits from.
 * Tests inject an ioredis-mock via setRedisForTests().
 */
type MinimalRedis = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  // Used by the free-tool IP rate limiter (src/lib/toolRateLimit.ts) for the
  // atomic conditional Lua reservation.
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  ttl(key: string): Promise<number>;
};

const globalCache = globalThis as unknown as { __redis?: MinimalRedis };

export function setRedisForTests(client: MinimalRedis): void {
  globalCache.__redis = client;
}

export function getRedis(): MinimalRedis {
  if (globalCache.__redis) return globalCache.__redis;
  const client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
  client.on('error', () => {});
  globalCache.__redis = client as unknown as MinimalRedis;
  return globalCache.__redis;
}
