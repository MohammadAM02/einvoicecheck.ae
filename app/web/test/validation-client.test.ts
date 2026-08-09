import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_BROWSER_DOCUMENT_BYTES,
  ValidationClientError,
  readInvoiceFile,
  validateInvoiceDocument,
} from '@/lib/validation-client';
import { BROKEN_XML_SAMPLE, VALID_XML_SAMPLE } from '@/lib/validation-samples';

const successResponse = {
  ok: true as const,
  result: {
    valid: true,
    inputFormat: 'xml',
    validationScope: 'pint-ae-ubl-xml',
    invoiceType: '388',
    schemaVersion: 'PINT AE 1.0',
    format: { status: 'passed', issues: [] },
    structure: { status: 'passed', issues: [] },
    semantic: { status: 'passed', issues: [] },
  },
  rateLimit: { limit: 10, remaining: 9, resetSeconds: 60, degraded: false },
};

afterEach(() => vi.unstubAllGlobals());

describe('validateInvoiceDocument', () => {
  it('posts the unchanged document to the validation endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const document = '  {\n  "invoiceNumber": " INV-1 "\n}  ';

    await validateInvoiceDocument(document);

    expect(fetchMock).toHaveBeenCalledWith('/api/tools/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ document }),
      signal: undefined,
    });
  });

  it('returns a typed successful validation response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 })));

    const response = await validateInvoiceDocument('{}');

    expect(response).toEqual(successResponse);
    expect(response.rateLimit.remaining).toBe(9);
  });

  it('preserves 429 server guidance and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'Too many requests. Try again in 60 seconds.' }), { status: 429 })));

    await expect(validateInvoiceDocument('{}')).rejects.toMatchObject({
      name: 'ValidationClientError',
      message: 'Too many requests. Try again in 60 seconds.',
      status: 429,
    });
  });

  it('preserves 503 server guidance and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'Validation is temporarily unavailable. Try again shortly.' }), { status: 503 })));

    await expect(validateInvoiceDocument('{}')).rejects.toMatchObject({
      name: 'ValidationClientError',
      message: 'Validation is temporarily unavailable. Try again shortly.',
      status: 503,
    });
  });

  it('uses an HTTP fallback when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Service unavailable', { status: 503 })));

    await expect(validateInvoiceDocument('{}')).rejects.toEqual(
      new ValidationClientError('Validation failed with HTTP 503.', 503),
    );
  });

  it.each([null, 'temporarily unavailable'])('uses an HTTP fallback when the JSON response is %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 503 })));

    await expect(validateInvoiceDocument('{}')).rejects.toEqual(
      new ValidationClientError('Validation failed with HTTP 503.', 503),
    );
  });
});

describe('readInvoiceFile', () => {
  it('rejects an oversize file before reading it', async () => {
    const text = vi.fn();
    const file = { name: 'invoice.xml', size: MAX_BROWSER_DOCUMENT_BYTES + 1, text } as unknown as File;

    await expect(readInvoiceFile(file)).rejects.toMatchObject({
      name: 'ValidationClientError',
      message: 'File is larger than 256 KB. Choose a smaller XML invoice.',
      status: 413,
    });
    expect(text).not.toHaveBeenCalled();
  });

  it.each(['invoice.XML', 'invoice.Txt'])('reads supported %s files without changing their text', async (name) => {
    const text = '  <Invoice> unchanged </Invoice>  ';
    const file = { name, size: text.length, text: vi.fn().mockResolvedValue(text) } as unknown as File;

    await expect(readInvoiceFile(file)).resolves.toBe(text);
  });

  it('rejects unsupported file extensions', async () => {
    const file = { name: 'invoice.pdf', size: 12, text: vi.fn() } as unknown as File;

    await expect(readInvoiceFile(file)).rejects.toThrow('Choose an XML invoice file.');
  });

  it('rejects JSON files before reading them', async () => {
    const text = vi.fn();
    const file = { name: 'invoice.json', size: 12, text } as unknown as File;

    await expect(readInvoiceFile(file)).rejects.toThrow('Choose an XML invoice file.');
    expect(text).not.toHaveBeenCalled();
  });
});


describe('validation samples', () => {
  it('provide XML documents for both sample actions', () => {
    expect(VALID_XML_SAMPLE.trimStart()).toMatch(/^<\?xml/);
    expect(BROKEN_XML_SAMPLE.trimStart()).toMatch(/^<\?xml/);
    expect(BROKEN_XML_SAMPLE).not.toBe(VALID_XML_SAMPLE);
  });
});
