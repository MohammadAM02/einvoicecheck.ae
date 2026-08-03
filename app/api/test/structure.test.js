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
      { id: '1', itemName: 'Consulting', quantity: 1, unitPrice: 100, lineExtensionAmount: 100, taxCategory: { code: 'S', rate: 5 } },
    ],
    taxSubtotals: [{ taxableAmount: 100, taxAmount: 5, category: { code: 'S', rate: 5 } }],
    totals: { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxAmount: 5, taxInclusiveAmount: 105, payableAmount: 105 },
  };
}

describe('XSD-lite structural layer (PINT AE)', () => {
  it('accepts a valid invoice with no structural errors', () => {
    const r = validateInvoice(validInvoice());
    expect(r.valid).toBe(true);
    expect(r.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
  });

  it('flags a non-PINT CustomizationID (IBT-024 value / IBR-001)', () => {
    const inv = validInvoice();
    inv.schemaVersion = 'urn:custom:not-pint';
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('IBT-024'))).toBe(true);
  });

  it('accepts the default PINT AE schema version when absent', () => {
    const inv = validInvoice();
    delete inv.schemaVersion;
    expect(validateInvoice(inv).valid).toBe(true);
  });

  it('flags invoice numbers longer than 16 characters (BT-1)', () => {
    const inv = validInvoice();
    inv.invoiceNumber = 'X'.repeat(17);
    const r = validateInvoice(inv);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('ENG-XSD') && x.includes('BT-1'))).toBe(true);
  });

  it('allows a 16-character invoice number (BT-1 boundary)', () => {
    const inv = validInvoice();
    inv.invoiceNumber = 'X'.repeat(16);
    expect(validateInvoice(inv).valid).toBe(true);
  });

  it('flags duplicate line ids (IBR-CO-18 style uniqueness)', () => {
    const inv = validInvoice();
    inv.lines.push({ id: '1', itemName: 'Second', quantity: 1, unitPrice: 1, lineExtensionAmount: 1, taxCategory: { code: 'S', rate: 5 } });
    inv.totals = { lineExtensionAmount: 101, taxExclusiveAmount: 101, taxAmount: 5.05, taxInclusiveAmount: 106.05, payableAmount: 106.05 };
    inv.taxSubtotals = [{ taxableAmount: 101, taxAmount: 5.05, category: { code: 'S', rate: 5 } }];
    const r = validateInvoice(inv);
    expect(r.errors.map((e) => e.rule).some((x) => x.includes('ENG-XSD') && x.includes('BT-126'))).toBe(true);
  });
});
