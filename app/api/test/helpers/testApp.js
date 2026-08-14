import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import RedisMock from 'ioredis-mock';
import { buildApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/db/mongoose.js';
import { ApiKey } from '../../src/models/ApiKey.js';
import { planLimitRedisKey } from '../../src/config/plans.js';

/**
 * Boot a fully in-memory stack: mongodb-memory-server + ioredis-mock + the
 * Fastify app. No live infrastructure required. Returns handles plus a seeded
 * API key so tests can authenticate.
 *
 * The seeded key gets a valid published plan limit (mirroring the dashboard's
 * signup write) because billable routes now fail closed without authoritative
 * plan metadata (A-014). The published per-minute limit mirrors the key
 * document's rateLimitPerMinute so per-key limit tests keep their contract.
 */
export async function startTestApp({ rateLimitPerMinute = null } = {}) {
  const mongo = await MongoMemoryServer.create();
  await connectMongo(mongo.getUri());

  const redis = new RedisMock();
  const app = await buildApp({ redis, logger: false });

  const { raw, doc } = ApiKey.generate({ name: 'Test Key', rateLimitPerMinute });
  const key = await ApiKey.create(doc);

  await redis.set(
    planLimitRedisKey(String(key._id)),
    JSON.stringify({ plan: 'trial', rateLimitPerMinute: rateLimitPerMinute ?? 60, monthlyQuota: 100 })
  );

  return { app, mongo, redis, rawKey: raw, apiKey: key };
}

export async function stopTestApp({ app, mongo }) {
  if (app) await app.close();
  // drop data + disconnect
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase().catch(() => {});
  }
  await disconnectMongo();
  if (mongo) await mongo.stop();
}
