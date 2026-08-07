// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const validationClient = vi.hoisted(() => ({
  readInvoiceFile: vi.fn(),
  validateInvoiceDocument: vi.fn(),
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

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
  VALID_JSON_SAMPLE: '{"sample":"valid"}',
  BROKEN_JSON_SAMPLE: '{"sample":"broken"}',
}));

vi.mock('@/lib/analytics', () => analytics);

import { ValidatorWorkspace } from '@/components/validation/ValidatorWorkspace';

const successResponse = {
  ok: true as const,
  result: {
    valid: true,
    invoiceType: '388',
    schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
    errors: [],
  },
  rateLimit: { limit: 10, remaining: 9, resetSeconds: 60, degraded: false },
};

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ValidatorWorkspace handoff', () => {
  it('pre-fills + auto-validates from sessionStorage, then clears it', async () => {
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

    // The summary shows a valid preflight result
    expect(
      screen.getByRole('heading', { name: 'Preflight passed' }),
    ).toBeTruthy();
  });

  it('pre-fills + auto-validates when the handoff comes from the xml-generator', async () => {
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
  });

  it('ignores malformed handoff silently', () => {
    sessionStorage.setItem(
      'einvoicecheck:converter-handoff',
      'not-json',
    );

    render(h(ValidatorWorkspace, { context: 'tool' }));

    // The key is removed (removeItem runs before JSON.parse fails)
    expect(
      sessionStorage.getItem('einvoicecheck:converter-handoff'),
    ).toBeNull();

    // Validation should not have been triggered
    expect(
      validationClient.validateInvoiceDocument,
    ).not.toHaveBeenCalled();

    // The component stays in idle state
    expect(screen.getByText('Validate an invoice')).toBeTruthy();
    expect(
      screen.getByLabelText('Choose an XML or JSON invoice'),
    ).toBeTruthy();
  });
});
