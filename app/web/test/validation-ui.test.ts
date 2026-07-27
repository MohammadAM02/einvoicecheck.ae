import { describe, expect, it } from 'vitest';
import { fieldLabel, sortValidationIssues, toReportText, type ValidationIssue, type ValidationResult } from '@/lib/validation-ui';

describe('fieldLabel', () => {
  it('uses finance-readable labels for known paths', () => {
    expect(fieldLabel('/customer/trn')).toBe('Buyer TRN');
    expect(fieldLabel('/supplier/trn')).toBe('Supplier TRN');
    expect(fieldLabel('/totals/payableAmount')).toBe('Amount due');
    expect(fieldLabel('/currency')).toBe('Invoice currency');
  });

  it('returns unknown paths unchanged', () => {
    expect(fieldLabel('/lines/0/itemName')).toBe('/lines/0/itemName');
  });
});

describe('sortValidationIssues', () => {
  it('puts errors before warnings without mutating the input', () => {
    const issues: ValidationIssue[] = [
      { path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' },
      { path: '/customer/trn', rule: 'TRN-01', severity: 'error', message: 'TRN is invalid.' },
    ];

    const sorted = sortValidationIssues(issues);

    expect(sorted).toEqual([issues[1], issues[0]]);
    expect(sorted).not.toBe(issues);
    expect(issues.map((issue) => issue.severity)).toEqual(['warning', 'error']);
  });
});

describe('toReportText', () => {
  it('renders a failed preflight with readable issues and fixes', () => {
    const result: ValidationResult = {
      valid: false,
      invoiceType: '388',
      schemaVersion: 'PINT AE 1.0',
      errors: [
        { path: '/customer/trn', rule: 'TRN-01', severity: 'error', message: 'TRN is invalid.', fix: 'Enter a 15-digit TRN.' },
      ],
    };

    const report = toReportText(result);

    expect(report).toContain('einvoicecheck.ae - PREFLIGHT FAILED');
    expect(report).toContain('Invoice type: 388');
    expect(report).toContain('Profile: PINT AE 1.0');
    expect(report).toContain('Buyer TRN | ERROR | TRN-01\nTRN is invalid.\nFix: Enter a 15-digit TRN.');
    expect(report).toContain('Preflight only: this is not filing, accreditation, or a guarantee of acceptance.');
    expect(report).not.toContain('WOULD BE REJECTED');
  });

  it('renders a passing preflight without rejection language', () => {
    const report = toReportText({ valid: true, invoiceType: null, schemaVersion: 'PINT AE 1.0', errors: [] });

    expect(report.split('\n')[0]).toBe('einvoicecheck.ae - PREFLIGHT PASSED');
    expect(report).toContain('Invoice type: Not identified');
    expect(report).toContain('No blocking issues were found by the checks currently included in this preflight engine.');
    expect(report).not.toContain('WOULD BE REJECTED');
  });

  it('includes warnings even when the preflight passes', () => {
    const report = toReportText({
      valid: true,
      invoiceType: '388',
      schemaVersion: 'PINT AE 1.0',
      errors: [{ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Confirm the currency code.' }],
    });

    expect(report).toContain('No blocking issues were found by the checks currently included in this preflight engine.');
    expect(report).toContain('Invoice currency | WARNING | CUR-01\nConfirm the currency code.');
  });
});
