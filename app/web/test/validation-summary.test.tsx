// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationSummary } from '@/components/validation/ValidationSummary';
import type { ValidationIssue, ValidationRateLimit, XmlValidationResult } from '@/lib/validation-ui';

afterEach(() => cleanup());

const rateLimit: ValidationRateLimit = { limit: 10, remaining: 7, resetSeconds: 300, degraded: false };

function issue(overrides: Partial<ValidationIssue>): ValidationIssue {
  return { path: '/', rule: 'R-01', severity: 'error', message: 'msg', line: null, column: null, xmlPath: null, ...overrides };
}

const failedResult: XmlValidationResult = {
  valid: false,
  inputFormat: 'xml',
  validationScope: 'pint-ae-ubl-xml',
  invoiceType: '388',
  schemaVersion: 'PINT AE 1.0',
  format: {
    status: 'failed',
    issues: [issue({ path: '/customer/trn', rule: 'TRN-01', message: 'Buyer TRN is invalid.', fix: 'Enter a 15-digit TRN.' })],
  },
  structure: { status: 'passed', issues: [] },
  semantic: { status: 'passed', issues: [] },
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

  it('renders blocking issues before warnings when layer order is reversed', () => {
    render(h(ValidationSummary, {
      result: {
        ...failedResult,
        semantic: {
          status: 'failed',
          issues: [issue({ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' })],
        },
      },
      rateLimit,
      onReset: vi.fn(),
    }));

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Buyer TRN', 'Invoice currency']);
  });

  it('renders passing copy and warnings on a valid preflight', () => {
    render(h(ValidationSummary, {
      result: {
        ...failedResult,
        valid: true,
        format: { status: 'passed', issues: [] },
        semantic: { status: 'passed', issues: [issue({ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' })] },
      },
      rateLimit,
      onReset: vi.fn(),
    }));

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

  it('keeps revalidation visually primary beside the report action', () => {
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    expect(screen.getByRole('button', { name: 'Validate another file' }).className).toContain('btn-primary');
    expect(screen.getByRole('button', { name: 'Copy report' }).className).toContain('btn-ghost');
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

  it('shows the correction path before operational metadata and findings before API conversion', () => {
    const { container } = render(h(ValidationSummary, { result: failedResult, rateLimit: { ...rateLimit, degraded: true }, onReset: vi.fn() }));

    const apiLink = screen.getByRole('link', { name: 'Use the validation API' });
    const issueList = container.querySelector('.validation-issue-list');
    const nextAction = screen.getByRole('region', { name: 'Correct and revalidate' });
    const profile = screen.getByText('Validation profile: PINT AE 1.0');
    expect(apiLink.getAttribute('href')).toBe('/signup');
    expect(screen.getByText('Need this check inside your ERP or workflow?')).toBeTruthy();
    expect(nextAction.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(issueList!.compareDocumentPosition(apiLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('7 of 10 free checks left this hour.')).toBeTruthy();
    expect(screen.getByText('Rate-limit protection is temporarily degraded.')).toBeTruthy();
    expect(screen.queryByText('Would be rejected')).toBeNull();
  });

  it('renders three layer badges with statuses and counts from the v2 layers', () => {
    const result: XmlValidationResult = {
      ...failedResult,
      format: { status: 'failed', issues: [issue({ rule: 'ENG-PARSE-01', message: 'parse' })] },
      structure: { status: 'failed', issues: [issue({ rule: 'XSD-01', message: 'structure' })] },
      semantic: {
        status: 'failed',
        issues: [
          issue({ rule: 'ibr-073', message: 'semantic' }),
          issue({ rule: 'ENG-VAT-01', message: 'semantic 2' }),
        ],
      },
    };
    const { container } = render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    expect(screen.getByText('Format')).toBeTruthy();
    expect(screen.getByText('Structure')).toBeTruthy();
    expect(screen.getByText('Semantic')).toBeTruthy();
    // counts: 1 format, 1 structure, 2 semantic
    expect(screen.getByText('1 Format')).toBeTruthy();
    expect(screen.getByText('1 Structure')).toBeTruthy();
    expect(screen.getByText('2 Semantic')).toBeTruthy();
    // all three failed in this fixture -> three failed status badges
    expect(container.querySelectorAll('.validation-layer-badge.is-failed')).toHaveLength(3);
  });

  it('renders skipped layers visibly distinct from passed layers', () => {
    const result: XmlValidationResult = {
      ...failedResult,
      format: { status: 'failed', issues: failedResult.format.issues },
      structure: { status: 'passed', issues: [] },
      semantic: { status: 'skipped', issues: [] },
    };
    const { container } = render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    const badges = Array.from(container.querySelectorAll('.validation-layer-badge')) as HTMLElement[];
    const byLabel = (label: string) => badges.find((badge) => badge.textContent?.includes(label))!;
    expect(byLabel('Format').className).toContain('is-failed');
    expect(byLabel('Format').textContent).toContain('1 Format');
    expect(byLabel('Structure').className).toContain('is-passed');
    expect(byLabel('Structure').textContent).toContain('0 Structure');
    // skipped layers show an em dash instead of a count
    expect(byLabel('Semantic').className).toContain('is-skipped');
    expect(byLabel('Semantic').textContent).toContain('— Semantic');
    expect(byLabel('Semantic').textContent).not.toContain('0 Semantic');
  });

  it('renders line/column and XML path locations only when supplied', () => {
    const result: XmlValidationResult = {
      ...failedResult,
      format: {
        status: 'failed',
        issues: [issue({ path: '/Invoice', rule: 'ENG-PARSE-01', message: 'Mismatched closing tag.', line: 7, column: 2 })],
      },
      structure: {
        status: 'failed',
        issues: [issue({ path: '/Invoice/cbc:ID', rule: 'XSD-01', message: 'Not allowed here.', line: 3, xmlPath: '/Invoice/cbc:ID' })],
      },
      semantic: {
        status: 'failed',
        issues: [issue({ path: '/totals/payableAmount', rule: 'ibr-073', message: 'Amount mismatch.' })],
      },
    };
    const { container } = render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    const issues = Array.from(container.querySelectorAll('.validation-issue')) as HTMLElement[];
    expect(issues[0].textContent).toContain('Line 7, column 2');
    expect(issues[1].textContent).toContain('Line 3');
    expect(issues[1].textContent).toContain('XML path: /Invoice/cbc:ID');
    // no line/column/xmlPath on the third issue
    expect(issues[2].querySelector('.validation-issue__location')).toBeNull();
    expect(issues[2].querySelector('.validation-issue__xml-path')).toBeNull();
  });

  it('omits location lines entirely when no issue has them', () => {
    render(h(ValidationSummary, { result: failedResult, rateLimit, onReset: vi.fn() }));

    expect(screen.queryByText(/Line \d/)).toBeNull();
    expect(screen.queryByText(/XML path/)).toBeNull();
  });

  it('filters the issue list when a layer badge is clicked', async () => {
    const user = userEvent.setup();
    const result: XmlValidationResult = {
      ...failedResult,
      structure: { status: 'failed', issues: [issue({ path: '/a', rule: 'XSD-01', message: 'structure issue' })] },
      semantic: { status: 'failed', issues: [issue({ path: '/b', rule: 'ibr-073', message: 'semantic issue' })] },
    };
    render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    await user.click(screen.getByText('1 Structure'));
    expect(screen.getByText('structure issue')).toBeTruthy();
    expect(screen.queryByText('semantic issue')).toBeNull();
  });
});
