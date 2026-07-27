import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import RedisMock from 'ioredis-mock';
import { setRedisForTests } from '@/lib/redis';
import { resetPayPalTokenCache } from '@/lib/paypal';

/**
 * In-memory stack: mongodb-memory-server + ioredis-mock. Mirrors how app/api
 * tests boot (test/helpers/testApp.js). No live infrastructure required.
 */
let mongo: MongoMemoryServer | null = null;
let redis: InstanceType<typeof RedisMock> | null = null;

export async function startStack() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  redis = new RedisMock();
  setRedisForTests(redis as never);
  resetPayPalTokenCache();
  return { redis: redis as never as { get(k: string): Promise<string | null> } };
}

export async function stopStack() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  if (mongo) await mongo.stop();
  mongo = null;
}

export async function resetData() {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
  if (redis) await redis.flushall();
}

export function getRedisMock() {
  if (!redis) throw new Error('stack not started');
  return redis;
}
