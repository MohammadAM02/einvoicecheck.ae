import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { UsageEvent } from '../src/models/UsageEvent.js';
import { planLimitRedisKey } from '../src/config/plans.js';
import { monthlyQuotaKey } from '../src/plugins/security.js';

const fixture = (name) =>
  readFileSync(new URL(`./fixtures/convert/${name}`, import.meta.url), 'utf8');

// Force the converter to return an internal ERROR (DATA_CHANGED fingerprint
// guard) for one payload so A-016 can prove an ERROR result never bills the
// monthly quota reservation (route replies 200 with status ERROR, and the
// onResponse hook releases the exact reservation).
vi.mock('../src/rules/convert/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    convert(xml, opts) {
      if (typeof xml === 'string' && xml.includes('DATA_CHANGED_SENTINEL')) {
        return {
          status: 'ERROR',
          reason: 'DATA_CHANGED',
          detail: 'A repairer altered data values. Aborting.',
          inputHash: 'a'.repeat(64),
          audit: [],
          blocked: [],
          dataIssues: [],
          engineVersion: '1.0.0',
          convertedAt: new Date().toISOString(),
        };
      }
      return actual.convert(xml, opts);
    },
  };
});

describe('POST /v1/convert', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });
  const rulesOf = (audit) => [...new Set(audit.map((a) => a.rule))];

  it('401 when the API key header is missing', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      payload: { xml: fixture('00-valid.xml') },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401 when the API key is invalid', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { 'x-api-key': 'pdk_live_deadbeef' },
      payload: { xml: fixture('00-valid.xml') },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a Bearer token form of the key', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { authorization: `Bearer ${ctx.rawKey}` },
      payload: { xml: fixture('00-valid.xml') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('NOOP');
  });

  it('400 for a JSON body without an xml field', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('happy path: valid XML -> NOOP, output identical to input, empty audit', async () => {
    const xml = fixture('00-valid.xml');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('NOOP');
    expect(body.output).toBe(xml);
    expect(body.outputHash).toBe(body.inputHash);
    expect(body.audit).toEqual([]);
    expect(body.blocked).toEqual([]);
    expect(body.engineVersion).toBeTruthy();
    // rate limiter ran (security posture parity with /v1/validate)
    expect(Number(res.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
  });

  it('repairs format-only defects with an audit trail', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: fixture('01-format-only.xml') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('CONVERTED');
    const rules = rulesOf(body.audit);
    for (const rule of ['FMT-CHARS-01', 'FMT-DECL-01', 'FMT-PREFIX-01', 'FMT-NS-01']) {
      expect(rules).toContain(rule);
    }
    expect(body.output).toContain('encoding="utf-8"');
    expect(body.output).not.toMatch(/Cbc:/);
    expect(body.blocked).toEqual([]);
  });

  it('refuses data-semantic errors (status 200, REFUSED result, no output)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: fixture('02-data-semantic.xml') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('REFUSED');
    expect(body.reason).toBe('DATA_SEMANTIC');
    expect(body.blocked.length).toBeGreaterThanOrEqual(4);
    expect(body.output).toBeUndefined();
  });

  it('accepts raw XML via application/xml', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: fixture('00-valid.xml'),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('NOOP');
    expect(body.output).toBe(fixture('00-valid.xml'));
  });

  it('format mode reports data issues as warnings, never refuses', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: fixture('02-data-semantic.xml'), mode: 'format' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(['CONVERTED', 'NOOP']).toContain(body.status);
    expect(body.dataIssues.length).toBeGreaterThanOrEqual(4);
    expect(body.reason).toBeUndefined();
  });

  it('meters usage per key with endpoint /v1/convert', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: fixture('00-valid.xml') },
    });
    const events = await UsageEvent.find({
      keyId: ctx.apiKey._id,
      endpoint: '/v1/convert',
      method: 'POST',
    }).lean();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(['valid', 'invalid', 'error']).toContain(events[events.length - 1].outcome);
  });

  it('A-016: converter internal ERROR does not finalize (bill) the reservation', async () => {
    // Isolate quota state: earlier tests finalized units on the shared key.
    await ctx.redis.del(monthlyQuotaKey(String(ctx.apiKey._id)));
    await ctx.redis.set(
      planLimitRedisKey(String(ctx.apiKey._id)),
      JSON.stringify({ plan: 'trial', rateLimitPerMinute: 100, monthlyQuota: 1 })
    );

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: '<Invoice>DATA_CHANGED_SENTINEL</Invoice>' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ERROR');
    // The exact reservation was released: no unit remains billed.
    expect(await ctx.redis.scard(monthlyQuotaKey(String(ctx.apiKey._id)))).toBe(0);
    // The freed unit is usable by the next request.
    const next = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: fixture('00-valid.xml') },
    });
    expect(next.statusCode).toBe(200);
  });
});
