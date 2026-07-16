import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import RedisMock from 'ioredis-mock';
import { buildApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/db/mongoose.js';
import { ApiKey } from '../../src/models/ApiKey.js';

/**
 * Boot a fully in-memory stack: mongodb-memory-server + ioredis-mock + the
 * Fastify app. No live infrastructure required. Returns handles plus a seeded
 * API key so tests can authenticate.
 */
export async function startTestApp({ rateLimitPerMinute = null } = {}) {
  const mongo = await MongoMemoryServer.create();
  await connectMongo(mongo.getUri());

  const redis = new RedisMock();
  const app = await buildApp({ redis, logger: false });

  const { raw, doc } = ApiKey.generate({ name: 'Test Key', rateLimitPerMinute });
  const key = await ApiKey.create(doc);

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
