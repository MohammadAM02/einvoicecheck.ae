import mongoose from 'mongoose';
import { config } from '../config/env.js';

/**
 * Connect the global mongoose instance. Idempotent — if a connection is
 * already open (e.g. established by the test harness against
 * mongodb-memory-server) it is reused.
 */
export async function connectMongo(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
  });
  return mongoose.connection;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/** readyState === 1 means connected. Used by the /health readiness probe. */
export function mongoIsUp() {
  return mongoose.connection.readyState === 1;
}
