import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import { setRedisForTests } from '@/lib/redis';

const route = await import('@/app/api/tools/validate/route');
const { validateDocument } = await import('@/lib/validation');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const API_RULES = path.join(REPO_ROOT, 'app/api/src/rules');
const WEB_RULES = path.join(REPO_ROOT, 'app/web/src/lib/rules');

const redis = new RedisMock();

beforeAll(() => {
  setRedisForTests(redis as never);
});

afterEach(async () => {
  await redis.flushall();
  vi.unstubAllEnvs();
});

function post(document: unknown, ip = '203.0.113.10') {
  return route.POST(
    new Request('https://einvoicecheck.ae/api/tools/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ document }),
    }),
  );
}

/** The fixture the API's own engine tests use (app/api/test/helpers/fixtures.js). */
function validInvoice() {
  return {
    invoiceType: '388',
    invoiceNumber: 'INV-2026-0001',
    issueDate: '2026-07-14',
    currency: 'AED',
    supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
    customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
    lines: [
      { id: '1', quantity: 10, unitPrice: 50, lineExtensionAmount: 500, taxCategory: { code: 'S', rate: 5 }, itemName: 'Widget A' },
      { id: '2', quantity: 4, unitPrice: 25, lineExtensionAmount: 100, taxCategory: { code: 'S', rate: 5 }, itemName: 'Widget B' },
    ],
    allowanceTotal: 0,
    chargeTotal: 0,
    prepaidAmount: 0,
    roundingAmount: 0,
    taxSubtotals: [{ taxableAmount: 600, taxAmount: 30, category: { code: 'S', rate: 5 } }],
    totals: {
      lineExtensionAmount: 600,
      taxExclusiveAmount: 600,
      taxAmount: 30,
      taxInclusiveAmount: 630,
      payableAmount: 630,
    },
  };
}

describe('free tool runs the REAL rule engine', () => {
  it('the vendored engine is byte-identical to app/api/src/rules', async () => {
    async function hashTree(dir: string, skipDirs: Set<string> = new Set()) {
      const out: Record<string, string> = {};
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (skipDirs.has(entry.name)) continue;
          for (const [k, v] of Object.entries(await hashTree(full, skipDirs))) out[`${entry.name}/${k}`] = v;
        } else if (entry.name.endsWith('.js')) {
          out[entry.name] = createHash('sha256').update(await readFile(full)).digest('hex');
        }
      }
      return out;
    }
    // If this fails, re-copy app/api/src/rules -> app/web/src/lib/rules. The free
    // tool must never diverge from the paid API's engine.
    // 'convert' and 'generate' are API-only pipeline code — not vendored rule logic.
    expect(await hashTree(WEB_RULES)).toEqual(await hashTree(API_RULES, new Set(['convert', 'generate'])));
  });

  it('accepts a valid canonical JSON invoice with no errors', async () => {
    const res = await post(JSON.stringify(validInvoice()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.valid).toBe(true);
    expect(body.result.invoiceType).toBe('388');
    expect(body.result.errors.filter((e: { severity: string }) => e.severity === 'error')).toHaveLength(0);
    expect(body.rateLimit.limit).toBeGreaterThan(0);
  });

  it('returns normalized field-level errors for a broken invoice', async () => {
    const broken = validInvoice();
    broken.customer.trn = '123'; // wrong TRN shape
    broken.totals.payableAmount = 999; // totals no longer reconcile

    const res = await post(JSON.stringify(broken));
    const body = await res.json();
    expect(body.result.valid).toBe(false);

    for (const e of body.result.errors) {
      expect(e).toHaveProperty('path');
      expect(e).toHaveProperty('rule');
      expect(['error', 'warning']).toContain(e.severity);
      expect(typeof e.message).toBe('string');
    }
    expect(body.result.errors.some((e: { path: string }) => e.path.includes('customer'))).toBe(true);
  });

  it('accepts UBL / PINT AE XML and matches direct engine output exactly', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-1</cbc:ID>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
</Invoice>`;
    const res = await post(xml);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Identical to calling the engine directly - the route adds nothing.
    expect(body.result).toEqual(JSON.parse(JSON.stringify(validateDocument(xml))));
  });

  it('reports a parse error instead of fabricating a result', async () => {
    const res = await post('this is not an invoice');
    const body = await res.json();
    expect(body.result.valid).toBe(false);
    expect(body.result.errors[0].rule).toBe('ENG-PARSE-01');
  });

  it('rejects mismatched XML before semantic checks run', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-1</cbc:ID>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
</Invocie>`;
    const res = await post(xml);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.result.valid).toBe(false);
    expect(body.result.errors).toHaveLength(1);
    expect(body.result.errors[0].rule).toBe('ENG-PARSE-01');
  });

  it('rejects an empty document', async () => {
    const res = await post('   ');
    expect(res.status).toBe(400);
  });
});

describe('IP rate limit (Redis)', () => {
  it('429s after the hourly limit for one IP and leaves other IPs alone', async () => {
    vi.stubEnv('TOOL_RATE_LIMIT_PER_HOUR', '3');
    vi.resetModules();
    const fresh = await import('@/app/api/tools/validate/route');
    const { setRedisForTests: setR } = await import('@/lib/redis');
    setR(redis as never);

    const doc = JSON.stringify(validInvoice());
    const call = (ip: string) =>
      fresh.POST(
        new Request('https://einvoicecheck.ae/api/tools/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify({ document: doc }),
        }),
      );

    for (let i = 0; i < 3; i += 1) expect((await call('198.51.100.7')).status).toBe(200);

    const limited = await call('198.51.100.7');
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toContain('per hour');

    // A different IP still gets through.
    expect((await call('198.51.100.8')).status).toBe(200);
    vi.resetModules();
  });

  it('fails open (with a degraded flag) when Redis is unavailable', async () => {
    setRedisForTests({
      get: async () => null,
      set: async () => null,
      del: async () => null,
      incr: async () => {
        throw new Error('redis down');
      },
      expire: async () => null,
      ttl: async () => -1,
    } as never);

    const res = await post(JSON.stringify(validInvoice()), '203.0.113.99');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.rateLimit.degraded).toBe(true);

    setRedisForTests(redis as never);
  });

  it('never silently disables the limit when the deployment requires Redis', async () => {
    vi.stubEnv('TOOL_RATE_LIMIT_REQUIRE_REDIS', 'true');
    setRedisForTests({
      get: async () => null,
      set: async () => null,
      del: async () => null,
      incr: async () => {
        throw new Error('redis down');
      },
      expire: async () => null,
      ttl: async () => -1,
    } as never);

    const res = await post(JSON.stringify(validInvoice()), '203.0.113.55');
    expect(res.status).toBe(503);

    setRedisForTests(redis as never);
  });
});
