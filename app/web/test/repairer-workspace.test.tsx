// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const repairerClient = vi.hoisted(() => ({
  convertXml: vi.fn(),
  readXmlFile: vi.fn(),
  downloadXml: vi.fn(),
  copyXml: vi.fn(),
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

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

import { RepairerWorkspace } from '@/components/RepairerWorkspace';

const convertedResult = {
  result: {
    status: 'CONVERTED' as const,
    reason: undefined,
    inputHash: 'in',
    outputHash: 'out',
    audit: [
      {
        rule: 'FMT-NS-01',
        action: 'replace' as const,
        target: '/Invoice@xmlns',
        old: 'a',
        new: 'b',
        reason: 'ns',
      },
    ],
    blocked: [],
    dataIssues: [],
    output: '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
    engineVersion: 'engine-1.0.4',
    convertedAt: new Date().toISOString(),
  },
  rateLimit: { limit: 20, remaining: 19, resetSeconds: 60, degraded: false },
};

beforeEach(() => {
  sessionStorage.clear();
  repairerClient.convertXml.mockResolvedValue(convertedResult);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RepairerWorkspace', () => {
  it('shows no mode toggle (single repair mode)', () => {
    render(h(RepairerWorkspace));
    expect(screen.queryByText(/Full \(refuse on data errors\)/)).toBeNull();
    expect(screen.queryByText(/Format \(repair \+ warn\)/)).toBeNull();
  });

  it('renders verdict + download/copy/validate on CONVERTED', async () => {
    render(h(RepairerWorkspace));

    // Reveal the textarea by clicking "Paste instead"
    fireEvent.click(screen.getByText('Paste instead'));

    fireEvent.change(screen.getByLabelText('XML document content'), {
      target: { value: '<Invoice/>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start repair' }));

    await waitFor(() => {
      expect(screen.getByText(/Repaired — 1 fix applied/)).toBeTruthy();
    });

    expect(
      screen.getByRole('button', { name: /Download repaired XML/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Validate repaired invoice/i }),
    ).toBeTruthy();
  });

  it('writes sessionStorage handoff on validate-next', async () => {
    render(h(RepairerWorkspace));

    fireEvent.click(screen.getByText('Paste instead'));
    fireEvent.change(screen.getByLabelText('XML document content'), {
      target: { value: '<Invoice/>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start repair' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Validate repaired invoice/i }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Validate repaired invoice/i }),
    );

    const handoff = sessionStorage.getItem('einvoicecheck:converter-handoff');
    expect(handoff).toContain('xml-repairer');
    expect(routerMock.push).toHaveBeenCalledWith(
      '/tools/uae-e-invoice-validator',
    );
  });

  it('renders the 389 self-billing banner when the result carries ENG-TYPE-01/SELF-BILLING', async () => {
    repairerClient.convertXml.mockResolvedValue({
      result: {
        status: 'NOOP' as const,
        reason: undefined,
        inputHash: 'in',
        outputHash: 'out',
        audit: [],
        blocked: [],
        dataIssues: [
          {
            rule: 'ENG-TYPE-01/SELF-BILLING',
            path: '/invoiceType',
            message: 'x',
          },
        ],
        output: '<Invoice/>',
        engineVersion: 'engine-1.0.4',
        convertedAt: new Date().toISOString(),
      },
      rateLimit: { limit: 20, remaining: 19, resetSeconds: 60, degraded: false },
    });

    render(h(RepairerWorkspace));

    fireEvent.click(screen.getByText('Paste instead'));
    fireEvent.change(screen.getByLabelText('XML document content'), {
      target: { value: '<Invoice/>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start repair' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Self-billed invoices are not fully validated/),
      ).toBeTruthy();
    });
  });
});
