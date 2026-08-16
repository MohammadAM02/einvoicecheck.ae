/**
 * Generator import parser tests (Part A): fixed CSV and Generator JSON
 * containers. Parsing is browser-side; the backend Generator remains the
 * authoritative validator of every submitted object.
 */
import { describe, expect, it } from 'vitest';
import {
  buildImportZip,
  parseCsvImport,
  parseJsonImport,
  safeInvoiceFileName,
} from '@/lib/invoice-import';

const HEADER = 'template,invoiceNumber,issueDate,dueDate,supplierTrn,supplierName,customerTrn,customerName,lineName,quantity,unitPrice,category';

const VALID_ROW =
  'standard-tax-invoice,INV-001,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Consulting,1,1000.00,S';

describe('parseCsvImport', () => {
  it('groups rows by invoiceNumber into one invoice with two lines', () => {
    const csv = `${HEADER}\n${VALID_ROW}\nstandard-tax-invoice,INV-001,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Audit pack,2,500.00,S`;
    const r = parseCsvImport(csv);
    expect(r.fatals).toEqual([]);
    expect(r.invoices).toHaveLength(1);
    expect(r.invoiceErrors).toEqual([]);
    expect(r.preview[0].lineCount).toBe(2);
    expect(r.preview[0].sourceRows).toEqual([1, 2]);
    const inv = r.invoices[0];
    expect(inv.template).toBe('standard-tax-invoice');
    expect(inv.data.invoiceNumber).toBe('INV-001');
    expect(inv.data.lines.map((l) => l.name)).toEqual(['Consulting', 'Audit pack']);
    expect(inv.data.supplier.trn).toBe('100123456700003');
  });

  it('handles quoting: commas, quotes and newlines inside fields', () => {
    const csv = [
      HEADER,
      'standard-tax-invoice,INV-Q1,2026-08-01,,100123456700003,"Supplier, LLC",100987654300003,Buyer LLC,"Consulting ""premium""",1,10.00,S',
      'standard-tax-invoice,INV-Q2,2026-08-01,,100123456700003,"Supplier, LLC",100987654300003,Buyer LLC,"Line with\nnewline",1,20.00,S',
    ].join('\n');
    const r = parseCsvImport(csv);
    expect(r.fatals).toEqual([]);
    expect(r.invoiceErrors).toEqual([]);
    expect(r.invoices).toHaveLength(2);
    expect(r.invoices[0].data.supplier.name).toBe('Supplier, LLC');
    expect(r.invoices[0].data.lines[0].name).toBe('Consulting "premium"');
    expect(r.invoices[1].data.lines[0].name).toContain('newline');
  });

  it('strips the UTF-8 BOM from the first header', () => {
    const bom = String.fromCharCode(0xfeff);
    const r = parseCsvImport(`${bom}${HEADER}\n${VALID_ROW}`);
    expect(r.fatals).toEqual([]);
    expect(r.invoices).toHaveLength(1);
  });

  it('rejects duplicate headers', () => {
    const csv = `${HEADER},template\n${VALID_ROW},standard-tax-invoice`;
    const r = parseCsvImport(csv);
    expect(r.fatals.length).toBeGreaterThan(0);
    expect(r.fatals[0].message).toMatch(/Duplicate column header/);
    expect(r.invoices).toHaveLength(0);
  });

  it('fails the import when an unknown column is populated', () => {
    const csv = `${HEADER},mystery\n${VALID_ROW},something`;
    const r = parseCsvImport(csv);
    expect(r.fatals.length).toBeGreaterThan(0);
    expect(r.fatals[0].message).toMatch(/Unknown column "mystery"/);
    expect(r.invoices).toHaveLength(0);
  });

  it('allows an unknown column when every value is blank', () => {
    const csv = `${HEADER},mystery\n${VALID_ROW},`;
    const r = parseCsvImport(csv);
    expect(r.fatals).toEqual([]);
    expect(r.invoices).toHaveLength(1);
  });

  it('reports conflicting repeated invoice-level fields with row-specific errors', () => {
    const csv = `${HEADER}\n${VALID_ROW}\nstandard-tax-invoice,INV-001,2026-08-02,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Second line,1,10.00,S`;
    const r = parseCsvImport(csv);
    const conflict = r.invoiceErrors.find((e) => e.field === 'issueDate');
    expect(conflict).toBeTruthy();
    expect(conflict?.row).toBe(2);
    expect(conflict?.message).toMatch(/Conflicting value for issueDate/);
    expect(r.invoices).toHaveLength(0);
  });

  it('rejects an import with zero invoices', () => {
    const r = parseCsvImport(HEADER);
    expect(r.fatals.some((f) => f.message.includes('No invoices found'))).toBe(true);
  });

  it('rejects more than 50 invoices before generation', () => {
    const rows = Array.from({ length: 51 }, (_, i) =>
      `standard-tax-invoice,INV-${i},2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Item,1,10.00,S`);
    const r = parseCsvImport(`${HEADER}\n${rows.join('\n')}`);
    expect(r.fatals.some((f) => f.message.includes('51 invoices found'))).toBe(true);
    expect(r.invoices).toHaveLength(0);
  });

  it('validates template, TRN, date, quantity, unit price and category per row', () => {
    const csv = `${HEADER}\n` +
      'unknown-template,INV-X,2026-13-99,,12345,Supplier LLC,98765,Buyer LLC,Item,0,-5,ZZ';
    const r = parseCsvImport(csv);
    const fields = r.invoiceErrors.map((e) => e.field);
    expect(fields).toContain('template');
    expect(fields).toContain('issueDate');
    expect(fields).toContain('supplierTrn');
    expect(fields).toContain('customerTrn');
    expect(fields).toContain('quantity');
    expect(fields).toContain('unitPrice');
    expect(fields).toContain('category');
    expect(r.invoices).toHaveLength(0);
  });

  it('normalizes TRN digits (spaces and dashes stripped) and numbers', () => {
    const csv = `${HEADER}\n` +
      'standard-tax-invoice,INV-T,2026-08-01,,100 1234 5670 0003,Supplier LLC,100987654300003,Buyer LLC,Item,2.5,10.5,S';
    const r = parseCsvImport(csv);
    expect(r.invoiceErrors).toEqual([]);
    expect(r.invoices[0].data.supplier.trn).toBe('100123456700003');
    expect(r.invoices[0].data.lines[0].quantity).toBe(2.5);
    expect(r.invoices[0].data.lines[0].unitPrice).toBe(10.5);
  });

  it('rejects a category that the template does not support', () => {
    const csv = `${HEADER}\nstandard-tax-invoice,INV-C,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Item,1,10.00,E`;
    const r = parseCsvImport(csv);
    expect(r.invoiceErrors.some((e) => e.field === 'category')).toBe(true);
    expect(r.invoices).toHaveLength(0);
  });

  it('accepts E/O/Z categories for the summary template only', () => {
    const csv = `${HEADER}\n` +
      'summary-tax-invoice,INV-S,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Item,1,10.00,E\n' +
      'summary-tax-invoice,INV-S2,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Item,1,10.00,O\n' +
      'summary-tax-invoice,INV-S3,2026-08-01,,100123456700003,Supplier LLC,100987654300003,Buyer LLC,Item,1,10.00,Z';
    const r = parseCsvImport(csv);
    expect(r.invoiceErrors).toEqual([]);
    expect(r.invoices).toHaveLength(3);
  });
});

describe('parseJsonImport', () => {
  const entry = (overrides: Record<string, unknown> = {}) => ({
    template: 'standard-tax-invoice',
    data: {
      invoiceNumber: 'JSON-001',
      issueDate: '2026-08-01',
      supplier: { trn: '100123456700003', name: 'Supplier LLC' },
      customer: { trn: '100987654300003', name: 'Buyer LLC' },
      lines: [{ name: 'Consulting', quantity: 1, unitPrice: 1000, category: 'S' }],
      ...overrides,
    },
  });

  it('accepts a single { template, data } object', () => {
    const r = parseJsonImport(JSON.stringify(entry()));
    expect(r.fatals).toEqual([]);
    expect(r.invoiceErrors).toEqual([]);
    expect(r.invoices).toHaveLength(1);
    expect(r.invoices[0].data.invoiceNumber).toBe('JSON-001');
  });

  it('accepts an array of one to 50 entries', () => {
    const arr = Array.from({ length: 50 }, (_, i) => entry({ invoiceNumber: `JSON-${i}` }));
    const r = parseJsonImport(JSON.stringify(arr));
    expect(r.fatals).toEqual([]);
    expect(r.invoices).toHaveLength(50);
  });

  it('rejects zero invoices', () => {
    const r = parseJsonImport('[]');
    expect(r.fatals.some((f) => f.message.includes('No invoices found'))).toBe(true);
  });

  it('rejects more than 50 invoices', () => {
    const arr = Array.from({ length: 51 }, (_, i) => entry({ invoiceNumber: `JSON-${i}` }));
    const r = parseJsonImport(JSON.stringify(arr));
    expect(r.fatals.some((f) => f.message.includes('51 invoices found'))).toBe(true);
  });

  it('fails invoices with unknown populated fields and never drops them', () => {
    const bad = entry({ vatRate: 5, supplier: { trn: '100123456700003', name: 'S', extra: 'x' } });
    bad.data.lines = [{ name: 'L', quantity: 1, unitPrice: 10, category: 'S', gtin: '123' }];
    const r = parseJsonImport(JSON.stringify([entry(), bad]));
    expect(r.invoices).toHaveLength(1); // good invoice survives
    const fields = r.invoiceErrors.map((e) => e.field);
    expect(fields).toContain('vatRate');
    expect(fields).toContain('supplier.extra');
    expect(fields).toContain('lines[0].gtin');
  });

  it('allows blank unknown fields', () => {
    const blank = entry({ note: null, reference: '' });
    const r = parseJsonImport(JSON.stringify(blank));
    expect(r.invoiceErrors).toEqual([]);
    expect(r.invoices).toHaveLength(1);
  });

  it('reports invalid JSON as a fatal error', () => {
    const r = parseJsonImport('{not json');
    expect(r.fatals.some((f) => f.message.includes('Invalid JSON'))).toBe(true);
    expect(r.invoices).toHaveLength(0);
  });

  it('validates required invoice fields per entry', () => {
    const r = parseJsonImport(JSON.stringify(entry({ invoiceNumber: '', issueDate: '2026/08/01' })));
    const fields = r.invoiceErrors.map((e) => e.field);
    expect(fields).toContain('invoiceNumber');
    expect(fields).toContain('issueDate');
    expect(r.invoices).toHaveLength(0);
  });
});

describe('safeInvoiceFileName + ZIP', () => {
  it('produces filesystem-safe, collision-resistant names', () => {
    const used = new Set<string>();
    expect(safeInvoiceFileName('INV-001', used)).toBe('INV-001');
    expect(safeInvoiceFileName('INV-001', used)).toBe('INV-001-2');
    expect(safeInvoiceFileName('A/B:C*D', used)).toBe('A-B-C-D');
    expect(safeInvoiceFileName('', used)).toBe('invoice');
    expect(safeInvoiceFileName('', used)).toBe('invoice-2');
  });

  it('builds a ZIP of separate XML files with distinct names', async () => {
    const blob = await buildImportZip([
      { invoiceNumber: 'INV-001', xml: '<Invoice>one</Invoice>' },
      { invoiceNumber: 'INV-001', xml: '<Invoice>two</Invoice>' },
      { invoiceNumber: 'INV-002', xml: '<Invoice>three</Invoice>' },
    ]);
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toEqual(['INV-001.xml', 'INV-001-2.xml', 'INV-002.xml']);
    expect(await zip.file('INV-001.xml')?.async('string')).toBe('<Invoice>one</Invoice>');
    expect(await zip.file('INV-001-2.xml')?.async('string')).toBe('<Invoice>two</Invoice>');
  });
});
