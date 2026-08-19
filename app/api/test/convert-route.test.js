/**
 * POST /v1/convert retirement regression (Part B).
 *
 * The standalone repair API is gone. The route must answer 404 so stale
 * integrators fail loudly instead of receiving converter output.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validUblXml } from './helpers/fixtures.js';

describe('POST /v1/convert retirement', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('404 for the retired JSON form', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { 'x-api-key': ctx.rawKey },
      payload: { xml: validUblXml() },
    });
    expect(res.statusCode).toBe(404);
  });

  it('404 for the retired raw-XML form', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { 'x-api-key': ctx.rawKey, 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('404 even without authentication (route does not exist)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: { 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(404);
  });
});
