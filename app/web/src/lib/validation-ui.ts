export type ValidationIssue = {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
};

export type ValidationResult = {
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: ValidationIssue[];
};

export type ValidationRateLimit = {
  limit: number;
  remaining: number;
  resetSeconds: number;
  degraded: boolean;
};

export type ValidationLayer = 'format' | 'structure' | 'semantic';

export const LAYER_LABELS: Record<ValidationLayer, string> = {
  format: 'Format',
  structure: 'Structure',
  semantic: 'Semantic',
};

export function layerOf(rule: string): ValidationLayer {
  if (/^ENG-PARSE-/.test(rule) || /^FMT-/.test(rule)) return 'format';
  if (/^XSD-/.test(rule) || /^ENG-XSD-/.test(rule)) return 'structure';
  return 'semantic';
}

export type ValidateApiSuccess = {
  ok: true;
  result: ValidationResult;
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

export function toReportText(result: ValidationResult): string {
  const status = result.valid ? 'PREFLIGHT PASSED' : 'PREFLIGHT FAILED';
  const lines = [
    `einvoicecheck.ae - ${status}`,
    `Invoice type: ${result.invoiceType ?? 'Not identified'}`,
    `Profile: ${result.schemaVersion}`,
    '',
  ];

  if (result.valid || result.errors.length === 0) {
    lines.push('No blocking issues were found by the checks currently included in this preflight engine.');
  }

  if (result.errors.length > 0) {
    if (lines.at(-1) !== '') lines.push('');
    for (const issue of sortValidationIssues(result.errors)) {
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
