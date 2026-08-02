import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { XMLValidator } from 'fast-xml-parser';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { parseUblInvoice, validateInvoice } from '@einvoicecheck/rules';
import { convert, ENGINE_VERSION } from '../src/rules/convert/index.js';
import { convertWithRepairers } from '../src/rules/convert/pipeline.js';
import { fingerprint } from '../src/rules/convert/fingerprint.js';
import { textOf, numOf } from '../src/rules/convert/xmltext.js';

const fixture = (name) =>
  readFileSync(new URL(`./fixtures/convert/${name}`, import.meta.url), 'utf8');

const rulesOf = (audit) => [...new Set(audit.map((a) => a.rule))];
const blockedRules = (blocked) => [...new Set(blocked.map((b) => b.rule))];

describe('converter engine (app/api/src/rules/convert)', () => {
  it('1. valid XML passes through unchanged (NOOP invariant)', () => {
    const xml = fixture('00-valid.xml');
    const r = convert(xml);
    expect(r.status).toBe('NOOP');
    expect(r.output).toBe(xml); // original bytes, DOM never serialized
    expect(r.outputHash).toBe(r.inputHash);
    expect(r.audit).toEqual([]);
    expect(r.blocked).toEqual([]);
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(new Date(r.convertedAt).toISOString()).toBe(r.convertedAt);
  });

  it('2. format-only defects repaired (4 rules fire, data unchanged)', () => {
    const xml = fixture('01-format-only.xml');
    const r = convert(xml);
    expect(r.status).toBe('CONVERTED');
    const rules = rulesOf(r.audit);
    for (const rule of ['FMT-CHARS-01', 'FMT-DECL-01', 'FMT-PREFIX-01', 'FMT-NS-01']) {
      expect(rules).toContain(rule);
    }
    // Output is well-formed, utf-8 declaration preserved, no illegal chars,
    // prefixes normalized, correct namespace URIs.
    expect(XMLValidator.validate(r.output)).toBe(true);
    expect(r.output).toContain('encoding="utf-8"');
    expect(r.output).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/);
    expect(r.output).not.toMatch(/Cbc:|CAC:|Cac:/);
    expect(r.output).toContain('xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"');
    // Data integrity: fingerprint before == fingerprint after.
    expect(fingerprint(parseUblInvoice(r.output))).toBe(fingerprint(parseUblInvoice(xml)));
  });

  it('3. data-semantic errors refused (no output)', () => {
    const r = convert(fixture('02-data-semantic.xml'));
    expect(r.status).toBe('REFUSED');
    expect(r.reason).toBe('DATA_SEMANTIC');
    expect(r.blocked.length).toBeGreaterThanOrEqual(4);
    const rules = blockedRules(r.blocked);
    expect(rules.some((x) => x.startsWith('ENG-TRN'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-LINE'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-TAX'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-TOT'))).toBe(true);
    expect(r.output).toBeUndefined();
  });

  it('4. mixed format+data: refuse, no partial repair, wouldFix reports format work', () => {
    const r = convert(fixture('03-mixed.xml'));
    expect(r.status).toBe('REFUSED');
    expect(r.reason).toBe('DATA_SEMANTIC');
    expect(r.blocked.length).toBeGreaterThan(0);
    expect(r.wouldFix).toEqual(expect.arrayContaining(['FMT-PREFIX-01']));
    expect(r.output).toBeUndefined(); // original preserved
  });

  it('5. unrepairable structure refused, never guessed', () => {
    const r = convert(fixture('04-unrepairable.xml'));
    expect(r.status).toBe('REFUSED');
    expect(r.reason).toBe('UNREPAIRABLE_FORMAT');
    expect(r.output).toBeUndefined();
  });

  it('6. missing namespace declaration repaired (FMT-NS-02, single audit entry)', () => {
    const xml = fixture('05-missing-ns.xml');
    const r = convert(xml);
    expect(r.status).toBe('CONVERTED');
    expect(r.audit).toHaveLength(1);
    expect(r.audit[0].rule).toBe('FMT-NS-02');
    expect(XMLValidator.validate(r.output)).toBe(true);
    expect(fingerprint(parseUblInvoice(r.output))).toBe(fingerprint(parseUblInvoice(xml)));
  });

  it('7. adversarial: rogue repairer mutating data is caught by the fingerprint guard', () => {
    const rogue = (doc) => {
      const audit = [];
      const ids = doc.getElementsByTagName('cbc:ID');
      for (let i = 0; i < ids.length; i++) {
        ids.item(i).textContent = 'HACKED-999';
        audit.push({
          rule: 'ROGUE-01', action: 'replace',
          target: `/Invoice/cbc:ID[${i}]`, old: 'INV-0001', new: 'HACKED-999',
          reason: 'rogue repairer used by adversarial test',
        });
      }
      return { changed: audit.length > 0, audit };
    };
    const r = convertWithRepairers(fixture('00-valid.xml'), {}, [rogue]);
    expect(r.status).toBe('ERROR');
    expect(r.reason).toBe('DATA_CHANGED');
    expect(r.output).toBeUndefined();
  });

  it('8. DOM round-trip preserves XML structure and data', () => {
    const xml = fixture('00-valid.xml');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const round = new XMLSerializer().serializeToString(doc);
    const before = parseUblInvoice(xml);
    const after = parseUblInvoice(round);
    expect(after.invoiceNumber).toBe(before.invoiceNumber);
    expect(after.lines.length).toBe(before.lines.length);
    expect(fingerprint(after)).toBe(fingerprint(before));
  });

  it('9. empty/missing TRN is a data error the converter must not invent', () => {
    const xml = fixture('00-valid.xml').replace('>100000000000003<', '><');
    const r = convert(xml);
    expect(r.status).toBe('REFUSED');
    expect(r.reason).toBe('DATA_SEMANTIC');
    expect(blockedRules(r.blocked).some((x) => x.startsWith('ENG-TRN-01'))).toBe(true);
  });

  it('10. fast-xml-parser #text unwrapping (textOf/numOf, never silent skip)', () => {
    expect(textOf({ '#text': '500.00', '@_currencyID': 'AED' })).toBe('500.00');
    expect(numOf({ '#text': '500.00', '@_currencyID': 'AED' })).toBe(500);
    expect(numOf(null)).toBe(null);
    // Integration: attributed amounts in real XML reach the engine as numbers.
    const xml = fixture('00-valid.xml');
    const inv = parseUblInvoice(xml);
    expect(inv.lines[0].unitPrice).toBe(100);
    expect(inv.lines[0].lineExtensionAmount).toBe(100);
    // A non-numeric amount must block, not silently pass (Fault #1 guard).
    const broken = xml.replace('>100.00</cbc:LineExtensionAmount>', '>abc</cbc:LineExtensionAmount>');
    const v = validateInvoice(broken, 'application/xml');
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.rule.startsWith('ENG-LINE-04'))).toBe(true);
  });

  it('11. format mode repairs and reports data issues as warnings, never refuses', () => {
    const r = convert(fixture('02-data-semantic.xml'), { mode: 'format' });
    expect(['CONVERTED', 'NOOP']).toContain(r.status);
    expect(r.dataIssues.length).toBeGreaterThanOrEqual(4);
    expect(r.reason).toBeUndefined();
  });

  it('12. unbound wrong-case prefix: pinned outcome, never ERROR or throw', () => {
    const xml = fixture('06-unbound-prefix.xml');
    let r;
    expect(() => { r = convert(xml); }).not.toThrow();
    expect(['CONVERTED', 'REFUSED']).toContain(r.status);
    if (r.status === 'REFUSED') {
      expect(r.reason).toBe('UNREPAIRABLE_FORMAT');
    } else {
      const rules = rulesOf(r.audit);
      expect(rules).toContain('FMT-PREFIX-01');
      expect(rules).toContain('FMT-NS-02');
      expect(XMLValidator.validate(r.output)).toBe(true);
      expect(fingerprint(parseUblInvoice(r.output))).toBe(fingerprint(parseUblInvoice(xml)));
    }
  });
});

