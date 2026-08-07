// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeneratorClientError, generateXml } from '@/lib/generator-client';

const INPUT = {
  template: 'standard-tax-invoice',
  data: {
    invoiceNumber: 'INV-001',
    issueDate: '2026-08-07',
    supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
    customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
    lines: [{ name: 'Widget A', quantity: 12, unitPrice: 50, category: 'S' }],
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateXml (proxy envelope contract)', () => {
  it('unwraps the convert-style envelope { ok, result, rateLimit }', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: { ok: true, xml: '<Invoice/>', template: 'standard-tax-invoice', engineVersion: 'generate-1.0.0' },
          rateLimit: { limit: 20, remaining: 19, resetSeconds: 60, degraded: false },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await generateXml(INPUT);
    expect(res).toEqual({
      ok: true,
      xml: '<Invoice/>',
      template: 'standard-tax-invoice',
      engineVersion: 'generate-1.0.0',
    });
  });

  it('throws GeneratorClientError carrying fieldErrors on a 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: 'Validation failed.',
          fieldErrors: [{ field: 'supplier.trn', message: 'TRN must be 15 digits' }],
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(generateXml(INPUT)).rejects.toMatchObject({
      name: 'GeneratorClientError',
      status: 400,
      fieldErrors: [{ field: 'supplier.trn', message: 'TRN must be 15 digits' }],
    });
  });
});
