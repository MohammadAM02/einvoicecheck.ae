// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const validationClient = vi.hoisted(() => ({
  readInvoiceFile: vi.fn(),
  validateInvoiceDocument: vi.fn(),
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@/lib/validation-client', () => ({
  ...validationClient,
  ValidationClientError: class ValidationClientError extends Error {
    status: number | null;
    constructor(message: string, status: number | null = null) {
      super(message);
      this.name = 'ValidationClientError';
      this.status = status;
    }
  },
}));

vi.mock('@/lib/validation-samples', () => ({
  VALID_XML_SAMPLE: '<Invoice>valid</Invoice>',
  BROKEN_XML_SAMPLE: '<Invoice>broken</Invoice>',
}));

vi.mock('@/lib/analytics', () => analytics);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: router.push }) }));

import { consumeHomepageValidatorHandoff, setHomepageValidatorHandoff } from '@/lib/validator-handoff';
import { ValidatorWorkspace } from '@/components/validation/ValidatorWorkspace';

const successResponse = {
  ok: true as const,
  result: {
    valid: true,
    inputFormat: 'xml',
    validationScope: 'pint-ae-ubl-xml',
    invoiceType: '388',
    schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
    format: { status: 'passed', issues: [] },
    structure: { status: 'passed', issues: [] },
    semantic: { status: 'passed', issues: [] },
  },
  rateLimit: { limit: 10, remaining: 9, resetSeconds: 60, degraded: false },
};

beforeEach(() => {
  sessionStorage.clear();
  consumeHomepageValidatorHandoff();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ValidatorWorkspace handoff', () => {
  it('pre-fills + auto-validates a repairer handoff from sessionStorage, then clears it', async () => {
    validationClient.validateInvoiceDocument.mockResolvedValue(successResponse);

    sessionStorage.setItem(
      'einvoicecheck:converter-handoff',
      JSON.stringify({ source: 'xml-repairer', xml: '<Invoice/>' }),
    );

    render(h(ValidatorWorkspace, { context: 'tool' }));

    await waitFor(() => {
      expect(
        sessionStorage.getItem('einvoicecheck:converter-handoff'),
      ).toBeNull();
    });

    expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith(
      '<Invoice/>',
      expect.any(AbortSignal),
    );

    expect(
      screen.getByRole('heading', { name: 'Preflight passed' }),
    ).toBeTruthy();
    expect(screen.getByText('Validated from XML Repairer')).toBeTruthy();
    expect(screen.getByText('repaired-invoice.xml')).toBeTruthy();
  });

  it('pre-fills + auto-validates when the converter handoff comes from the xml-generator', async () => {
    validationClient.validateInvoiceDocument.mockResolvedValue(successResponse);

    sessionStorage.setItem(
      'einvoicecheck:converter-handoff',
      JSON.stringify({ source: 'xml-generator', xml: '<Invoice/>' }),
    );

    render(h(ValidatorWorkspace, { context: 'tool' }));

    await waitFor(() => {
      expect(
        sessionStorage.getItem('einvoicecheck:converter-handoff'),
      ).toBeNull();
    });

    expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith(
      '<Invoice/>',
      expect.any(AbortSignal),
    );
    expect(screen.getByText('Validated from XML Generator')).toBeTruthy();
    expect(screen.getByText('generated-invoice.xml')).toBeTruthy();
  });

  it('auto-validates an in-memory invoice handed off from the homepage and preserves its filename', async () => {
    validationClient.validateInvoiceDocument.mockResolvedValue(successResponse);
    setHomepageValidatorHandoff({
      source: 'homepage',
      fileName: 'customer-invoice.xml',
      xml: '<Invoice>homepage</Invoice>',
    });

    render(h(ValidatorWorkspace, { context: 'tool' }));

    await waitFor(() => {
      expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith(
        '<Invoice>homepage</Invoice>',
        expect.any(AbortSignal),
      );
    });

    expect(consumeHomepageValidatorHandoff()).toBeNull();
    expect(sessionStorage.getItem('einvoicecheck:converter-handoff')).toBeNull();
    expect(screen.getByText('Started from homepage')).toBeTruthy();
    expect(screen.getByText('customer-invoice.xml')).toBeTruthy();
  });

  it('ignores malformed converter handoff silently', () => {
    sessionStorage.setItem(
      'einvoicecheck:converter-handoff',
      'not-json',
    );

    render(h(ValidatorWorkspace, { context: 'tool' }));

    expect(
      sessionStorage.getItem('einvoicecheck:converter-handoff'),
    ).toBeNull();

    expect(
      validationClient.validateInvoiceDocument,
    ).not.toHaveBeenCalled();

    expect(screen.getByText('Validate an invoice')).toBeTruthy();
    expect(
      screen.getByLabelText('Choose an XML invoice'),
    ).toBeTruthy();
  });
});
