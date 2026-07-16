import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, brokenInvoice, validUblXml } from './helpers/fixtures.js';

describe('POST /v1/validate', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });

  it('401 when the API key header is missing', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401 when the API key is invalid', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { 'x-api-key': 'pdk_live_deadbeef' },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a Bearer token form of the key', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { authorization: `Bearer ${ctx.rawKey}` },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid).toBe(true);
  });

  it('happy path: valid invoice -> 200, valid:true, no errors', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.invoiceType).toBe('388');
    expect(body.schemaVersion).toBeTruthy();
    expect(body.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('failure path: deliberately broken invoice -> 200, valid:false, cited errors', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: brokenInvoice(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
    // every error is remediable + cites a rule
    for (const e of body.errors) {
      expect(e.rule).toBeTruthy();
      expect(e.path).toBeTruthy();
    }
  });

  it('accepts UBL 2.1 / PINT AE XML via application/xml', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.invoiceType).toBe('388');
  });
});
