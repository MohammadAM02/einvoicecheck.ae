import 'dotenv/config';

/**
 * Central runtime configuration. Every value is sourced from an env var
 * documented in .env.example, with a safe local default.
 */
export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/uae_einvoice_preflight',

  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX || 60),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    // When true, a Redis outage fails CLOSED (503) instead of allowing the
    // request through unmetered. Production should set RATE_LIMIT_REQUIRE_REDIS=true
    // so a limiter outage cannot silently become unlimited paid API access.
    requireRedis: process.env.RATE_LIMIT_REQUIRE_REDIS === 'true',
  },
};

export const isTest = config.nodeEnv === 'test';
