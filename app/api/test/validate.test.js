import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, brokenInvoice, validUblXml } from './helpers/fixtures.js';
import { validateInvoice } from '../src/rules/engine.js';

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
    expect(body.invoiceType).toBe('388');
    // The stub fixture is a minimal smoke-test document, NOT PINT-AE
    // conformant — the interpreter legitimately flags 18 defects (missing
    // postal addresses, business process, BTAE codes, item description).
    // Assert acceptance: parsed + routed to the interpreter, no parse error.
    expect(body.errors.some((e) => e.rule === 'ENG-PARSE-01')).toBe(false);
  });

  it('runs the Schematron interpreter for XML payloads (bad date → ibr-073)', async () => {
    const xml = validUblXml().replace(
      '<cbc:IssueDate>2026-07-14</cbc:IssueDate>',
      '<cbc:IssueDate>2026/07/14</cbc:IssueDate>');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: xml,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    const rules = body.errors.map((e) => e.rule);
    // interpreter emits the real .sch id (lowercase); the route dedupes the
    // adapter's ENG-SCH-01/IBR-073 against it so the defect appears once
    expect(rules).toContain('ibr-073');
    expect(rules.some((r) => r.includes('IBR-073'))).toBe(false);
  });

  it('engine-only XML path still reports IBR-073 (free tool has no interpreter)', () => {
    const xml = validUblXml().replace(
      '<cbc:IssueDate>2026-07-14</cbc:IssueDate>',
      '<cbc:IssueDate>2026/07/14</cbc:IssueDate>');
    const r = validateInvoice(xml, 'application/xml'); // engine directly — no route, no interpreter
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  it('runs the Schematron interpreter for { document } envelopes', async () => {
    const example = fs.readFileSync(
      path.join(import.meta.dirname, '..', 'schematron', 'examples', 'Standard tax invoice.xml'),
      'utf8');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: { document: example },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // the official example's known baseline failure surfaces via the
    // interpreter at the route layer
    expect(body.errors.map((e) => e.rule)).toContain('ibr-042');
  });

  it('parse-failure XML does not run the interpreter (ENG-PARSE-01 only)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: '<not-an-invoice/>',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.errors.map((e) => e.rule)).toEqual(['ENG-PARSE-01']);
  });

  it('canonical JSON keeps the ENG-SCH-01 adapter (bad date → ENG-SCH-01/IBR-073)', async () => {
    const inv = validInvoice();
    inv.issueDate = '2026/08/01';
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: inv,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.map((e) => e.rule).some((r) => r.includes('IBR-073'))).toBe(true);
  });
});
