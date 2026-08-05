/**
 * Parity test for the Schematron interpreter (app/api/src/schematron-interpreter.js).
 *
 * Mirrors the official TDD pattern from ph-schematron's
 * PeppolUAETDDValidatorTest: good documents must produce zero unexpected
 * failures; mutated documents must produce the exact expected rule IDs.
 *
 * Baseline: the 27 official PINT AE v1.0.4 example invoices (vendored from
 * docs.peppol.eu resources.zip) all share one recurring defect — a line-level
 * price AllowanceCharge with BaseAmount but no reason — so every file pins the
 * same expected failure set. Any deviation means the interpreter regressed
 * (or the .sch files changed).
 *
 * v1.0.4 restored the [TaxScheme != 'VAT'] context filter on ibr-148-ae (the
 * dev-1.03 regression that made the 10-digit TIN check match every 15-digit
 * UAE TRN) and narrowed the AllowanceCharge rule context with
 * [not(ancestor::cac:Price)] — so neither ibr-148-ae nor aligned-ibrp-057
 * appears in the baseline anymore. ibr-164-ae was removed upstream in v1.0.4
 * (replaced by the ibr-sr-63 specification-identifier wildcard check).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateSchematron } from '../src/schematron-interpreter.js';
import { validateInvoice } from '../src/rules/engine.js';
import { validUblXml } from './helpers/fixtures.js';

const EXAMPLES = path.join(import.meta.dirname, '..', 'schematron', 'examples');

// Baseline failure rule IDs per official example (see header comment).
const BASELINE = ['ibr-042'];

const EXPECTED = {
  'Buyer-PAS-identifier.xml': BASELINE,
  'Commercial invoice.xml': BASELINE,
  'Continuous.supplies.xml': BASELINE,
  'Deemed.supply.-.predefined.endpoint.xml': BASELINE,
  'Disclosed.agent.billing.xml': BASELINE,
  'Doc-level-allowance-AE-category.xml': BASELINE,
  'Doc-level-allowance-E-category.xml': BASELINE,
  'Doc-level-allowance-O-category.xml': BASELINE,
  'Doc-level-allowance-Z-category.xml': BASELINE,
  'Doc-level-charge-AE-category.xml': BASELINE,
  'Doc-level-charge-E-category.xml': BASELINE,
  'Doc-level-charge-O-category.xml': BASELINE,
  'Doc-level-charge-Z-category.xml': BASELINE,
  'Exports.-.predefined.endpoint.xml': BASELINE,
  'Exports.xml': BASELINE,
  'Margin scheme.xml': BASELINE,
  'Seller-PAS-identifier.xml': BASELINE,
  'Seller-TIN-identifier.xml': BASELINE,
  'Standard invoice Mandatory fields.xml': BASELINE,
  'Standard tax invoice.xml': BASELINE,
  'Standard.invoice.-.Extensive.xml': BASELINE,
  'Standard.tax.invoice.-.predefined.endpoint.xml': BASELINE,
  'Summary tax invoice.xml': BASELINE,
  'Supply involving free trade zone.xml': BASELINE,
  'Supply through e-commerce.xml': BASELINE,
  'Supply under Reverse charge mechanism.xml': BASELINE,
  'Zero rated supplies.xml': BASELINE,
};

const STANDARD = fs.readFileSync(path.join(EXAMPLES, 'Standard tax invoice.xml'), 'utf8');

describe('schematron interpreter parity', () => {
  it('walks all 302 asserts from both .sch files', () => {
    const r = validateSchematron(STANDARD);
    expect(r.totalAsserts).toBe(302);
    expect(r.evaluated).toBeGreaterThan(200);
    expect(r.evalErrors).toEqual([]);
  });

  for (const [file, expectedIds] of Object.entries(EXPECTED)) {
    it(`example ${file} fails exactly ${expectedIds.join(' + ')}`, () => {
      const r = validateSchematron(fs.readFileSync(path.join(EXAMPLES, file), 'utf8'));
      expect(r.evalErrors).toEqual([]);
      expect(r.evaluated).toBeGreaterThan(200);
      const got = [...new Set(r.errors.map((e) => e.rule))].sort();
      expect(got).toEqual([...expectedIds].sort());
    });
  }

  it('emits the engine error shape for every failure', () => {
    const r = validateSchematron(STANDARD);
    expect(r.errors.length).toBeGreaterThan(0);
    for (const e of r.errors) {
      expect(typeof e.path).toBe('string');
      expect(e.rule).toBeTruthy();
      expect(e.severity).toBe('error'); // all PINT AE asserts are flag="fatal"
      expect(e.message.length).toBeGreaterThan(10);
      expect(e.fix).toBe('');
    }
  });

  it('bad TRN fires ibr-132-ae (mirrors testReadTDD10Bad)', () => {
    const broken = STANDARD.replace('198765432102003', '123');
    const r = validateSchematron(broken);
    const ids = new Set(r.errors.map((e) => e.rule));
    expect(ids).toContain('ibr-132-ae');
    expect(r.evalErrors).toEqual([]);
  });

  it('missing invoice number fires ibr-002', () => {
    const broken = STANDARD.replace('<cbc:ID>AE-01TEST</cbc:ID>', '');
    const r = validateSchematron(broken);
    const ids = new Set(r.errors.map((e) => e.rule));
    expect(ids).toContain('ibr-002');
    expect(r.evalErrors).toEqual([]);
  });

  // v1.0.4 removed ibr-164-ae upstream and added ibr-sr-63: the Specification
  // identifier (IBT-024) must not contain a wildcard '*' character. The
  // Standard example's CustomizationID is urn:peppol:pint:billing-1@ae-1.
  it('wildcard in Specification identifier fires ibr-sr-63', () => {
    const broken = STANDARD.replace(
      '<cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>',
      '<cbc:CustomizationID>urn:peppol:pint:billing-*@ae-1</cbc:CustomizationID>'
    );
    const r = validateSchematron(broken);
    const ids = new Set(r.errors.map((e) => e.rule));
    expect(ids).toContain('ibr-sr-63');
    expect(r.evalErrors).toEqual([]);
  });
});

/** Minimal fully-valid AED invoice DTO (matches normalize.js canonical shape). */
function validInvoice() {
  return {
    invoiceType: '380',
    invoiceNumber: 'INV-0001',
    issueDate: '2026-08-01',
    currency: 'AED',
    supplier: { trn: '100000000000003', name: 'Supplier' },
    customer: { trn: '300000000000003', name: 'Buyer' },
    lines: [
      { itemName: 'Consulting', quantity: 1, unitPrice: 100, lineExtensionAmount: 100, taxCategory: { code: 'S', rate: 5 } },
    ],
    taxSubtotals: [{ taxableAmount: 100, taxAmount: 5, category: { code: 'S', rate: 5 } }],
    totals: { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxAmount: 5, taxInclusiveAmount: 105, payableAmount: 105 },
  };
}

describe('Schematron engine rule adapter (ENG-SCH-01)', () => {
  it('accepts a valid invoice with no schema errors', () => {
    const r = validateInvoice(validInvoice());
    expect(r.valid).toBe(true);
    expect(r.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('flags IBR-073 when issue date is not YYYY-MM-DD', () => {
    const inv = validInvoice();
    inv.issueDate = '2026/08/01';
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  it('flags IBR-073 for dd-mmm-yyyy dates', () => {
    const inv = validInvoice();
    inv.issueDate = '1-Aug-2026';
    const r = validateInvoice(inv);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  it('flags IBR-CO-11 when prepaid exceeds payable', () => {
    const inv = validInvoice();
    inv.prepaidAmount = 500;
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-CO-11'))).toBe(true);
  });

  // The adapter always runs its date check — the API route dedupes against
  // the interpreter's ibr-073 assert for XML payloads (see schematronRule
  // comment and routes/validate.js); the web tool has no interpreter, so
  // this check is its only date coverage.
  it('reports the IBR-073 date check for ubl-xml input (adapter always runs)', () => {
    const xml = validUblXml().replace(
      '<cbc:IssueDate>2026-07-14</cbc:IssueDate>',
      '<cbc:IssueDate>2026/07/14</cbc:IssueDate>');
    const r = validateInvoice(xml, 'application/xml');
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  // IBR-CO-11 has no .sch equivalent (the .sch only has the stronger ibr-co-16
  // equality), so the adapter keeps it on both paths.
  it('keeps the IBR-CO-11 prepaid check for ubl-xml input', () => {
    const xml = validUblXml().replace(
      '<cbc:PayableAmount currencyID="AED">630.00</cbc:PayableAmount>',
      '<cbc:PrepaidAmount currencyID="AED">700.00</cbc:PrepaidAmount>\n    <cbc:PayableAmount currencyID="AED">630.00</cbc:PayableAmount>');
    const r = validateInvoice(xml, 'application/xml');
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-CO-11'))).toBe(true);
  });
});
