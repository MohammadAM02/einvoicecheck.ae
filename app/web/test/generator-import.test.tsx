// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                      */
/* ------------------------------------------------------------------ */

const invoiceImport = vi.hoisted(() => ({
  parseImportFile: vi.fn(),
  buildImportZip: vi.fn(),
  safeInvoiceFileName: vi.fn(),
  downloadBlob: vi.fn(),
}));

const generatorClient = vi.hoisted(() => ({ generateXml: vi.fn() }));

const xmlFile = vi.hoisted(() => ({ downloadXml: vi.fn() }));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@/lib/invoice-import', () => ({
  ...invoiceImport,
  IMPORT_TEMPLATE_PATH: '/templates/einvoicecheck-import-template.csv',
  MAX_IMPORT_INVOICES: 50,
  parseImportFile: invoiceImport.parseImportFile,
  buildImportZip: invoiceImport.buildImportZip,
  safeInvoiceFileName: invoiceImport.safeInvoiceFileName,
  downloadBlob: invoiceImport.downloadBlob,
}));

vi.mock('@/lib/generator-client', () => ({
  ...generatorClient,
  GeneratorClientError: class GeneratorClientError extends Error {
    status: number | null;
    fieldErrors?: { field: string; message: string }[];
    constructor(
      message: string,
      status: number | null = null,
      fieldErrors?: { field: string; message: string }[],
    ) {
      super(message);
      this.name = 'GeneratorClientError';
      this.status = status;
      this.fieldErrors = fieldErrors;
    }
  },
}));

vi.mock('@/lib/xml-file', () => xmlFile);
vi.mock('@/lib/analytics', () => analytics);
vi.mock('next/navigation', () => ({ useRouter: () => routerMock }));

import { GeneratorImport } from '@/components/GeneratorImport';
import type { ImportParseResult } from '@/lib/invoice-import';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const MOCK_XML_A = '<Invoice><cbc:ID>INV-A</cbc:ID></Invoice>';
const MOCK_XML_B = '<Invoice><cbc:ID>INV-B</cbc:ID></Invoice>';

function parseResult(overrides: Partial<ImportParseResult> = {}): ImportParseResult {
  return {
    kind: 'json',
    invoices: [
      {
        template: 'standard-tax-invoice',
        data: {
          invoiceNumber: 'INV-A',
          issueDate: '2026-08-01',
          supplier: { trn: '100123456700003', name: 'Supplier LLC' },
          customer: { trn: '100987654300003', name: 'Buyer LLC' },
          lines: [{ name: 'Consulting', quantity: 1, unitPrice: 1000, category: 'S' }],
        },
      },
      {
        template: 'standard-tax-invoice',
        data: {
          invoiceNumber: 'INV-B',
          issueDate: '2026-08-01',
          supplier: { trn: '100123456700003', name: 'Supplier LLC' },
          customer: { trn: '100987654300003', name: 'Buyer LLC' },
          lines: [{ name: 'Audit', quantity: 2, unitPrice: 500, category: 'S' }],
        },
      },
    ],
    invoiceErrors: [],
    fatals: [],
    preview: [
      { template: 'standard-tax-invoice', invoiceNumber: 'INV-A', lineCount: 1, sourceRows: [1] },
      { template: 'standard-tax-invoice', invoiceNumber: 'INV-B', lineCount: 1, sourceRows: [2] },
    ],
    invoiceCount: 2,
    ...overrides,
  };
}

const GENERATE_SUCCESS_A = { ok: true as const, xml: MOCK_XML_A, template: 'standard-tax-invoice', engineVersion: '1.0.0' };
const GENERATE_SUCCESS_B = { ok: true as const, xml: MOCK_XML_B, template: 'standard-tax-invoice', engineVersion: '1.0.0' };

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  sessionStorage.clear();
  invoiceImport.safeInvoiceFileName.mockImplementation(
    (name: string, used: Set<string>) => {
      let base = name || 'invoice';
      let candidate = base;
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${n}`;
        n += 1;
      }
      used.add(candidate);
      return candidate;
    },
  );
  invoiceImport.buildImportZip.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderImport() {
  return render(h(GeneratorImport, { onOpenInForm: vi.fn() }));
}

function selectFile(
  component: ReturnType<typeof renderImport>,
  name: string,
  content: string,
  result: ImportParseResult = parseResult(),
) {
  invoiceImport.parseImportFile.mockResolvedValue(result);
  const input = component.container.querySelector('#import-file-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'application/json' })] } });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('GeneratorImport', () => {
  it('offers the published CSV template download and the import cap note', () => {
    renderImport();

    const link = screen.getByText('Download the CSV template') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/templates/einvoicecheck-import-template.csv');
    expect(screen.getByText(/Imports support 1 to 50 invoices per file/)).toBeTruthy();
    expect(screen.getByText(/never uploaded/)).toBeTruthy();
  });

  it('parses a local file and shows the preview with counts and statuses', async () => {
    const component = renderImport();
    selectFile(component, 'invoices.json', '[{"template":"x"}]');

    await waitFor(() => expect(screen.getByTestId('import-preview')).toBeTruthy());
    expect(screen.getByText(/2 invoices detected/)).toBeTruthy();
    expect(screen.getByText('INV-A')).toBeTruthy();
    expect(screen.getByText('INV-B')).toBeTruthy();
    expect(screen.getAllByText('Ready')).toHaveLength(2);
    expect(screen.getByTestId('generate-batch-btn')).toBeTruthy();
  });

  it('shows parse errors and does not offer generation when nothing is ready', async () => {
    invoiceImport.parseImportFile.mockResolvedValue(
      parseResult({
        invoices: [],
        invoiceErrors: [{ row: 1, field: 'template', message: 'Unknown template "x".' }],
        preview: [{ template: 'x', invoiceNumber: 'INV-X', lineCount: 1, sourceRows: [1] }],
      }),
    );
    const component = renderImport();
    selectFile(component, 'invoices.json', '[{"template":"x"}]', parseResult({
      invoices: [],
      invoiceErrors: [{ row: 1, field: 'template', message: 'Unknown template "x".' }],
      preview: [{ template: 'x', invoiceNumber: 'INV-X', lineCount: 1, sourceRows: [1] }],
    }));

    await waitFor(() => expect(screen.getByTestId('import-errors')).toBeTruthy());
    expect(screen.getByText(/Row 1 · template: Unknown template/)).toBeTruthy();
    expect(screen.queryByTestId('generate-batch-btn')).toBeNull();
  });

  it('shows fatal errors for empty or oversized imports', async () => {
    invoiceImport.parseImportFile.mockResolvedValue(
      parseResult({ invoices: [], preview: [], invoiceCount: 0, fatals: [{ message: 'No invoices found.' }] }),
    );
    const component = renderImport();
    selectFile(component, 'empty.csv', '', parseResult({
      invoices: [],
      preview: [],
      invoiceCount: 0,
      fatals: [{ message: 'No invoices found.' }],
    }));

    await waitFor(() => expect(screen.getByTestId('import-fatal')).toBeTruthy());
    expect(screen.getByText('No invoices found.')).toBeTruthy();
    expect(screen.queryByTestId('generate-batch-btn')).toBeNull();
  });

  it('generates every invoice with bounded concurrency and preserves partial success', async () => {
    generatorClient.generateXml
      .mockResolvedValueOnce(GENERATE_SUCCESS_A)
      .mockRejectedValueOnce(new Error('backend refused INV-B'));
    const component = renderImport();
    selectFile(component, 'invoices.json', '[]');

    await waitFor(() => expect(screen.getByTestId('generate-batch-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('generate-batch-btn'));

    await waitFor(() => expect(screen.getByTestId('import-results')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText('XML generated')).toBeTruthy();
    expect(screen.getByText('backend refused INV-B')).toBeTruthy();
    expect(screen.getByText('Successful invoices are preserved. Retrying failed invoices never regenerates successful ones.')).toBeTruthy();
    // INV-A generated once; INV-B failed once.
    expect(generatorClient.generateXml).toHaveBeenCalledTimes(2);
  });

  it('retries only failed invoices and never regenerates successful ones', async () => {
    generatorClient.generateXml
      .mockResolvedValueOnce(GENERATE_SUCCESS_A)
      .mockRejectedValueOnce(new Error('backend refused INV-B'))
      .mockResolvedValueOnce(GENERATE_SUCCESS_B);
    const component = renderImport();
    selectFile(component, 'invoices.json', '[]');

    await waitFor(() => expect(screen.getByTestId('generate-batch-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('generate-batch-btn'));
    await waitFor(() => expect(screen.getByTestId('import-results')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: 'Retry failed (1)' }));
    await waitFor(() => expect(screen.getAllByText('XML generated')).toHaveLength(2), { timeout: 3000 });
    expect(generatorClient.generateXml).toHaveBeenCalledTimes(3);
    // Successful invoice was NOT regenerated on retry.
    expect(generatorClient.generateXml.mock.calls.map((c) => c[0].data.invoiceNumber)).toEqual(['INV-A', 'INV-B', 'INV-B']);
  });

  it('opens a failed invoice prefilled in the manual Generator form', async () => {
    const onOpenInForm = vi.fn();
    generatorClient.generateXml
      .mockRejectedValueOnce(new Error('backend refused INV-A'))
      .mockResolvedValueOnce(GENERATE_SUCCESS_B);
    invoiceImport.parseImportFile.mockResolvedValue(parseResult());
    const component = render(h(GeneratorImport, { onOpenInForm }));

    const input = component.container.querySelector('#import-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['[]'], 'invoices.json', { type: 'application/json' })] } });
    await waitFor(() => expect(screen.getByTestId('generate-batch-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('generate-batch-btn'));
    await waitFor(() => expect(screen.getByTestId('import-results')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: 'Open in manual Generator' }));
    expect(onOpenInForm).toHaveBeenCalledTimes(1);
    const invoice = onOpenInForm.mock.calls[0][0] as { data: { invoiceNumber: string } };
    expect(invoice.data.invoiceNumber).toBe('INV-A');
  });

  it('writes a validator handoff and routes to the validator for a successful invoice', async () => {
    generatorClient.generateXml.mockResolvedValueOnce(GENERATE_SUCCESS_A);
    const component = renderImport();
    selectFile(component, 'invoices.json', '[]');

    await waitFor(() => expect(screen.getByTestId('generate-batch-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('generate-batch-btn'));
    await waitFor(() => expect(screen.getByTestId('import-results')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: 'View in Validator' }));
    expect(routerMock.push).toHaveBeenCalledWith('/tools/uae-e-invoice-validator');
    const handoff = JSON.parse(sessionStorage.getItem('einvoicecheck:converter-handoff') ?? '{}');
    expect(handoff.source).toBe('xml-generator');
    expect(handoff.xml).toBe(MOCK_XML_A);
  });

  it('downloads a ZIP of all successful XML', async () => {
    generatorClient.generateXml
      .mockResolvedValueOnce(GENERATE_SUCCESS_A)
      .mockRejectedValueOnce(new Error('backend refused INV-B'));
    const component = renderImport();
    selectFile(component, 'invoices.json', '[]');

    await waitFor(() => expect(screen.getByTestId('generate-batch-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('generate-batch-btn'));
    await waitFor(() => expect(screen.getByTestId('import-results')).toBeTruthy(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('download-zip-btn'));
    await waitFor(() => expect(invoiceImport.buildImportZip).toHaveBeenCalledTimes(1));
    expect(invoiceImport.buildImportZip.mock.calls[0][0]).toEqual([
      { invoiceNumber: 'INV-A', xml: MOCK_XML_A },
    ]);
    expect(invoiceImport.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'einvoicecheck-generated-invoices.zip');
  });
});
