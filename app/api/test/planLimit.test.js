import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice } from './helpers/fixtures.js';
import { PLANS, planLimitRedisKey } from '../src/config/plans.js';

/**
 * The E2 contract: the dashboard (app/web) publishes a plan's rate limit to
 * shared Redis at `plan:limits:<apiKeyId>`; this service reads it and 429s an
 * over-plan caller. Here we publish a trial-tier limit by hand (exactly the
 * blob app/web writes) and prove the limit takes effect.
 */
describe('plan-gated rate limits published by the dashboard', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp(); // no per-key limit on the document
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('honours the published plan limit over the global default and 429s above it', async () => {
    await ctx.redis.set(
      planLimitRedisKey(String(ctx.apiKey._id)),
      JSON.stringify({ plan: 'trial', rateLimitPerMinute: 2, monthlyQuota: PLANS.trial.monthlyQuota })
    );

    const call = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/validate',
        headers: { 'x-api-key': ctx.rawKey },
        payload: validInvoice(),
      });

    const r1 = await call();
    const r2 = await call();
    const r3 = await call();

    expect(r1.statusCode).toBe(200);
    expect(r1.headers['x-ratelimit-limit']).toBe('2'); // plan limit, not the 60 default
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);
    expect(r3.json().error).toBe('rate_limited');
  });
});
