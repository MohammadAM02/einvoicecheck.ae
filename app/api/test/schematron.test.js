import { describe, it, expect } from 'vitest';
import { validateInvoice } from '../src/rules/engine.js';

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

describe('Schematron layer (PINT AE rules)', () => {
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

  it('flags IBR-073 for calendar-invalid YYYY-MM-DD strings', () => {
    const inv = validInvoice();
    inv.issueDate = '2026-13-45';
    const r = validateInvoice(inv);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-073'))).toBe(true);
  });

  it('flags IBR-CO-11 when prepaid exceeds payable', () => {
    const inv = validInvoice();
    inv.prepaidAmount = 120;
    inv.totals.payableAmount = 105;
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-CO-11'))).toBe(true);
  });

  it('allows prepaid up to payable (IBR-CO-11)', () => {
    const inv = validInvoice();
    inv.prepaidAmount = 105;
    inv.totals.payableAmount = 105;
    const r = validateInvoice(inv);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBR-CO-11'))).toBe(false);
  });
});
