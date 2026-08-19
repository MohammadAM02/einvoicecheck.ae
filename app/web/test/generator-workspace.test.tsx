// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                      */
/* ------------------------------------------------------------------ */

const generatorClient = vi.hoisted(() => ({
  generateXml: vi.fn(),
}));

const xmlFile = vi.hoisted(() => ({
  downloadXml: vi.fn(),
  copyXml: vi.fn(),
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

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

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

import { GeneratorWorkspace } from '@/components/GeneratorWorkspace';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MOCK_XML = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>INV-XML-001</cbc:ID></Invoice>';

const GENERATE_SUCCESS = {
  ok: true as const,
  xml: MOCK_XML,
  template: 'standard-tax-invoice',
  engineVersion: '1.0.0',
};

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  sessionStorage.clear();
  generatorClient.generateXml.mockResolvedValue(GENERATE_SUCCESS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('GeneratorWorkspace', () => {
  // (1) renders stepper + Document/Parties/Lines sections, NO "Preflight passed"
  it('renders stepper and form sections, never claims preflight passed', () => {
    render(h(GeneratorWorkspace));

    // Stepper
    expect(screen.getByText('Create')).toBeTruthy();
    expect(screen.getByText('Validate')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Generator progress' })).toBeTruthy();

    // Sections
    expect(screen.getByText('Document')).toBeTruthy();
    expect(screen.getByText('Parties')).toBeTruthy();
    expect(screen.getByText('Lines')).toBeTruthy();

    // Legend strip
    expect(screen.getByTestId('legend-strip')).toBeTruthy();

    // Draft banner
    expect(screen.getByTestId('draft-banner')).toBeTruthy();
    expect(screen.getByText(/Machine-drafted preflight file/)).toBeTruthy();

    // Never "Preflight passed"
    expect(screen.queryByText(/Preflight passed/)).toBeNull();
  });

  it('associates generator controls with semantic groups and labels', () => {
    render(h(GeneratorWorkspace));

    expect(screen.getByRole('group', { name: 'Document' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Parties' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Lines' })).toBeTruthy();

    expect(screen.getByLabelText('Template').id).toBe('template-select');
    expect(screen.getByLabelText('Invoice number').id).toBe('invoice-number');
    expect(screen.getByLabelText('Issue date').id).toBe('issue-date');
    expect(screen.getByLabelText('Due date (optional)').id).toBe('due-date');
    expect(screen.getByLabelText('Supplier TRN').id).toBe('supplier-trn');
    expect(screen.getByLabelText('Supplier name').id).toBe('supplier-name');
    expect(screen.getByLabelText('Customer TRN').id).toBe('customer-trn');
    expect(screen.getByLabelText('Customer name').id).toBe('customer-name');

    expect(screen.getByLabelText('Line 1 description')).toBeTruthy();
    expect(screen.getByLabelText('Line 1 quantity')).toBeTruthy();
    expect(screen.getByLabelText('Line 1 unit price')).toBeTruthy();
    expect(screen.getByLabelText('Line 1 VAT category')).toBeTruthy();
  });

  // (2) summary template (480) offers exactly E/O/Z; standard + credit note stay S
  it('summary template offers exactly E, O, and Z categories (A-018)', () => {
    render(h(GeneratorWorkspace));

    // Switch to summary template
    const templateSelect = screen.getByTestId('template-select');
    fireEvent.change(templateSelect, { target: { value: 'summary-tax-invoice' } });

    const catSelect = screen.getByTestId('line-category-0') as HTMLSelectElement;
    const options = Array.from(catSelect.options).map((o) => o.value);
    expect(options).toEqual(['E', 'O', 'Z']);
    expect(options).not.toContain('S');
    expect(options).not.toContain('AE');

    // Standard invoice and credit-note templates remain unchanged (S only).
    fireEvent.change(templateSelect, { target: { value: 'standard-tax-invoice' } });
    expect(
      Array.from((screen.getByTestId('line-category-0') as HTMLSelectElement).options).map((o) => o.value),
    ).toEqual(['S']);
    fireEvent.change(templateSelect, { target: { value: 'standard-tax-credit-note' } });
    expect(
      Array.from((screen.getByTestId('line-category-0') as HTMLSelectElement).options).map((o) => o.value),
    ).toEqual(['S']);
  });

  // (2b) the submitted payload for summary 480 uses E/O/Z, not the API template list
  it('submits a summary 480 payload with an E/O/Z category (A-018)', async () => {
    render(h(GeneratorWorkspace));

    fireEvent.click(screen.getByTestId('fill-sample-btn'));
    await waitFor(() => expect(generatorClient.generateXml).toHaveBeenCalled(), { timeout: 2000 });

    const templateSelect = screen.getByTestId('template-select');
    fireEvent.change(templateSelect, { target: { value: 'summary-tax-invoice' } });
    fireEvent.change(screen.getByTestId('line-category-0'), { target: { value: 'E' } });

    await waitFor(
      () => {
        const calls = generatorClient.generateXml.mock.calls;
        const last = calls[calls.length - 1]?.[0] as { data: { lines: { category: string }[] } };
        expect(last.data.lines[0].category).toBe('E');
      },
      { timeout: 2000 },
    );
  });

  // (3) live line math: qty 5 × price 1000 → 5000.00 line ext, 250.00 tax
  it('computes line extension and totals live (qty 5 × price 1000)', async () => {
    render(h(GeneratorWorkspace));

    // Use "Fill with sample" to get valid data quickly, then modify
    fireEvent.click(screen.getByTestId('fill-sample-btn'));

    // Wait for fill to settle and generate to fire
    await waitFor(
      () => {
        expect(generatorClient.generateXml).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Modify line to qty 5 × price 1000
    fireEvent.change(screen.getByTestId('line-quantity-0'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('line-unit-price-0'), { target: { value: '1000' } });

    // Wait for line extension to update (computed client-side immediately)
    await waitFor(() => {
      const lineExt = screen.getByTestId('line-ext-0');
      expect(lineExt.textContent).toContain('5000.00');
    });

    // Check totals
    expect(screen.getByTestId('total-line-extension').textContent).toContain('5000.00');
    // Tax at S (5%): 5000 * 0.05 = 250.00
    expect(screen.getByTestId('total-tax-S').textContent).toContain('250.00');
    expect(screen.getByTestId('total-tax-inclusive').textContent).toContain('5250.00');
    expect(screen.getByTestId('total-payable').textContent).toContain('5250.00');
  });

  // (4) "Validate this invoice →" writes sessionStorage + router.push
  it('writes sessionStorage handoff with xml-generator source on validate', async () => {
    render(h(GeneratorWorkspace));

    // Click "Fill with sample" which sets all valid data
    fireEvent.click(screen.getByTestId('fill-sample-btn'));

    // Wait for generate to complete and the validate panel to appear
    await waitFor(
      () => {
        expect(screen.getByTestId('validate-panel')).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // Click validate
    fireEvent.click(screen.getByTestId('validate-btn'));

    // Check sessionStorage
    const handoff = sessionStorage.getItem('einvoicecheck:converter-handoff');
    expect(handoff).not.toBeNull();
    const parsed = JSON.parse(handoff!);
    expect(parsed.source).toBe('xml-generator');
    expect(parsed.xml).toBe(MOCK_XML);
    expect(parsed.fileName).toBe('generated-invoice.xml');

    // Check router.push
    expect(routerMock.push).toHaveBeenCalledWith('/tools/uae-e-invoice-validator');
  });

  // (5) invalid TRN blocks submit (generateXml NOT called)
  it('does not call generateXml when TRN is invalid', async () => {
    generatorClient.generateXml.mockClear();

    render(h(GeneratorWorkspace));

    // Fill all fields except TRN — leave TRN invalid
    fireEvent.change(screen.getByTestId('invoice-number'), { target: { value: 'INV-001' } });
    fireEvent.change(screen.getByTestId('issue-date'), { target: { value: '2026-07-15' } });
    fireEvent.change(screen.getByTestId('supplier-trn'), { target: { value: '12345' } });
    fireEvent.change(screen.getByTestId('supplier-name'), { target: { value: 'Supplier Co' } });
    fireEvent.change(screen.getByTestId('customer-trn'), { target: { value: '100987654300003' } });
    fireEvent.change(screen.getByTestId('customer-name'), { target: { value: 'Customer Co' } });
    fireEvent.change(screen.getByTestId('line-description-0'), { target: { value: 'Item' } });
    fireEvent.change(screen.getByTestId('line-quantity-0'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('line-unit-price-0'), { target: { value: '100' } });

    // Wait past the debounce window
    await new Promise((r) => setTimeout(r, 500));

    // generateXml should NOT have been called because TRN is invalid
    expect(generatorClient.generateXml).not.toHaveBeenCalled();

    // TRN error message should appear
    expect(screen.getByText('TRN must be exactly 15 digits')).toBeTruthy();
  });
});
