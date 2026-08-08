import { type XmlValidationIssue, type XmlValidationLayer, type XmlValidationResult } from './validation';

/** Issue shape mirrors the API v2 contract exactly (one type source: ./validation). */
export type ValidationIssue = XmlValidationIssue;

/** Layer result object mirrors the API (status + issues). */
export type ValidationLayer = XmlValidationLayer;

export type ValidationLayerStatus = XmlValidationLayer['status'];

export type { XmlValidationResult } from './validation';

export type ValidationRateLimit = {
  limit: number;
  remaining: number;
  resetSeconds: number;
  degraded: boolean;
};

/** Layer NAMES, for filtering and labels (the response layers are authoritative). */
export type ValidationLayerName = 'format' | 'structure' | 'semantic';

export const LAYER_LABELS: Record<ValidationLayerName, string> = {
  format: 'Format',
  structure: 'Structure',
  semantic: 'Semantic',
};

/** @deprecated Rule-prefix inference. The v2 response layer is authoritative. */
export function layerOf(rule: string): ValidationLayerName {
  if (/^ENG-PARSE-/.test(rule) || /^FMT-/.test(rule)) return 'format';
  if (/^XSD-/.test(rule) || /^ENG-XSD-/.test(rule)) return 'structure';
  return 'semantic';
}

export type ValidateApiSuccess = {
  ok: true;
  result: XmlValidationResult;
  rateLimit: ValidationRateLimit;
};

const FIELD_LABELS: Record<string, string> = {
  '/customer/trn': 'Buyer TRN',
  '/supplier/trn': 'Supplier TRN',
  '/totals/payableAmount': 'Amount due',
  '/totals/taxAmount': 'VAT total',
  '/totals/taxInclusiveAmount': 'Total including VAT',
  '/currency': 'Invoice currency',
  '/invoiceNumber': 'Invoice number',
  '/issueDate': 'Issue date',
};

export function fieldLabel(path: string): string {
  return FIELD_LABELS[path] ?? path;
}

export function sortValidationIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
}

/** All issues in Format, Structure, Semantic order; empty layers are omitted. */
export function flattenValidationIssues(result: XmlValidationResult): ValidationIssue[] {
  return [...result.format.issues, ...result.structure.issues, ...result.semantic.issues];
}

export function toReportText(result: XmlValidationResult): string {
  const status = result.valid ? 'PREFLIGHT PASSED' : 'PREFLIGHT FAILED';
  const issues = flattenValidationIssues(result);
  const lines = [
    `einvoicecheck.ae - ${status}`,
    `Invoice type: ${result.invoiceType ?? 'Not identified'}`,
    `Profile: ${result.schemaVersion}`,
    '',
  ];

  if (result.valid || issues.length === 0) {
    lines.push('No blocking issues were found by the checks currently included in this preflight engine.');
  }

  if (issues.length > 0) {
    if (lines.at(-1) !== '') lines.push('');
    for (const issue of sortValidationIssues(issues)) {
      lines.push(`${fieldLabel(issue.path)} | ${issue.severity.toUpperCase()} | ${issue.rule}`);
      lines.push(issue.message);
      if (issue.fix) lines.push(`Fix: ${issue.fix}`);
      lines.push('');
    }
    lines.pop();
  }

  lines.push('', 'Preflight only: this is not filing, accreditation, or a guarantee of acceptance.');
  return lines.join('\n');
}
