import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import { setRedisForTests } from '@/lib/redis';
import { toolRateKey } from '@/lib/toolRateLimit';

const redis = new RedisMock();

beforeAll(() => {
  setRedisForTests(redis as never);
});

afterEach(async () => {
  await redis.flushall();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-1</cbc:ID>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
</Invoice>`;

const NOT_XML = JSON.stringify({ invoiceNumber: 'INV-1' });

const VALID_XML_RESULT = {
  valid: true,
  inputFormat: 'xml',
  validationScope: 'pint-ae-ubl-xml',
  invoiceType: '388',
  schemaVersion: 'PINT AE 1.0',
  format: { status: 'passed', issues: [] },
  structure: { status: 'passed', issues: [] },
  semantic: { status: 'passed', issues: [] },
};

function stubApi(response: Response | (() => Promise<Response>), key = 'test-api-key') {
  vi.stubEnv('EINVOICECHECK_API_KEY', key);
  const fetchMock = vi.fn().mockImplementation(typeof response === 'function' ? response : async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function apiJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Load the batch route with a specific hourly limit (env is read at import
 * time). resetModules guarantees a fresh toolRateLimit module sees the stub.
 */
async function batchRouteWithLimit(hourly: number) {
  vi.stubEnv('TOOL_RATE_LIMIT_PER_HOUR', String(hourly));
  vi.resetModules();
  const route = await import('@/app/api/tools/validate/batch/route');
  setRedisForTests(redis as never);
  return route;
}

function call(route: { POST: (r: Request) => Promise<Response> }, invoices: unknown[], ip = '203.0.113.10') {
  return route.POST(
    new Request('https://einvoicecheck.ae/api/tools/validate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ invoices }),
    }),
  );
}

describe('batch per-invoice quota accounting (A-009/A-010)', () => {
  it('A-009: N accepted invoices with N units available reserve exactly N units and return N results', async () => {
    stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(5);

    const res = await call(route, [VALID_XML, VALID_XML, VALID_XML]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(3);
    // One unit per accepted invoice, reserved before processing.
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBe('3');
    expect(body.rateLimit.remaining).toBe(2);
    expect(body.rateLimit.limit).toBe(5);
  });

  it('A-010: a batch needing more units than remain is rejected whole, no document processed', async () => {
    const fetchMock = stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(2);

    const res = await call(route, [VALID_XML, VALID_XML, VALID_XML]);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.toLowerCase()).toContain('limit');
    expect(fetchMock).not.toHaveBeenCalled();
    // A rejected reservation never increments the counter: no key exists at all.
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBeNull();
  });

  it('an oversized batch is rejected before any reservation', async () => {
    const fetchMock = stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(5);

    const res = await call(route, Array(51).fill(VALID_XML));
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBeNull();
  });

  it('malformed documents are not counted as accepted and consume no unit', async () => {
    stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(1);

    const res = await call(route, [VALID_XML, NOT_XML]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].valid).toBe(true);
    expect(body.results[1].valid).toBe(false);
    // Only the one accepted XML document consumed a unit.
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBe('1');
  });

  it('A-017: zero accepted units reserve nothing and create no Redis key', async () => {
    const { reserveToolRateLimit } = await import('@/lib/toolRateLimit');
    setRedisForTests(redis as never);
    const ip = '203.0.113.88';
    const d = await reserveToolRateLimit('uae-e-invoice-validator', ip, 0);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(d.limit);
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', ip))).toBeNull();
  });

  it('A-017: a batch with no accepted XML documents reserves nothing and creates no key', async () => {
    stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(5);

    const res = await call(route, [NOT_XML, NOT_XML]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(2);
    expect(body.results.every((r: { valid: boolean }) => r.valid === false)).toBe(true);
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBeNull();
  });

  it('A-017: deterministic 19/20 boundary race — a 2-unit rejection cannot block a 1-unit reservation; the counter never exceeds the limit', async () => {
    const limit = 20;
    vi.stubEnv('TOOL_RATE_LIMIT_PER_HOUR', String(limit));
    vi.resetModules();
    const { reserveToolRateLimit } = await import('@/lib/toolRateLimit');
    setRedisForTests(redis as never);
    const ip = '203.0.113.77';
    const key = toolRateKey('uae-e-invoice-validator', ip);

    // The reservation MUST be one native conditional Lua operation, never a
    // blind INCRBY + DECRBY rollback (the non-atomic window lets the counter
    // exceed the limit under real concurrency).
    const evalSpy = vi.spyOn(redis, 'eval');
    const incrSpy = vi.spyOn(redis, 'incrby');
    const decrSpy = vi.spyOn(redis, 'decrby');

    // 19 single-unit reservations fill the counter to 19 (limit 20).
    for (let i = 0; i < 19; i += 1) {
      const d = await reserveToolRateLimit('uae-e-invoice-validator', ip, 1);
      expect(d.allowed).toBe(true);
    }
    expect(await redis.get(key)).toBe('19');

    // The over-limit 2-unit reservation is rejected atomically: counter stays 19.
    const over = await reserveToolRateLimit('uae-e-invoice-validator', ip, 2);
    expect(over.allowed).toBe(false);
    expect(await redis.get(key)).toBe('19');

    // The concurrent 1-unit request can still succeed: counter reaches exactly 20.
    const single = await reserveToolRateLimit('uae-e-invoice-validator', ip, 1);
    expect(single.allowed).toBe(true);
    expect(await redis.get(key)).toBe('20');
    expect(Number(await redis.get(key))).toBeLessThanOrEqual(limit);

    expect(evalSpy).toHaveBeenCalled();
    expect(incrSpy).not.toHaveBeenCalled();
    expect(decrSpy).not.toHaveBeenCalled();
  });

  it('A-021: fewer than two invoices is rejected before reservation or validation', async () => {
    const fetchMock = stubApi(() => apiJson(VALID_XML_RESULT));
    const route = await batchRouteWithLimit(5);

    const res = await call(route, [VALID_XML]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.toLowerCase()).toContain('at least two');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await redis.get(toolRateKey('uae-e-invoice-validator', '203.0.113.10'))).toBeNull();
  });
});
