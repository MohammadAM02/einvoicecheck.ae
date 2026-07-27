// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationSummary } from '@/components/validation/ValidationSummary';
import type { ValidationRateLimit, ValidationResult } from '@/lib/validation-ui';

afterEach(() => cleanup());

const rateLimit: ValidationRateLimit = { limit: 10, remaining: 7, resetSeconds: 300, degraded: false };

const failedResult: ValidationResult = {
  valid: false,
  invoiceType: '388',
  schemaVersion: 'PINT AE 1.0',
  errors: [{ path: '/customer/trn', rule: 'TRN-01', severity: 'error', message: 'Buyer TRN is invalid.', fix: 'Enter a 15-digit TRN.' }],
};

describe('ValidationSummary', () => {
  it('renders failed preflight issues with readable problem and fix content', () => {
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    expect(screen.getByRole('heading', { name: 'Preflight failed' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Buyer TRN' })).toBeTruthy();
    expect(screen.getByText('Blocking issue')).toBeTruthy();
    expect(screen.getByText('Buyer TRN is invalid.')).toBeTruthy();
    expect(screen.getByText('Fix: Enter a 15-digit TRN.')).toBeTruthy();
  });

  it('keeps technical path and rule hidden until details is opened', async () => {
    const user = userEvent.setup();
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    expect(screen.getByText('Technical details').closest('details')?.open).toBe(false);
    await user.click(screen.getByText('Technical details'));
    expect(screen.getByText('Technical details').closest('details')?.open).toBe(true);
    expect(screen.getByText('/customer/trn')).toBeTruthy();
    expect(screen.getByText('TRN-01')).toBeTruthy();
  });

  it('renders blocking issues before warnings when API order is reversed', () => {
    render(h(ValidationSummary, { result: { ...failedResult, errors: [
      { path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' },
      failedResult.errors[0],
    ] }, rateLimit, onReset: vi.fn() }));

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Buyer TRN', 'Invoice currency']);
  });

  it('renders passing copy and warnings on a valid preflight', () => {
    render(h(ValidationSummary, { result: { ...failedResult, valid: true, errors: [{ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' }] }, rateLimit, onReset: vi.fn() }));

    expect(screen.getByRole('heading', { name: 'Preflight passed' })).toBeTruthy();
    expect(screen.getByText('No blocking issues were found by the checks currently included in this preflight engine.')).toBeTruthy();
    expect(screen.getByText('Warning')).toBeTruthy();
    expect(screen.getByText('Check currency.')).toBeTruthy();
  });

  it('focuses the result heading', () => {
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Preflight failed' }));
  });

  it('calls onReset when validating another file', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset }));

    await user.click(screen.getByRole('button', { name: 'Validate another file' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('copies the preflight report when clipboard is available', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    await user.click(screen.getByRole('button', { name: 'Copy report' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('einvoicecheck.ae - PREFLIGHT FAILED'));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('shows API conversion after the result and rate-limit information', () => {
    render(h(ValidationSummary, { result: failedResult, rateLimit: { ...rateLimit, degraded: true }, onReset: vi.fn() }));

    expect(screen.getByRole('link', { name: 'Automate with the API' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByText('7 of 10 free checks left this hour.')).toBeTruthy();
    expect(screen.getByText('Rate-limit protection is temporarily degraded.')).toBeTruthy();
    expect(screen.queryByText('Would be rejected')).toBeNull();
  });
});
