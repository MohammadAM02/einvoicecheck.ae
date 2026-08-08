// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchValidator } from '@/components/BatchValidator';

const twoDocuments = '<Invoice>one</Invoice>\n---\n<Invoice>two</Invoice>';

const validResult = {
  index: 0,
  valid: true,
  inputFormat: 'xml' as const,
  validationScope: 'pint-ae-ubl-xml' as const,
  invoiceType: '388',
  schemaVersion: 'PINT AE 1.0',
  format: { status: 'passed', issues: [] },
  structure: { status: 'passed', issues: [] },
  semantic: { status: 'passed', issues: [] },
};

const invalidResult = {
  ...validResult,
  index: 1,
  valid: false,
  invoiceType: '381',
  format: { status: 'passed', issues: [] },
  structure: {
    status: 'failed',
    issues: [{ path: '/', rule: 'XSD-01', severity: 'error', message: 'Element not allowed.', line: null, column: null, xmlPath: null }],
  },
  semantic: {
    status: 'failed',
    issues: [{ path: '/', rule: 'ibr-073', severity: 'warning', message: 'Amount mismatch.', line: null, column: null, xmlPath: null }],
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderBatchValidator() {
  return render(h(BatchValidator));
}

describe('BatchValidator', () => {
  it('does not request validation when fewer than two documents are pasted', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderBatchValidator();

    await user.type(screen.getByLabelText('Batch invoice documents'), '<Invoice>one</Invoice>');
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    expect(screen.getByRole('alert').textContent).toBe('Paste at least 2 invoices separated by ---.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request validation when more than fifty documents are pasted', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderBatchValidator();

    await user.type(screen.getByLabelText('Batch invoice documents'), Array.from({ length: 51 }, (_, index) => `<Invoice>${index}</Invoice>`).join('\n---\n'));
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    expect(screen.getByRole('alert').textContent).toBe('Batch size exceeds the 50-invoice limit.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends two trimmed documents only to the batch endpoint', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        results: [validResult, invalidResult],
        rateLimit: { limit: 50, remaining: 48, resetSeconds: 60, degraded: false },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderBatchValidator();

    await user.type(screen.getByLabelText('Batch invoice documents'), `  <Invoice>one</Invoice>  \n---\n  <Invoice>two</Invoice>  `);
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith('/api/tools/validate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invoices: ['<Invoice>one</Invoice>', '<Invoice>two</Invoice>'] }),
    });
  });

  it('retains pasted documents and displays server guidance after an error', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: 'Free-tool limit reached. Try again shortly.' }),
    }));
    renderBatchValidator();

    const input = screen.getByLabelText('Batch invoice documents');
    await user.type(input, twoDocuments);
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Free-tool limit reached. Try again shortly.');
    expect((input as HTMLTextAreaElement).value).toBe(twoDocuments);
  });

  it('summarizes successful results with pass and fail preflight language', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        results: [validResult, invalidResult],
        rateLimit: { limit: 50, remaining: 48, resetSeconds: 60, degraded: false },
      }),
    }));
    renderBatchValidator();

    await user.type(screen.getByLabelText('Batch invoice documents'), twoDocuments);
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    expect(await screen.findByRole('heading', { name: 'Batch results — 2 invoices' })).toBeTruthy();
    expect(screen.getByText('1 pass preflight · 1 fail preflight · 48 of 50 checks left')).toBeTruthy();
    expect(screen.getByText('PASS')).toBeTruthy();
    expect(screen.getByText('FAIL')).toBeTruthy();
    expect(screen.queryByText(/Would be rejected/i)).toBeNull();
  });

  it('counts errors and warnings from flattened v2 layers, not a flat errors array', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        results: [validResult, invalidResult],
        rateLimit: { limit: 50, remaining: 48, resetSeconds: 60, degraded: false },
      }),
    }));
    renderBatchValidator();

    await user.type(screen.getByLabelText('Batch invoice documents'), twoDocuments);
    await user.click(screen.getByRole('button', { name: 'Validate batch' }));

    expect(await screen.findByRole('heading', { name: 'Batch results — 2 invoices' })).toBeTruthy();
    // 1 error + 1 warning spread across structure/semantic layers, no flat errors key
    expect(screen.getByText('1 error · 1 warning')).toBeTruthy();
  });
});
