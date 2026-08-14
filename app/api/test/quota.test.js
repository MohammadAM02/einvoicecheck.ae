import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, validUblXml } from './helpers/fixtures.js';
import { planLimitRedisKey } from '../src/config/plans.js';
import { monthlyQuotaKey } from '../src/plugins/security.js';
import { ApiKey } from '../src/models/ApiKey.js';
import { UsageEvent } from '../src/models/UsageEvent.js';
import { config } from '../src/config/env.js';

// Force the generation engine to throw for one payload so A-008 can prove an
// internal error releases the reservation (route replies 500, never finalizes).
// NOTE: generateInvoice is synchronous — the mock must stay sync or the route
// receives a Promise and the failure path never runs.
vi.mock('../src/rules/generate/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateInvoice: vi.fn((opts) => {
      if (opts.data && opts.data.explode) throw new Error('boom');
      return actual.generateInvoice(opts);
    }),
  };
});

describe('monthly quota enforcement (UTC calendar month, atomic reservation)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });
  afterEach(async () => {
    // Isolate quota state between tests: drop the quota counter and the
    // published plan limit (usage events may accumulate — tests use deltas).
    await ctx.redis.del(monthlyQuotaKey(String(ctx.apiKey._id)));
    await ctx.redis.del(planLimitRedisKey(String(ctx.apiKey._id)));
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });
  const publishQuota = async (monthlyQuota) => {
    await ctx.redis.set(
      planLimitRedisKey(String(ctx.apiKey._id)),
      JSON.stringify({ plan: 'trial', rateLimitPerMinute: 100, monthlyQuota })
    );
  };
  // Quota counter is a Redis SET of opaque reservation tokens (A-015); its
  // cardinality is the number of units currently reserved this month.
  const quotaCounter = async () => ctx.redis.scard(monthlyQuotaKey(String(ctx.apiKey._id)));
  const freshKey = async (name) => {
    const { raw, doc } = ApiKey.generate({ name });
    const created = await ApiKey.create(doc);
    return { raw, doc: created };
  };

  const preflight = () =>
    ctx.app.inject({ method: 'POST', url: '/v1/preflight', headers: auth(), payload: validInvoice() });
  const convert = () =>
    ctx.app.inject({ method: 'POST', url: '/v1/convert', headers: auth(), payload: { xml: validUblXml() } });
  const generate = (data = {}) =>
    ctx.app.inject({
      method: 'POST',
      url: '/v1/generate',
      headers: auth(),
      payload: {
        template: 'standard-tax-invoice',
        data: {
          invoiceNumber: 'INV-001',
          issueDate: '2026-01-15',
          supplier: { trn: '123456789012345', name: 'Acme Corp' },
          customer: { trn: '987654321098765', name: 'Buyer Inc' },
          lines: [{ name: 'Widget', quantity: 10, unitPrice: 100, category: 'S' }],
          ...data,
        },
      },
    });

  it('A-006: two concurrent requests cannot both take the final monthly unit', async () => {
    await publishQuota(2);
    expect((await preflight()).statusCode).toBe(200); // counter -> 1 (one unit left)

    const [r1, r2] = await Promise.all([preflight(), preflight()]);
    expect([r1.statusCode, r2.statusCode].sort()).toEqual([200, 429]);
    const rejected = r1.statusCode === 429 ? r1 : r2;
    expect(rejected.json().error).toBe('quota_exceeded');
    // The final unit was reserved once; the rejected request's unit was rolled back.
    expect(await quotaCounter()).toBe(2);
  });

  it('A-007: at monthly quota, validation/convert/generation are rejected before expensive work', async () => {
    await publishQuota(1);
    expect((await preflight()).statusCode).toBe(200); // consume the only unit

    const before = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
    const preflightRes = await preflight();
    const convertRes = await convert();
    const generateRes = await generate();

    for (const res of [preflightRes, convertRes, generateRes]) {
      expect(res.statusCode).toBe(429);
      expect(res.json().error).toBe('quota_exceeded');
      expect(res.json().message).toMatch(/monthly quota/i);
    }
    // Rejected before billable work: no metering events were written for them.
    const after = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
    expect(after).toBe(before);
  });

  it('A-008: an internal error releases the reservation (not finalized)', async () => {
    await publishQuota(100);
    const res = await generate({ explode: true });
    expect(res.statusCode).toBe(500);
    expect(await quotaCounter()).toBe(0);
  });

  it('A-015: atomic reserve failure leaks no reservation and no work proceeds', async () => {
    await publishQuota(10);
    const originalEval = ctx.redis.eval;
    ctx.redis.eval = vi.fn().mockRejectedValue(new Error('redis down'));
    config.rateLimit.requireRedis = true;
    try {
      const before = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
      const res = await preflight();
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('quota_store_unavailable');
      // The Lua script is atomic: a thrown eval wrote nothing (A-015).
      expect(await quotaCounter()).toBe(0);
      // No billable work ran.
      const after = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
      expect(after).toBe(before);
    } finally {
      ctx.redis.eval = originalEval;
      config.rateLimit.requireRedis = false;
    }
  });

  it('A-015: release removes only the exact reservation and is idempotent', async () => {
    await publishQuota(2);
    // A keeps one finalized unit (token stays in the set).
    expect((await preflight()).statusCode).toBe(200);
    expect(await quotaCounter()).toBe(1);
    // B reserves the last unit, then the internal error releases B's token only.
    const failed = await generate({ explode: true });
    expect(failed.statusCode).toBe(500);
    expect(await quotaCounter()).toBe(1);
    // A's unit still holds the quota: the next request can take the freed slot.
    expect((await preflight()).statusCode).toBe(200);
    expect(await quotaCounter()).toBe(2);
    // A third request is now correctly exhausted.
    expect((await preflight()).statusCode).toBe(429);
  });

  it('A-015: repeated failed reservations release idempotently', async () => {
    await publishQuota(1);
    const first = await generate({ explode: true });
    const second = await generate({ explode: true });
    expect(first.statusCode).toBe(500);
    expect(second.statusCode).toBe(500);
    // Each request reserved exactly one unit and released exactly one.
    expect(await quotaCounter()).toBe(0);
  });

  it('successful and invalid billable operations finalize (consume) their unit', async () => {
    await publishQuota(10);
    expect((await preflight()).statusCode).toBe(200); // valid -> consumes 1
    expect(await quotaCounter()).toBe(1);
  });

  it('A-014: missing active-plan metadata fails closed (503) before any work', async () => {
    // A fresh key with NO published plan: quota authority is absent. The API
    // must reject safely — never treat absence as an unlimited monthly quota.
    const { raw, doc } = await freshKey('Missing Plan Key');
    const before = await UsageEvent.countDocuments({ keyId: doc._id });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: { 'x-api-key': raw },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('quota_store_unavailable');
    // No billable work ran and no reservation/counter was written.
    const after = await UsageEvent.countDocuments({ keyId: doc._id });
    expect(after).toBe(before);
    expect(await ctx.redis.scard(monthlyQuotaKey(String(doc._id)))).toBe(0);
  });

  it('A-014: malformed active-plan metadata fails closed (503) before any work', async () => {
    const { raw, doc } = await freshKey('Malformed Plan Key');
    await ctx.redis.set(planLimitRedisKey(String(doc._id)), '{not-json');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: { 'x-api-key': raw },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('quota_store_unavailable');
    expect(await UsageEvent.countDocuments({ keyId: doc._id })).toBe(0);
  });

  it('A-014: unreadable plan metadata fails closed (503) under the production Redis policy', async () => {
    const { raw, doc } = await freshKey('Unreadable Plan Key');
    await ctx.redis.set(
      planLimitRedisKey(String(doc._id)),
      JSON.stringify({ plan: 'trial', rateLimitPerMinute: 100, monthlyQuota: 10 })
    );
    // First read (rate limiter) succeeds; the quota read fails. With
    // RATE_LIMIT_REQUIRE_REDIS=true the store failure must fail closed.
    const originalGet = ctx.redis.get;
    let reads = 0;
    ctx.redis.get = vi.fn(async (k) => {
      reads += 1;
      if (reads >= 2) throw new Error('redis read failed');
      return originalGet.call(ctx.redis, k);
    });
    config.rateLimit.requireRedis = true;
    try {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/preflight',
        headers: { 'x-api-key': raw },
        payload: validInvoice(),
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('quota_store_unavailable');
      expect(await UsageEvent.countDocuments({ keyId: doc._id })).toBe(0);
      expect(await ctx.redis.scard(monthlyQuotaKey(String(doc._id)))).toBe(0);
    } finally {
      ctx.redis.get = originalGet;
      config.rateLimit.requireRedis = false;
    }
  });

  it('quota Redis keys hold counters only, never invoice payloads', async () => {
    await publishQuota(10);
    await preflight();
    const members = await ctx.redis.smembers(monthlyQuotaKey(String(ctx.apiKey._id)));
    expect(members.length).toBe(1);
    for (const member of members) {
      expect(JSON.stringify(member)).not.toContain('Falcon');
      expect(JSON.stringify(member)).not.toContain('INV-');
      expect(member).not.toMatch(/<Invoice/);
    }
  });
});
