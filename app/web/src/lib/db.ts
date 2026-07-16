import mongoose from 'mongoose';

/**
 * Mongo connection shared with app/api (same database, same collections).
 * Cached across hot reloads / lambda-style invocations.
 */
const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/uae_einvoice_preflight';

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalCache = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (globalCache.__mongoose ??= { conn: null, promise: null });

export async function connectMongo(): Promise<typeof mongoose> {
  // Tests connect mongodb-memory-server themselves; never reconnect over it.
  if (mongoose.connection.readyState === 1) return mongoose;
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8_000 });
  cache.conn = await cache.promise;
  return cache.conn;
}
