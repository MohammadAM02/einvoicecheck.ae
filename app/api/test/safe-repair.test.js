/**
 * Validator-integrated safe repair (Part B) tests.
 *
 * Module level: analyzeSafeRepair() builds at most the two approved metadata
 * repairs (encoding declaration normalization, missing exact-lowercase
 * cbc/cac declarations), reports everything else as diagnosis-only findings,
 * and fingerprints the UNTOUCHED original before any mutation.
 *
 * Route level: POST /v2/validate attaches the analysis additively, judges the
 * candidate through the complete validateXmlDocument() pipeline (XSD +
 * Schematron + engine), and materializes repaired XML only on an explicit
 * ?repair=apply request. POST /v1/convert is gone.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeSafeRepair, CBC_URI, CAC_URI, dataFingerprint } from '../src/rules/safe-repair.js';
import { generateInvoice } from '../src/rules/generate/index.js';
import { parseUblInvoice } from '../src/rules/xml.js';
import { startTestApp, stopTestApp } from './helpers/testApp.js';

const RPL = String.fromCharCode(0xfffd); // U+FFFD replacement character
const BEL = String.fromCharCode(0x07); // forbidden XML 1.0 control character

/**
 * A document that passes the complete validateXmlDocument() pipeline — the
 * generator's own gate guarantees it. Repair fixtures derive from this so
 * candidate-validity assertions stay truthful without hand-maintained XML.
 */
function generatedXml() {
  return generateInvoice({
    template: 'standard-tax-invoice',
    data: {
      invoiceNumber: 'INV-SR-001',
      issueDate: '2026-08-01',
      supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
      customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
      lines: [{ name: 'Widget A', quantity: 10, unitPrice: 50, category: 'S' }],
    },
  }).xml;
}

function withIsoDecl(xml) {
  return xml.replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
}

function withoutCbcDecl(xml) {
  return xml.replace(/\r?\n\s*xmlns:cbc="[^"]*"/, '');
}

function withoutCacDecl(xml) {
  return xml.replace(/\r?\n\s*xmlns:cac="[^"]*"/, '');
}

function toMixedCaseCbc(xml) {
  return xml
    .split('xmlns:cbc=').join('xmlns:Cbc=')
    .split('<cbc:').join('<Cbc:')
    .split('</cbc:').join('</Cbc:');
}

/** line/column of a char index (mirrors the module's locate()) for assertions. */
function locate(xml, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < xml.length; i += 1) {
    if (xml.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, charIndex: index };
}

describe('safe-repair analysis (app/api/src/rules/safe-repair.js)', () => {
  it('rewrites ISO-8859-1 -> utf-8 on a cleanly decoded document with an audited change', () => {
    const xml = withIsoDecl(generatedXml());
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(true);
    expect(r.candidate).not.toBeNull();
    expect(r.candidate.candidateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.candidate.candidateHash).not.toBe(r.originalHash);
    expect(r.candidate.strictEligible).toBe(true);
    expect(r.candidate.validation.valid).toBe(true);
    // The candidate XML is never part of the analysis — repair output only
    // exists behind an explicit UI action that verifies candidateHash.
    expect('xml' in r.candidate).toBe(false);

    const decl = r.candidate.audit.find((a) => a.rule === 'FMT-DECL-01');
    expect(decl).toBeTruthy();
    expect(decl.action).toBe('replace');
    expect(decl.old).toContain('ISO-8859-1');
    expect(decl.new).toContain('utf-8');
    expect(decl.target).toBe('/processing-instruction(xml)');
  });

  it('refuses the encoding repair when the decode is corrupted (U+FFFD) and reports a diagnosis', () => {
    const xml = withIsoDecl(generatedXml().replace('Widget A', `Widg${RPL}t A`));
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    const f = r.findings.find((b) => b.rule === 'ENG-FMT-DECL-01');
    expect(f).toBeTruthy();
    expect(f.message).toContain('U+FFFD');
    expect(f.fix).toMatch(/UTF-8/);
  });

  it('adds a missing exact-lowercase cbc declaration on an expected UBL root', () => {
    const xml = withoutCbcDecl(generatedXml());
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(true);
    expect(r.findings).toEqual([]);
    const entry = r.candidate.audit.find((a) => a.rule === 'FMT-NS-02');
    expect(entry).toBeTruthy();
    expect(entry.action).toBe('add');
    expect(entry.target).toBe('/Invoice/@xmlns:cbc');
    expect(entry.old).toBe('(missing)');
    expect(entry.new).toBe(CBC_URI);
    expect('xml' in r.candidate).toBe(false);
  });

  it('adds a missing cbc and cac declaration together when both are unbound', () => {
    const xml = withoutCacDecl(withoutCbcDecl(generatedXml()));
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(true);
    const entries = r.candidate.audit.filter((a) => a.rule === 'FMT-NS-02');
    expect(entries).toHaveLength(2);
    expect(entries.map((a) => a.new)).toEqual(expect.arrayContaining([CBC_URI, CAC_URI]));
  });

  it('reports a wrong existing namespace URI without ever replacing it', () => {
    const wrong = CBC_URI.replace('BasicComponents-2', 'BasicComponents-3');
    const xml = generatedXml().replace(CBC_URI, wrong);
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    const f = r.findings.find((b) => b.rule === 'ENG-FMT-NS-URI-01');
    expect(f).toBeTruthy();
    expect(f.message).toContain(wrong);
    expect(f.message).toContain(CBC_URI);
    expect(f.path).toContain('@xmlns:cbc');
  });

  it('leaves valid mixed-case namespace aliases untouched and warns about nothing', () => {
    const xml = toMixedCaseCbc(generatedXml());
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    expect(r.findings).toEqual([]);
  });

  it('reports an unbound mixed-case alias as a binding error and never auto-binds it', () => {
    const xml = toMixedCaseCbc(withoutCbcDecl(generatedXml()));
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    const f = r.findings.find((b) => b.rule === 'ENG-FMT-NS-BIND-01');
    expect(f).toBeTruthy();
    expect(f.message).toContain('Cbc');
  });

  it('reports a missing/incorrect root namespace as diagnosis-only and never repairs it', () => {
    const xml = withoutCbcDecl(generatedXml()).replace(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:wrong:root-2'
    );
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    const f = r.findings.find((b) => b.rule === 'ENG-FMT-ROOT-NS-01');
    expect(f).toBeTruthy();
    expect(f.message).toContain('urn:wrong:root-2');
  });

  it('detects forbidden characters with exact positions and never deletes them', () => {
    const xml = generatedXml().replace('Widget A', `Widg${BEL}et A`);
    const index = xml.indexOf(BEL);
    const expected = locate(xml, index);

    const r = analyzeSafeRepair(xml);
    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();

    const f = r.findings[0];
    expect(f.rule).toBe('ENG-FMT-CHARS-01');
    expect(f.message).toContain('U+0007');
    expect(f.message).toContain(`line ${expected.line}, column ${expected.column}`);
    expect(f.line).toBe(expected.line);
    expect(f.column).toBe(expected.column);
    expect(f.charIndex).toBe(index);
  });

  it('fingerprint guard aborts an injected repair that changes business values', () => {
    const rogue = {
      fixEncodingDecl(xml, audit) {
        audit.push({ rule: 'FMT-DECL-01', action: 'replace', target: '/processing-instruction(xml)', old: 'x', new: 'y', reason: 'test' });
        return xml.replace('INV-SR-001', 'XXX-SR-001');
      },
      addMissingNsDecl(xml) {
        return xml;
      },
    };
    const r = analyzeSafeRepair(generatedXml(), { repairers: rogue });

    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    expect(r.findings.some((b) => b.rule === 'ENG-FMT-GUARD-01')).toBe(true);
    expect(r.findings.some((b) => b.message.includes('business values'))).toBe(true);
  });

  it('aborts when the candidate cannot be parsed (guard, not crash)', () => {
    const rogue = {
      fixEncodingDecl(xml, audit) {
        audit.push({ rule: 'FMT-DECL-01', action: 'replace', target: '/processing-instruction(xml)', old: 'x', new: 'y', reason: 'test' });
        return xml.replace('</Invoice>', '</Broken>');
      },
      addMissingNsDecl(xml) {
        return xml;
      },
    };
    const r = analyzeSafeRepair(generatedXml(), { repairers: rogue });

    expect(r.available).toBe(false);
    expect(r.findings.some((b) => b.rule === 'ENG-FMT-GUARD-01')).toBe(true);
  });

  it('returns no candidate and no findings for a clean document (nothing to repair)', () => {
    const r = analyzeSafeRepair(generatedXml());
    expect(r.available).toBe(false);
    expect(r.candidate).toBeNull();
    expect(r.findings).toEqual([]);
  });

  it('handles empty and non-string input without throwing', () => {
    for (const input of ['', '   ', null, undefined, 42]) {
      const r = analyzeSafeRepair(input);
      expect(r.available).toBe(false);
      expect(r.candidate).toBeNull();
      expect(r.findings).toEqual([]);
    }
  });

  it('fingerprint baseline comes from the untouched original (pre-mutation parse)', () => {
    // The original with the ISO-8859-1 declaration must fingerprint the same
    // business model as the repaired candidate — proving the baseline is
    // taken BEFORE any mutation and that a metadata repair changes no data.
    const xml = withIsoDecl(generatedXml().replace('Widget A', 'Café Widget A'));
    const manuallyRepaired = xml.replace('encoding="ISO-8859-1"', 'encoding="utf-8"');
    const r = analyzeSafeRepair(xml);

    expect(r.available).toBe(true);
    expect(dataFingerprint(parseUblInvoice(xml)))
      .toBe(dataFingerprint(parseUblInvoice(manuallyRepaired)));
  });
});

describe('POST /v2/validate safe-repair integration (additive)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await startTestApp();
  });
  afterAll(async () => {
    await stopTestApp(ctx);
  });

  const auth = () => ({ 'x-api-key': ctx.rawKey });
  const postXml = (xml, query = '') =>
    ctx.app.inject({
      method: 'POST',
      url: `/v2/validate${query}`,
      headers: { ...auth(), 'content-type': 'application/xml' },
      payload: xml,
    });

  it('missing cbc declaration: candidate added, judged by the full pipeline, Strict-eligible', async () => {
    const res = await postXml(withoutCbcDecl(generatedXml()));
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.valid).toBe(false);
    expect(body.safeRepair).toBeTruthy();
    expect(body.safeRepair.available).toBe(true);
    expect(body.safeRepair.findings).toEqual([]);
    expect(body.safeRepair.candidate).not.toBeNull();
    expect(body.safeRepair.candidate.audit.some((a) => a.rule === 'FMT-NS-02')).toBe(true);

    // Full candidate validation: XSD structure AND Schematron/engine semantics.
    expect(body.safeRepair.candidate.validation.valid).toBe(true);
    expect(body.safeRepair.candidate.validation.structure.status).toBe('passed');
    expect(body.safeRepair.candidate.validation.semantic.status).toBe('passed');
    expect(body.safeRepair.candidate.strictEligible).toBe(true);
    expect(body.safeRepair.candidate.candidateHash).toMatch(/^[0-9a-f]{64}$/);
    // Ordinary validation never returns the repaired XML itself.
    expect('xml' in body.safeRepair.candidate).toBe(false);
  });

  it('encoding normalization: candidate judged by the full pipeline, Strict-eligible', async () => {
    const xml = withIsoDecl(generatedXml().replace('Widget A', 'Café Widget A'));
    const res = await postXml(xml);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // The engine treats U+FFFD as a legal XML 1.0 character, so the base
    // result is valid; the encoding-declaration inconsistency is surfaced as
    // a diagnosis finding on the additive safeRepair block.
    expect(body.valid).toBe(true);
    expect(body.safeRepair.available).toBe(true);
    expect(body.safeRepair.candidate.strictEligible).toBe(true);
    expect(body.safeRepair.candidate.validation.valid).toBe(true);
    expect(body.safeRepair.candidate.audit.some((a) => a.rule === 'FMT-DECL-01')).toBe(true);
    expect('xml' in body.safeRepair.candidate).toBe(false);
  });

  it('corrupted decode: diagnosis-only, no candidate exposed', async () => {
    const xml = withIsoDecl(generatedXml().replace('Widget A', `Widg${RPL}t A`));
    const res = await postXml(xml);
    const body = res.json();

    // Same engine-truth note: U+FFFD is legal XML, so the base result stays
    // valid; the corrupted-decode diagnosis rides on the safeRepair block.
    expect(body.valid).toBe(true);
    expect(body.safeRepair.available).toBe(false);
    expect(body.safeRepair.candidate).toBeNull();
    expect(body.safeRepair.findings.some((b) => b.rule === 'ENG-FMT-DECL-01')).toBe(true);
  });

  it('forbidden characters: diagnosis with position, never mutated', async () => {
    const xml = generatedXml().replace('Widget A', `Widg${BEL}et A`);
    const res = await postXml(xml);
    const body = res.json();

    expect(body.valid).toBe(false);
    expect(body.safeRepair.available).toBe(false);
    expect(body.safeRepair.candidate).toBeNull();
    const f = body.safeRepair.findings.find((b) => b.rule === 'ENG-FMT-CHARS-01');
    expect(f).toBeTruthy();
    expect(f.message).toContain('U+0007');
    expect(typeof f.line).toBe('number');
    expect(typeof f.column).toBe('number');
  });

  it('omits safeRepair entirely for a valid document (base contract unchanged)', async () => {
    const res = await postXml(generatedXml());
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.safeRepair).toBeUndefined();
  });

  it('omits safeRepair when only semantic defects exist (no metadata repair applies)', async () => {
    const xml = generatedXml().replace(
      '<cbc:PayableAmount currencyID="AED">525.00</cbc:PayableAmount>',
      '<cbc:PayableAmount currencyID="AED">999.00</cbc:PayableAmount>'
    );
    const res = await postXml(xml);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.safeRepair).toBeUndefined();
  });

  it('one request remains one validation unit when a candidate is evaluated internally', async () => {
    const { UsageEvent } = await import('../src/models/UsageEvent.js');
    const before = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
    const res = await postXml(withoutCbcDecl(generatedXml()));
    expect(res.statusCode).toBe(200);
    const after = await UsageEvent.countDocuments({ keyId: ctx.apiKey._id });
    expect(after).toBe(before + 1);
  });

  it('POST /v1/convert is removed from the API', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/convert',
      headers: auth(),
      payload: { xml: generatedXml() },
    });
    expect(res.statusCode).toBe(404);
  });

  it('OpenAPI exposes no convert tag and no /v1/convert path', async () => {
    const spec = ctx.app.swagger();
    expect(spec.tags.map((t) => t.name)).not.toContain('convert');
    expect(Object.keys(spec.paths)).not.toContain('/v1/convert');
    expect(Object.keys(spec.paths)).toContain('/v2/validate');
  });
});
