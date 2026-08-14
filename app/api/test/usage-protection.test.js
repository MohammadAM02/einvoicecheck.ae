import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice } from './helpers/fixtures.js';
import { ApiKey } from '../src/models/ApiKey.js';
import { UsageEvent } from '../src/models/UsageEvent.js';
import { planLimitRedisKey } from '../src/config/plans.js';

describe('GET /usage protection (R5)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('A-011: repeated authenticated /usage requests are 429ed past the low-cost limit', async () => {
    // Fresh key so the usage rate-limit bucket starts at zero.
    const { raw, doc } = ApiKey.generate({ name: 'Usage Burst Key' });
    await ApiKey.create(doc);
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

  it('A-019: exhausted paid traffic does not consume the /usage bucket', async () => {
    // Fresh key with a published plan: 11 paid calls fill its paid bucket.
    const { raw, doc } = ApiKey.generate({ name: 'Paid Exhausted Key' });
    const key = await ApiKey.create(doc);
    await ctx.redis.set(
      planLimitRedisKey(String(key._id)),
      JSON.stringify({ plan: 'trial', rateLimitPerMinute: 11, monthlyQuota: 100 })
    );
    const headers = { 'x-api-key': raw };

    for (let i = 0; i < 11; i += 1) {
      const paid = await ctx.app.inject({
        method: 'POST',
        url: '/v1/preflight',
        headers,
        payload: validInvoice(),
      });
      expect(paid.statusCode).toBe(200);
    }
    // Paid bucket is at 11/11; the next paid call would 429.
    const exhausted = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers,
      payload: validInvoice(),
    });
    expect(exhausted.statusCode).toBe(429);

    // The usage bucket is independent: the first usage read is allowed.
    const usage = await ctx.app.inject({ method: 'GET', url: '/usage', headers });
    expect(usage.statusCode).toBe(200);
    expect(usage.json().totals.currentMonth).toBe(11);
  });

  it('A-012/A-020: allTime stays lifetime; current-month is the quota total', async () => {
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
    // Documented field: lifetime count, including last month's event.
    expect(body.totals.allTime).toBe(3);
    // Quota contract: current UTC calendar month only.
    expect(body.totals.currentMonth).toBe(2);
    expect(body.outcomes.valid).toBe(2);
    // Recent is bounded to the current month (no last-month row).
    expect(body.recent.length).toBe(2);
  });
});
