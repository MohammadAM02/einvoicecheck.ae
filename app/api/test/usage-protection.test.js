import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice } from './helpers/fixtures.js';
import { ApiKey } from '../src/models/ApiKey.js';
import { UsageEvent } from '../src/models/UsageEvent.js';

describe('GET /usage protection (R5)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('A-011: repeated authenticated /usage requests are 429ed past the low-cost limit', async () => {
    // Fresh key so the shared per-key rate-limit counter starts at zero.
    const { raw, doc } = ApiKey.generate({ name: 'Usage Burst Key' });
    const burstKey = await ApiKey.create(doc);
    const headers = { 'x-api-key': raw };

    const codes = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await ctx.app.inject({ method: 'GET', url: '/usage', headers });
      codes.push(res.statusCode);
    }

    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
    const last = await ctx.app.inject({ method: 'GET', url: '/usage', headers });
    expect(last.json().error).toBe('rate_limited');
  });

  it('A-012: the summary is bounded to the current UTC calendar month (no all-time aggregate)', async () => {
    // 2 events this month + 1 event last month.
    await ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: { 'x-api-key': ctx.rawKey }, payload: validInvoice() });
    await ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: { 'x-api-key': ctx.rawKey }, payload: validInvoice() });
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    await UsageEvent.create({
      keyId: ctx.apiKey._id,
      endpoint: '/v1/preflight',
      method: 'POST',
      statusCode: 200,
      outcome: 'valid',
      timestamp: lastMonth,
    });

    const res = await ctx.app.inject({ method: 'GET', url: '/usage', headers: { 'x-api-key': ctx.rawKey } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Legacy field name kept for response compatibility; value is now the
    // current UTC calendar month, not lifetime.
    expect(body.totals.allTime).toBe(2);
    expect(body.outcomes.valid).toBe(2);
  });
});
