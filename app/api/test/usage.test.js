import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, brokenInvoice } from './helpers/fixtures.js';

describe('GET /usage', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });

  it('401 without an API key', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/usage' });
    expect(res.statusCode).toBe(401);
  });

  it('reports metering events written by /v1/preflight', async () => {
    // two valid + one invalid -> 3 metering events
    await ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: auth(), payload: validInvoice() });
    await ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: auth(), payload: validInvoice() });
    await ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: auth(), payload: brokenInvoice() });

    const res = await ctx.app.inject({ method: 'GET', url: '/usage', headers: auth() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.allTime).toBe(3);
    expect(body.outcomes.valid).toBe(2);
    expect(body.outcomes.invalid).toBe(1);
    expect(body.recent.length).toBeGreaterThan(0);
    expect(body.recent[0].endpoint).toBe('/v1/preflight');
  });
});
