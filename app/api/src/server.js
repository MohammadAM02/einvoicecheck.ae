import { buildApp } from './app.js';
import { config } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongoose.js';
import { createRedis } from './db/redis.js';

async function main() {
  await connectMongo();

  const redis = createRedis();
  try {
    await redis.connect();
  } catch (e) {
    // Non-fatal: /health will report redis down and the limiter fails open.
    // eslint-disable-next-line no-console
    console.warn('Redis connect failed at startup:', e.message);
  }

  const app = await buildApp({
    redis,
    logger: { level: config.logLevel },
  });

  const shutdown = async (signal) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await disconnectMongo();
    try {
      redis.disconnect();
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `UAE e-invoice preflight API listening on ${config.host}:${config.port}`
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', e);
  process.exit(1);
});
