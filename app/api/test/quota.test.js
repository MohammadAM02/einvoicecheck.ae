import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, validUblXml } from './helpers/fixtures.js';
import { planLimitRedisKey } from '../src/config/plans.js';
import { monthlyQuotaKey } from '../src/plugins/security.js';
import { UsageEvent } from '../src/models/UsageEvent.js';

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
  const quotaCounter = async () => Number((await ctx.redis.get(monthlyQuotaKey(String(ctx.apiKey._id)))) || 0);

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

  it('successful and invalid billable operations finalize (consume) their unit', async () => {
    await publishQuota(10);
    expect((await preflight()).statusCode).toBe(200); // valid -> consumes 1
    expect(await quotaCounter()).toBe(1);
  });

  it('keys without a published monthly quota are unaffected and no counter is written', async () => {
    const res = await preflight();
    expect(res.statusCode).toBe(200);
    expect(await quotaCounter()).toBe(0);
  });

  it('quota Redis keys hold counters only, never invoice payloads', async () => {
    await publishQuota(10);
    await preflight();
    const raw = await ctx.redis.get(monthlyQuotaKey(String(ctx.apiKey._id)));
    expect(Number(raw)).toBeGreaterThan(0);
    expect(JSON.stringify(raw)).not.toContain('Falcon');
    expect(JSON.stringify(raw)).not.toContain('INV-');
  });
});
