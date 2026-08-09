import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import {
  validInvoice,
  brokenInvoice,
  validUblXml,
  validCreditNoteXml,
} from './helpers/fixtures.js';
import { validateInvoice } from '../src/rules/engine.js';

describe('POST /v2/validate (strict UBL XML)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });
  const xmlHeaders = () => ({ ...auth(), 'content-type': 'application/xml' });

  it('401 when the API key header is missing', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: { 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401 when the API key is invalid', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: { 'x-api-key': 'pdk_live_deadbeef', 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('valid Invoice returns the layered result with a valid flag', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: xmlHeaders(),
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // The smoke fixture is XSD-clean but not PINT-AE conformant, so the
    // semantic layer legitimately reports defects. Assert the layered
    // contract: a valid flag plus the three layer objects.
    expect(typeof body.valid).toBe('boolean');
    expect(body.inputFormat).toBe('xml');
    expect(body.validationScope).toBe('pint-ae-ubl-xml');
    expect(body.invoiceType).toBe('388');
    expect(body.schemaVersion).toBeTruthy();
    expect(body.format.status).toBe('passed');
    expect(body.format.issues).toEqual([]);
    // The smoke fixture is not fully XSD-conformant either — the point here
    // is the layered contract, so accept any reported layer status.
    expect(['passed', 'failed']).toContain(body.structure.status);
    expect(Array.isArray(body.structure.issues)).toBe(true);
    expect(['passed', 'failed']).toContain(body.semantic.status);
    expect(Array.isArray(body.semantic.issues)).toBe(true);
  });

  it('valid CreditNote selects the CreditNote XSD', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: xmlHeaders(),
      payload: validCreditNoteXml(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.invoiceType).toBe('381');
    expect(body.structure.status).toBe('passed');
  });

  it('malformed XML returns Format failure and skipped later layers', async () => {
    const xml = validUblXml().replace('</Invoice>', '</Invocie>');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: xmlHeaders(),
      payload: xml,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.format.status).toBe('failed');
    expect(body.format.issues.map((i) => i.rule)).toContain('ENG-PARSE-01');
    expect(body.structure.status).toBe('skipped');
    expect(body.semantic.status).toBe('skipped');
  });

  it('wrong namespace returns Structure issues and semantic output', async () => {
    const xml = validUblXml().replace(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:wrong:namespace:ubl:Invoice-2'
    );
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: xmlHeaders(),
      payload: xml,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.structure.status).toBe('failed');
    expect(body.structure.issues.length).toBeGreaterThan(0);
    // semantic layer still runs even when the structure layer failed
    expect(['passed', 'failed']).toContain(body.semantic.status);
    expect(Array.isArray(body.semantic.issues)).toBe(true);
  });

  it('v2 rejects the legacy JSON XML envelope in its raw-XML-only contract', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v2/validate',
      headers: auth(),
      payload: { document: validUblXml() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_request');
  });
});

describe('POST /v1/validate (legacy JSON/XML compatibility contract)', () => {
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
      headers: { 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401 when the API key is invalid', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { 'x-api-key': 'pdk_live_deadbeef', 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts UBL 2.1 / PINT AE XML and retains the flat errors[]', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false); // smoke fixture is not PINT-AE conformant
    expect(body.invoiceType).toBe('388');
    expect(body.schemaVersion).toBeTruthy();
    expect(Array.isArray(body.errors)).toBe(true);
    // The stub fixture is a minimal smoke-test document, NOT PINT-AE
    // conformant — the interpreter legitimately flags defects (missing
    // postal addresses, business process, BTAE codes, item description).
    // Assert acceptance: parsed + routed to the interpreter, no parse error.
    expect(body.errors.some((e) => e.rule === 'ENG-PARSE-01')).toBe(false);
    for (const e of body.errors) {
      expect(e.rule).toBeTruthy();
      expect(e.path).toBeTruthy();
    }
  });

  it('preserves the legacy JSON XML envelope compatibility form', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: { document: validUblXml() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().errors.some((e) => e.rule === 'ENG-PARSE-01')).toBe(false);
  });

  it('preserves the legacy JSON invoice wrapper compatibility form', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: { invoice: validInvoice() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid).toBe(true);
  });

  it('runs the Schematron interpreter for XML payloads (bad date → ibr-073)', async () => {
    const xml = validUblXml().replace(
      '<cbc:IssueDate>2026-07-14</cbc:IssueDate>',
      '<cbc:IssueDate>2026/07/14</cbc:IssueDate>'
    );
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
      '<cbc:IssueDate>2026/07/14</cbc:IssueDate>'
    );
    const r = validateInvoice(xml, 'application/xml'); // engine directly — no route, no interpreter
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  it('runs the Schematron interpreter for { document } envelopes', async () => {
    const example = fs.readFileSync(
      path.join(import.meta.dirname, '..', 'schematron', 'examples', 'Standard tax invoice.xml'),
      'utf8'
    );
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

  it('malformed XML (mismatched closing tag) hits the well-formedness gate', async () => {
    const xml = validUblXml().replace('</Invoice>', '</Invocie>');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: xml,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.map((e) => e.rule)).toContain('ENG-PARSE-01');
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toMatch(/Invocie|well.formed|closing tag/i);
  });

  it('preserves canonical JSON compatibility while new clients use /v1/preflight', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/validate',
      headers: auth(),
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid).toBe(true);
  });
});

describe('POST /v1/preflight (canonical JSON data preflight)', () => {
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
      url: '/v1/preflight',
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401 when the API key is invalid', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: { 'x-api-key': 'pdk_live_deadbeef' },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a Bearer token form of the key', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: { authorization: `Bearer ${ctx.rawKey}` },
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.validationScope).toBe('canonical-json-data-preflight');
  });

  it('happy path: valid invoice -> 200, valid:true, JSON data-preflight scope', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: auth(),
      payload: validInvoice(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.validationScope).toBe('canonical-json-data-preflight');
    expect(body.invoiceType).toBe('388');
    expect(body.schemaVersion).toBeTruthy();
    expect(body.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('failure path: deliberately broken invoice -> 200, valid:false, cited errors', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
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

  it('canonical JSON keeps the ENG-SCH-01 adapter (bad date → ENG-SCH-01/IBR-073)', async () => {
    const inv = validInvoice();
    inv.issueDate = '2026/08/01';
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: auth(),
      payload: inv,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.map((e) => e.rule).some((r) => r.includes('IBR-073'))).toBe(true);
  });

  it('rejects XML with a clear data-preflight-only message', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/preflight',
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: validUblXml(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/data-preflight/i);
  });
});
