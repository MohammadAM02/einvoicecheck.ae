'use client';

import type React from 'react';
import { createElement as h, useState } from 'react';

type ValidationIssue = { severity: 'error' | 'warning' };

type BatchResult = {
  index: number;
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors?: ValidationIssue[];
  error?: string;
};

type BatchResponse = {
  ok: boolean;
  error?: string;
  results?: BatchResult[];
  rateLimit?: { limit: number; remaining: number; resetSeconds: number; degraded: boolean };
};

function countIssues(result: BatchResult, severity: ValidationIssue['severity']): number {
  return result.errors?.filter((issue) => issue.severity === severity).length ?? 0;
}

export function BatchValidator(): React.ReactElement {
  const [documentsText, setDocumentsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<Required<Pick<BatchResponse, 'results' | 'rateLimit'>> | null>(null);

  async function validateBatch() {
    const invoices = documentsText.split(/\n---+\n/).map((document) => document.trim()).filter(Boolean);
    if (invoices.length < 2) {
      setError('Paste at least 2 invoices separated by ---.');
      return;
    }
    if (invoices.length > 50) {
      setError('Batch size exceeds the 50-invoice limit.');
      return;
    }

    setBusy(true);
    setError('');
    setResponse(null);
    try {
      const result = await fetch('/api/tools/validate/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoices }),
      });
      const body = await result.json() as BatchResponse;
      if (!result.ok || !body.ok || !body.results || !body.rateLimit) {
        setError(body.error ?? 'Batch validation failed. Try again.');
        return;
      }
      setResponse({ results: body.results, rateLimit: body.rateLimit });
    } catch {
      setError('Could not reach the validator. Your invoices are still here — try again.');
    } finally {
      setBusy(false);
    }
  }

  const results = response?.results ?? [];
  const passCount = results.filter((result) => result.valid).length;
  const failCount = results.length - passCount;

  return h('section', { className: 'batch-validator', 'aria-label': 'Batch invoice validation' },
    h('p', { className: 'muted', style: { marginBottom: 12 } }, 'Paste 2–50 invoices separated by a line containing ---.') ,
    h('label', { htmlFor: 'batch-invoice-documents' }, 'Batch invoice documents'),
    h('textarea', {
      id: 'batch-invoice-documents',
      className: 'tool-input',
      rows: 14,
      value: documentsText,
      disabled: busy,
      spellCheck: false,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setDocumentsText(event.currentTarget.value),
    }),
    h('div', { className: 'cta-row' },
      h('button', { type: 'button', className: 'btn btn-secondary', disabled: busy, onClick: () => void validateBatch() }, busy ? 'Validating batch...' : 'Validate batch'),
    ),
    error ? h('p', { role: 'alert', className: 'form-msg err', style: { marginTop: 12 } }, error) : null,
    response ? h('section', { className: 'card', style: { marginTop: 20 }, 'aria-labelledby': 'batch-results-heading' },
      h('h3', { id: 'batch-results-heading', style: { marginBottom: 8 } }, `Batch results — ${results.length} invoices`),
      h('p', { className: 'muted', style: { marginBottom: 12 } }, `${passCount} pass preflight · ${failCount} fail preflight · ${response.rateLimit.remaining} of ${response.rateLimit.limit} checks left`),
      ...results.map((result) => h('div', {
        key: result.index,
        className: 'fix-row',
        style: { borderLeft: `3px solid ${result.valid ? 'var(--success)' : 'var(--error)'}`, marginBottom: 8 },
      },
      h('div', { className: 'fix-row-head' },
        h('span', { className: `pill ${result.valid ? 'ok' : 'bad'}` }, `#${result.index + 1}`),
        h('span', { className: `pill ${result.valid ? 'ok' : 'bad'}` }, result.valid ? 'PASS' : 'FAIL'),
        h('span', { className: 'muted', style: { fontSize: 12 } }, `Detected: ${result.invoiceType ?? 'not detected'} · profile: ${result.schemaVersion || 'not detected'}`),
      ),
      result.error
        ? h('p', { className: 'fix-message' }, result.error)
        : h('p', { className: 'fix-message' }, `${countIssues(result, 'error')} error${countIssues(result, 'error') === 1 ? '' : 's'} · ${countIssues(result, 'warning')} warning${countIssues(result, 'warning') === 1 ? '' : 's'}`),
      )),
      response.rateLimit.degraded ? h('p', { className: 'muted', style: { marginTop: 12 } }, 'Rate-limit protection is temporarily degraded.') : null,
    ) : null,
  );
}
