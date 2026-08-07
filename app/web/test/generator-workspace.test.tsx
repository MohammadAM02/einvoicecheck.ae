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

const repairerClient = vi.hoisted(() => ({
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

vi.mock('@/lib/repairer-client', () => ({
  ...repairerClient,
  RepairerClientError: class RepairerClientError extends Error {
    status: number | null;
    constructor(message: string, status: number | null = null) {
      super(message);
      this.name = 'RepairerClientError';
      this.status = status;
    }
  },
}));

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
    expect(screen.getByText('Build')).toBeTruthy();
    expect(screen.getByText('Validate')).toBeTruthy();

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

  // (2) summary template shows AE category option
  it('summary template shows AE category option', () => {
    render(h(GeneratorWorkspace));

    // Switch to summary template
    const templateSelect = screen.getByTestId('template-select');
    fireEvent.change(templateSelect, { target: { value: 'summary-tax-invoice' } });

    // The first line's category select should now include AE
    const catSelect = screen.getByTestId('line-category-0') as HTMLSelectElement;
    const options = Array.from(catSelect.options).map((o) => o.value);
    expect(options).toContain('AE');

    // The AE option label (as rendered text for the select option) should be present
    // Since it's an option element, we just verify via the options array above
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
