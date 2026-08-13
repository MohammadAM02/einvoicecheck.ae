import { describe, it, expect } from 'vitest';
import { validateInvoice } from '../src/rules/engine.js';
import { validInvoice, brokenInvoice, validUblXml } from './helpers/fixtures.js';

describe('rule engine (unit, no I/O)', () => {
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
    expect(rules.some((x) => x.startsWith('ENG-TRN'))).toBe(true); // bad 15-digit TRN
    expect(rules.some((x) => x.startsWith('ENG-VAT'))).toBe(true); // rate 8 != 5
    expect(rules.some((x) => x.startsWith('ENG-LINE'))).toBe(true); // 999 != 10*50
    expect(rules.some((x) => x.startsWith('ENG-TOT'))).toBe(true); // tax-inclusive mismatch
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

  // ─── AE reverse-charge invariant (R2 / A-004, A-005) ────────────────────

  const aeBase = () => ({
    invoiceType: '380',
    invoiceNumber: 'INV-AE-001',
    issueDate: '2026-07-14',
    currency: 'AED',
    supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
    customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
    allowanceTotal: 0,
    chargeTotal: 0,
    prepaidAmount: 0,
    roundingAmount: 0,
  });

  const aeLine = { id: '1', quantity: 1, unitPrice: 100, lineExtensionAmount: 100, taxCategory: { code: 'AE', rate: 5 }, itemName: 'Consulting' };

  it('rejects canonical AE input with non-zero seller tax (A-004)', () => {
    const inv = aeBase();
    inv.lines = [aeLine];
    inv.taxSubtotals = [{ taxableAmount: 100, taxAmount: 5, category: { code: 'AE', rate: 5 } }];
    inv.totals = { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxAmount: 5, taxInclusiveAmount: 105, payableAmount: 105 };
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    const aeErr = r.errors.find((e) => e.rule.includes('ENG-TAX-10'));
    expect(aeErr).toBeDefined();
    expect(aeErr.message).toMatch(/AE/i);
    expect(aeErr.fix).toBeTruthy();
  });

  it('accepts canonical AE notional-rate input with zero seller tax (A-005)', () => {
    const inv = aeBase();
    inv.lines = [aeLine];
    inv.taxSubtotals = [{ taxableAmount: 100, taxAmount: 0, category: { code: 'AE', rate: 5 } }];
    inv.totals = { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxAmount: 0, taxInclusiveAmount: 100, payableAmount: 100 };
    const r = validateInvoice(inv);
    expect(r.valid).toBe(true);
  });

  it('keeps document tax totals reconciling with AE zero-tax subtotals', () => {
    const inv = aeBase();
    inv.lines = [aeLine];
    inv.taxSubtotals = [{ taxableAmount: 100, taxAmount: 0, category: { code: 'AE', rate: 5 } }];
    inv.totals = { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxAmount: 0, taxInclusiveAmount: 100, payableAmount: 100 };
    const r = validateInvoice(inv);
    expect(r.errors.some((e) => e.rule.startsWith('ENG-TOT'))).toBe(false);
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
});
