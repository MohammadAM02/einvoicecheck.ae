import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { UsageEvent } from '../src/models/UsageEvent.js';

describe('POST /v1/generate', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });

  const validData = (overrides = {}) => ({
    invoiceNumber: 'INV-001',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    supplier: { trn: '100000000000003', name: 'Acme Corp' },
    customer: { trn: '100000000000403', name: 'Buyer Inc' },
    lines: [{ name: 'Widget', quantity: 10, unitPrice: 100, category: 'S' }],
    ...overrides,
  });

  // ─── Golden: per-template ─────────────────────────────────────────────

  describe('golden — per-template', () => {
    const goldenCases = [
      {
        template: 'standard-tax-invoice',
        data: validData(),
      },
      {
        template: 'summary-tax-invoice',
        data: validData({
          lines: [
            { name: 'Widget A', quantity: 5, unitPrice: 100, category: 'Z' },
            { name: 'Widget B', quantity: 2, unitPrice: 200, category: 'E' },
          ],
        }),
      },
      {
        template: 'standard-tax-credit-note',
        data: validData({
          lines: [{ name: 'Returned Widget', quantity: 2, unitPrice: 50, category: 'S' }],
        }),
      },
    ];

    for (const { template, data } of goldenCases) {
      it(`${template} → 200, parseable XML, totals present`, async () => {
        const res = await ctx.app.inject({
          method: 'POST',
          url: '/v1/generate',
          headers: auth(),
          payload: { template, data },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.ok).toBe(true);
        expect(body.xml).toBeTruthy();
        expect(typeof body.xml).toBe('string');
        // XML must be parseable (no malformed output)
        expect(body.xml).toMatch(/^<\?xml/);
        expect(body.template).toBe(template);
        expect(body.engineVersion).toBeTruthy();
        // Totals must be present in the XML
        expect(body.xml).toContain('LineExtensionAmount');
        expect(body.xml).toContain('PayableAmount');
        // Validate engine check on the generated output
        const { validateInvoice } = await import('../src/rules/engine.js');
        const val = validateInvoice(body.xml, 'application/xml');
        expect(val.valid).toBe(true);
        // Rate limiter ran
        expect(Number(res.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      });
    }
  });

  // ─── 400: input validation ─────────────────────────────────────────────

  describe('400 — input validation', () => {
    it('missing template → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: { data: validData() },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('validation_failed');
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((e) => e.field === 'template' || e.message.includes('template'))).toBe(true);
    });

    it('unknown template → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: { template: 'nonexistent', data: validData() },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((e) => e.field === 'template')).toBe(true);
    });

    it('bad TRN → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: {
          template: 'standard-tax-invoice',
          data: validData({ supplier: { trn: '12345', name: 'Bad Corp' } }),
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((e) => e.field === 'supplier.trn')).toBe(true);
    });

    it('unknown category → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: {
          template: 'standard-tax-invoice',
          data: validData({ lines: [{ name: 'X', quantity: 1, unitPrice: 10, category: 'Z' }] }),
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((e) => (e.field || '').includes('category'))).toBe(true);
    });

    it('empty lines → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: {
          template: 'standard-tax-invoice',
          data: validData({ lines: [] }),
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((e) => e.field === 'lines')).toBe(true);
    });

    it('missing required fields → 400 with fieldErrors', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: auth(),
        payload: {
          template: 'standard-tax-invoice',
          data: { lines: [{ name: 'X', quantity: 1, unitPrice: 10, category: 'S' }] },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Escaping ──────────────────────────────────────────────────────────

  it('escapes & < > " \' in supplier name', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/generate',
      headers: auth(),
      payload: {
        template: 'standard-tax-invoice',
        data: validData({
          supplier: { trn: '100000000000003', name: 'Falcon & Sons <Trading> "LLC" O\'Brien' },
        }),
      },
    });
    expect(res.statusCode).toBe(200);
    const xml = res.json().xml;
    // Must contain XML entities
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&#39;');
    // Must NOT contain raw unescaped characters from the input
    expect(xml).not.toMatch(/Falcon & Sons/);
    expect(xml).not.toMatch(/<Trading>/);
  });

  // ─── Auth ──────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('401 when API key header is missing', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        payload: { template: 'standard-tax-invoice', data: validData() },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe('unauthorized');
    });

    it('401 when API key is invalid', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: { 'x-api-key': 'pdk_live_deadbeef' },
        payload: { template: 'standard-tax-invoice', data: validData() },
      });
      expect(res.statusCode).toBe(401);
    });

    it('accepts Bearer token form of the key', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/generate',
        headers: { authorization: `Bearer ${ctx.rawKey}` },
        payload: { template: 'standard-tax-invoice', data: validData() },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    });
  });

  // ─── Usage metering ────────────────────────────────────────────────────

  it('meters usage per key with endpoint /v1/generate', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/generate',
      headers: auth(),
      payload: { template: 'standard-tax-invoice', data: validData() },
    });
    const events = await UsageEvent.find({
      keyId: ctx.apiKey._id,
      endpoint: '/v1/generate',
      method: 'POST',
    }).lean();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(['valid', 'invalid', 'error']).toContain(events[events.length - 1].outcome);
  });
});
