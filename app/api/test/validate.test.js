import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestApp, stopTestApp } from './helpers/testApp.js';
import { validInvoice, brokenInvoice, validUblXml, validPintXml } from './helpers/fixtures.js';

describe('validate endpoints', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });

  describe('POST /v1/validate (semantic preflight)', () => {
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

    it('accepts UBL 2.1 / PINT AE XML via application/xml (engine-only)', async () => {
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
      // no interpreter vocabulary leaks into the semantic endpoint
      expect(body.errors.every((e) => e.rule.startsWith('ENG-'))).toBe(true);
    });
  });

  describe('POST /v1/validate/pint (PINT AE conformance)', () => {
    it('returns the full conformance report for a PINT AE document', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/validate/pint',
        headers: { ...auth(), 'content-type': 'application/xml' },
        payload: validPintXml(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.valid).toBe(true);
      expect(body.evaluated).toBeGreaterThan(200);
      expect(body.totalAsserts).toBeGreaterThanOrEqual(300);
      expect(body.errors).toHaveLength(0); // interpreter clean
      expect(body.invoiceType).toBe('380');
    });

    it('flags interpreter failures in errors and engine failures in semantic', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/validate/pint',
        headers: { ...auth(), 'content-type': 'application/xml' },
        payload: validUblXml(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.valid).toBe(false);
      const interpreterRules = body.errors.map((e) => e.rule);
      expect(interpreterRules).toContain('ibr-080'); // buyer electronic address
      expect(interpreterRules).toContain('ibr-008'); // seller postal address
      expect(interpreterRules.every((r) => r.startsWith('ENG-'))).toBe(false);
      // the two vocabularies never mix
      expect(body.semantic.every((e) => e.rule.startsWith('ENG-'))).toBe(true);
    });

    it('does not double-report the date-format rule', async () => {
      // Valid PINT AE doc with a document-level IssueDate in dd/mm/yyyy format.
      const xml = validPintXml().replace(
        '<cbc:IssueDate>2025-02-06</cbc:IssueDate>',
        '<cbc:IssueDate>06/02/2025</cbc:IssueDate>'
      );
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/validate/pint',
        headers: { ...auth(), 'content-type': 'application/xml' },
        payload: xml,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.valid).toBe(false);
      const interpreterRules = body.errors.map((e) => e.rule);
      expect(interpreterRules).toContain('ibr-073'); // interpreter's assert fires
      // JSON-path twin dropped from the semantic pass
      expect(body.semantic.some((e) => e.rule === 'ENG-SCH-01/IBR-073')).toBe(false);
    });

    it('still flags prepaid > payable in semantic (no PINT AE assert covers it)', async () => {
      const xml = validPintXml().replace(
        '<cbc:PayableAmount currencyID="AED">',
        '<cbc:PrepaidAmount currencyID="AED">99999</cbc:PrepaidAmount>\n\t\t<cbc:PayableAmount currencyID="AED">'
      );
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/validate/pint',
        headers: { ...auth(), 'content-type': 'application/xml' },
        payload: xml,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      const semanticRules = body.semantic.map((e) => e.rule);
      expect(semanticRules).toContain('ENG-SCH-01/IBT-113-LE-IBT-115');
    });

    it('rejects JSON input with 400', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/validate/pint',
        headers: auth(),
        payload: validInvoice(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('UBL 2.1 / PINT AE XML');
    });
  });
});
