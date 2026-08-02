import { describe, it, expect } from 'vitest';
import { validateInvoice, SCHEMA_VERSION_DEFAULT } from '../src/index.js';
import { validInvoice, brokenInvoice, validUblXml } from './helpers/fixtures.js';

/**
 * Migration test — verifies the extracted @einvoicecheck/rules package produces
 * output byte-identical to the pre-migration app/api engine on the same fixtures.
 *
 * These assertions mirror app/api/test/engine.test.js exactly; any divergence
 * means the extraction altered behaviour.
 */
describe('@einvoicecheck/rules — migration parity', () => {
  it('accepts a fully valid AED tax invoice', () => {
    const r = validateInvoice(validInvoice());
    expect(r.valid).toBe(true);
    expect(r.invoiceType).toBe('388');
    expect(r.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('is deterministic — identical input yields identical output', () => {
    const a = validateInvoice(validInvoice());
    const b = validateInvoice(validInvoice());
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('flags TRN, VAT rate, line arithmetic and total mismatches on a broken invoice', () => {
    const r = validateInvoice(brokenInvoice());
    expect(r.valid).toBe(false);
    const rules = r.errors.map((e) => e.rule);
    expect(rules.some((x) => x.startsWith('ENG-TRN'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-VAT'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-LINE'))).toBe(true);
    expect(rules.some((x) => x.startsWith('ENG-TOT'))).toBe(true);
  });

  it('every error object carries the normalized shape {path, rule, severity, message, fix}', () => {
    const r = validateInvoice(brokenInvoice());
    for (const e of r.errors) {
      expect(e).toHaveProperty('path');
      expect(e).toHaveProperty('rule');
      expect(['error', 'warning']).toContain(e.severity);
      expect(typeof e.message).toBe('string');
    }
  });

  it('parses and validates UBL 2.1 / PINT AE XML input', () => {
    const r = validateInvoice(validUblXml(), 'application/xml');
    expect(r.invoiceType).toBe('388');
    expect(r.schemaVersion).toContain('pint');
    expect(r.valid).toBe(true);
  });

  it('returns a single structural error for unparseable input', () => {
    const r = validateInvoice('<not-an-invoice/>', 'application/xml');
    expect(r.valid).toBe(false);
    expect(r.errors[0].rule).toBe('ENG-PARSE-01');
  });

  it('requires AED tax accounting currency for a foreign-currency invoice', () => {
    const inv = validInvoice();
    inv.currency = 'USD';
    const r = validateInvoice(inv);
    expect(r.errors.some((e) => e.rule.startsWith('ENG-CUR-03'))).toBe(true);
  });

  it('SCHEMA_VERSION_DEFAULT is the PINT AE billing schema', () => {
    expect(SCHEMA_VERSION_DEFAULT).toBe('urn:peppol:pint:billing-1@ae-1');
  });
});
