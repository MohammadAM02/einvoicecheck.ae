import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import { setRedisForTests } from '@/lib/redis';

const route = await import('@/app/api/tools/validate/route');
const batchRoute = await import('@/app/api/tools/validate/batch/route');
const { validateDocument } = await import('@/lib/validation');

const redis = new RedisMock();

beforeAll(() => {
  setRedisForTests(redis as never);
});

afterEach(async () => {
  await redis.flushall();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Layered result the strict POST /v2/validate returns (see app/api/src/app.js). */
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

const INVALID_XML_RESULT = {
  ...VALID_XML_RESULT,
  valid: false,
  format: {
    status: 'failed',
    issues: [
      {
        path: '/Invoice',
        rule: 'ENG-PARSE-01',
        severity: 'error',
        message: 'Mismatched closing tag: expected </Invoice> but found </Invocie>',
        fix: 'Fix the closing tag.',
        line: 7,
        column: null,
        xmlPath: null,
      },
    ],
  },
};

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-1</cbc:ID>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
</Invoice>`;

const MISMATCHED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-1</cbc:ID>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
</Invocie>`;

/** Stub the server-side API call: env key + global fetch returning a JSON response. */
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

function post(document: unknown, ip = '203.0.113.10') {
  return route.POST(
    new Request('https://einvoicecheck.ae/api/tools/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ document }),
    }),
  );
}

function postBatch(invoices: unknown[], ip = '203.0.113.10') {
  return batchRoute.POST(
    new Request('https://einvoicecheck.ae/api/tools/validate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ invoices }),
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

describe('free tool proxies to the strict XML API', () => {
  it('sends the document to POST /v2/validate with content-type application/xml and the server x-api-key', async () => {
    const fetchMock = stubApi(apiJson(VALID_XML_RESULT));

    const res = await post(VALID_XML);
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.einvoicecheck.ae/v2/validate');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/xml', 'x-api-key': 'test-api-key' });
    expect(init.body).toBe(VALID_XML);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns the layered API result unchanged', async () => {
    stubApi(apiJson(VALID_XML_RESULT));

    const res = await post(VALID_XML);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result).toEqual(VALID_XML_RESULT);
    expect(body.rateLimit.limit).toBeGreaterThan(0);
  });

  it('validateDocument rejects a missing API key without calling the network', async () => {
    vi.stubEnv('EINVOICECHECK_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(validateDocument(VALID_XML)).rejects.toMatchObject({
      name: 'ValidationApiError',
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects canonical JSON instead of evaluating it locally', async () => {
    const fetchMock = stubApi(apiJson(VALID_XML_RESULT));

    const res = await post(JSON.stringify(validInvoice()));
    expect(res.status).toBe(400);
    expect((await res.json()).error.toLowerCase()).toContain('xml');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects plain text that is not XML', async () => {
    const fetchMock = stubApi(apiJson(VALID_XML_RESULT));

    const res = await post('this is not an invoice');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the layered failure for mismatched XML', async () => {
    stubApi(apiJson(INVALID_XML_RESULT));

    const res = await post(MISMATCHED_XML);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.valid).toBe(false);
    expect(body.result.format.status).toBe('failed');
    expect(body.result.format.issues[0].rule).toBe('ENG-PARSE-01');
  });

  it('maps a non-2xx upstream response to a truthful 503 with the safe message', async () => {
    stubApi(apiJson({ error: 'internal_error', message: 'XSD schema cache is unavailable.' }, 500));

    const res = await post(VALID_XML);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('XSD schema cache is unavailable.');
  });

  it('falls back to a generic message when the upstream error body is not JSON', async () => {
    stubApi(new Response('boom', { status: 502 }));

    const res = await post(VALID_XML);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('HTTP 502');
  });

  it('returns 503 when the upstream API is unreachable', async () => {
    stubApi(async () => {
      throw new TypeError('fetch failed');
    });

    const res = await post(VALID_XML);
    expect(res.status).toBe(503);
    expect((await res.json()).error.toLowerCase()).toContain('reach');
  });

  it('rejects an empty document', async () => {
    const res = await post('   ');
    expect(res.status).toBe(400);
  });
});

describe('batch route', () => {
  it('validates each XML document sequentially through the API', async () => {
    // Factory: each sequential call needs a fresh Response (bodies are single-use).
    const fetchMock = stubApi(() => apiJson(VALID_XML_RESULT));

    const res = await postBatch([VALID_XML, VALID_XML]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toEqual({ index: 0, ...VALID_XML_RESULT });
    expect(body.results[1]).toEqual({ index: 1, ...VALID_XML_RESULT });
  });

  it('rejects a non-XML document with an index-specific error without calling the API for it', async () => {
    const fetchMock = stubApi(apiJson(VALID_XML_RESULT));

    const res = await postBatch([VALID_XML, JSON.stringify(validInvoice())]);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.results[0]).toEqual({ index: 0, ...VALID_XML_RESULT });
    expect(body.results[1].index).toBe(1);
    expect(body.results[1].valid).toBe(false);
    expect(body.results[1].error).toContain('1');
    expect(body.results[1].error.toLowerCase()).toContain('xml');
  });

  it('maps an upstream failure for one document into that result, not the whole batch', async () => {
    const fetchMock = stubApi(() => apiJson({ error: 'internal_error', message: 'XSD schema cache is unavailable.' }, 500));

    const res = await postBatch([VALID_XML, VALID_XML]);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.results[0].valid).toBe(false);
    expect(body.results[0].error).toBe('XSD schema cache is unavailable.');
    expect(body.results[1].error).toBe('XSD schema cache is unavailable.');
  });
});

describe('IP rate limit (Redis)', () => {
  it('429s after the hourly limit for one IP and leaves other IPs alone', async () => {
    vi.stubEnv('TOOL_RATE_LIMIT_PER_HOUR', '3');
    vi.resetModules();
    const fresh = await import('@/app/api/tools/validate/route');
    const { setRedisForTests: setR } = await import('@/lib/redis');
    setR(redis as never);
    stubApi(apiJson(VALID_XML_RESULT));

    const call = (ip: string) =>
      fresh.POST(
        new Request('https://einvoicecheck.ae/api/tools/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify({ document: VALID_XML }),
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
    stubApi(apiJson(VALID_XML_RESULT));

    const res = await post(VALID_XML, '203.0.113.99');
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

    const res = await post(VALID_XML, '203.0.113.55');
    expect(res.status).toBe(503);

    setRedisForTests(redis as never);
  });
});
