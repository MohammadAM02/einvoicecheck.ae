import { describe, expect, it } from 'vitest';
import {
  fieldLabel,
  flattenValidationIssues,
  layerOf,
  sortValidationIssues,
  toReportText,
  type ValidationIssue,
  type XmlValidationResult,
} from '@/lib/validation-ui';

const baseResult: XmlValidationResult = {
  valid: false,
  inputFormat: 'xml',
  validationScope: 'pint-ae-ubl-xml',
  invoiceType: '388',
  schemaVersion: 'PINT AE 1.0',
  format: { status: 'failed', issues: [] },
  structure: { status: 'failed', issues: [] },
  semantic: { status: 'failed', issues: [] },
};

function issue(overrides: Partial<ValidationIssue>): ValidationIssue {
  return { path: '/', rule: 'R-01', severity: 'error', message: 'msg', line: null, column: null, xmlPath: null, ...overrides };
}

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
      issue({ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Check currency.' }),
      issue({ path: '/customer/trn', rule: 'TRN-01', severity: 'error', message: 'TRN is invalid.' }),
    ];

    const sorted = sortValidationIssues(issues);

    expect(sorted).toEqual([issues[1], issues[0]]);
    expect(sorted).not.toBe(issues);
    expect(issues.map((i) => i.severity)).toEqual(['warning', 'error']);
  });
});

describe('layerOf', () => {
  it('classifies format rules', () => {
    expect(layerOf('ENG-PARSE-01')).toBe('format');
    expect(layerOf('FMT-CHARS-01')).toBe('format');
    expect(layerOf('FMT-NS-02')).toBe('format');
  });

  it('classifies structure rules', () => {
    expect(layerOf('XSD-01')).toBe('structure');
    expect(layerOf('ENG-XSD-01')).toBe('structure');
  });

  it('classifies everything else as semantic', () => {
    expect(layerOf('ibr-073')).toBe('semantic');
    expect(layerOf('ibr-132-ae')).toBe('semantic');
    expect(layerOf('ENG-VAT-01')).toBe('semantic');
    expect(layerOf('aligned-ibrp-002-ae')).toBe('semantic');
    expect(layerOf('ENG-SCH-01')).toBe('semantic');
  });
});

describe('flattenValidationIssues', () => {
  it('returns issues in Format, Structure, Semantic order', () => {
    const formatIssue = issue({ rule: 'ENG-PARSE-01', message: 'parse' });
    const structureIssue = issue({ rule: 'XSD-01', message: 'xsd' });
    const semanticIssue = issue({ rule: 'ibr-073', message: 'semantic' });

    const issues = flattenValidationIssues({
      ...baseResult,
      format: { status: 'failed', issues: [formatIssue] },
      structure: { status: 'failed', issues: [structureIssue] },
      semantic: { status: 'failed', issues: [semanticIssue] },
    });

    expect(issues.map((i) => i.rule)).toEqual(['ENG-PARSE-01', 'XSD-01', 'ibr-073']);
  });

  it('omits empty layers', () => {
    const issues = flattenValidationIssues({
      ...baseResult,
      valid: true,
      format: { status: 'passed', issues: [] },
      structure: { status: 'skipped', issues: [] },
      semantic: { status: 'passed', issues: [] },
    });

    expect(issues).toEqual([]);
  });
});

describe('toReportText', () => {
  it('renders a failed preflight with readable issues and fixes', () => {
    const report = toReportText({
      ...baseResult,
      format: {
        status: 'failed',
        issues: [issue({ path: '/customer/trn', rule: 'TRN-01', message: 'TRN is invalid.', fix: 'Enter a 15-digit TRN.' })],
      },
    });

    expect(report).toContain('einvoicecheck.ae - PREFLIGHT FAILED');
    expect(report).toContain('Invoice type: 388');
    expect(report).toContain('Profile: PINT AE 1.0');
    expect(report).toContain('Buyer TRN | ERROR | TRN-01\nTRN is invalid.\nFix: Enter a 15-digit TRN.');
    expect(report).toContain('Preflight only: this is not filing, accreditation, or a guarantee of acceptance.');
    expect(report).not.toContain('WOULD BE REJECTED');
  });

  it('renders a passing preflight without rejection language', () => {
    const report = toReportText({
      ...baseResult,
      valid: true,
      invoiceType: null,
      format: { status: 'passed', issues: [] },
      structure: { status: 'passed', issues: [] },
      semantic: { status: 'passed', issues: [] },
    });

    expect(report.split('\n')[0]).toBe('einvoicecheck.ae - PREFLIGHT PASSED');
    expect(report).toContain('Invoice type: Not identified');
    expect(report).toContain('No blocking issues were found by the checks currently included in this preflight engine.');
    expect(report).not.toContain('WOULD BE REJECTED');
  });

  it('includes warnings even when the preflight passes', () => {
    const report = toReportText({
      ...baseResult,
      valid: true,
      format: { status: 'passed', issues: [] },
      structure: { status: 'passed', issues: [] },
      semantic: {
        status: 'passed',
        issues: [issue({ path: '/currency', rule: 'CUR-01', severity: 'warning', message: 'Confirm the currency code.' })],
      },
    });

    expect(report).toContain('No blocking issues were found by the checks currently included in this preflight engine.');
    expect(report).toContain('Invoice currency | WARNING | CUR-01\nConfirm the currency code.');
  });
});
