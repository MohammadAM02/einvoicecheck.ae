import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice } from './helpers/fixtures.js';

describe('per-key rate limiting (Redis sliding window)', () => {
  let ctx;
  beforeAll(async () => {
    // Key limited to 3 requests / window.
    ctx = await startTestApp({ rateLimitPerMinute: 3 });
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('allows requests up to the limit, then returns 429', async () => {
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
    const r4 = await call();

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(200);
    expect(r4.statusCode).toBe(429);
    expect(r4.json().error).toBe('rate_limited');
    expect(r4.headers['retry-after']).toBeTruthy();
    expect(r1.headers['x-ratelimit-limit']).toBe('3');
  });
});
