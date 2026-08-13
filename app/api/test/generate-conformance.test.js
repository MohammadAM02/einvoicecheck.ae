/**
 * Generator conformance (R1 / A-001, A-002, A-003):
 * generated XML must pass the COMPLETE validateXmlDocument() pipeline
 * (format + structure + semantic), carry the PINT-AE Billing type codes
 * (380 standard / 480 summary), and generation must fail closed when the
 * resulting XML does not pass the full pipeline.
 */
import { describe, it, expect } from 'vitest';
import { generateInvoice } from '../src/rules/generate/generate.js';
import { validateXmlDocument } from '../src/rules/xml-validation.js';

const base = {
  invoiceNumber: 'INV-001',
  issueDate: '2026-01-15',
  dueDate: '2026-02-15',
  supplier: { trn: '100000000000003', name: 'Acme Corp' },
  customer: { trn: '100000000000403', name: 'Buyer Inc' },
};

const typeCode = (xml, root) => {
  const m = xml.match(new RegExp(`<cbc:${root}TypeCode[^>]*>([^<]+)</cbc:${root}TypeCode>`));
  return m ? m[1] : null;
};

describe('generator full-pipeline conformance', () => {
  it('standard-tax-invoice → passes the full pipeline and carries type 380', () => {
    const { xml } = generateInvoice({
      template: 'standard-tax-invoice',
      data: { ...base, lines: [{ name: 'Widget', quantity: 10, unitPrice: 100, category: 'S' }] },
    });
    expect(typeCode(xml, 'Invoice')).toBe('380');
    const v = validateXmlDocument(xml);
    expect(v.valid).toBe(true);
    expect(v.format.status).toBe('passed');
    expect(v.structure.status).toBe('passed');
    expect(v.semantic.status).toBe('passed');
  });

  it('summary-tax-invoice → passes the full pipeline and carries type 480', () => {
    const { xml } = generateInvoice({
      template: 'summary-tax-invoice',
      data: {
        ...base,
        lines: [
          { name: 'Widget A', quantity: 5, unitPrice: 100, category: 'Z' },
          { name: 'Widget B', quantity: 2, unitPrice: 200, category: 'E' },
        ],
      },
    });
    expect(typeCode(xml, 'Invoice')).toBe('480');
    const v = validateXmlDocument(xml);
    expect(v.valid).toBe(true);
    expect(v.semantic.status).toBe('passed');
  });

  it('standard-tax-credit-note → passes the full pipeline (regression, type 381)', () => {
    const { xml } = generateInvoice({
      template: 'standard-tax-credit-note',
      data: { ...base, lines: [{ name: 'Returned Widget', quantity: 2, unitPrice: 50, category: 'S' }] },
    });
    expect(typeCode(xml, 'CreditNote')).toBe('381');
    const v = validateXmlDocument(xml);
    expect(v.valid).toBe(true);
    expect(v.semantic.status).toBe('passed');
  });

  it('fails closed: rejects generated XML that does not pass the full pipeline', () => {
    // 15-digit TRN that passes the generator input check but fails the
    // PINT-AE pipeline (ibr-132-ae: TRN must start with 1 and end with 03).
    const bad = {
      ...base,
      supplier: { trn: '123456789012345', name: 'Acme Corp' },
    };
    expect(() =>
      generateInvoice({
        template: 'standard-tax-invoice',
        data: { ...bad, lines: [{ name: 'Widget', quantity: 10, unitPrice: 100, category: 'S' }] },
      })
    ).toThrow();
  });
});
