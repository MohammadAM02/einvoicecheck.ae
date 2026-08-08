// app/api/src/rules/generate/validate-xsd.js
// Compatibility wrapper — the neutral XSD authority lives in ../xsd.js.
import { validateXsd } from '../xsd.js';

/**
 * Structural XSD validation for generated invoices/credit notes. Auto-detects
 * the document type from the root element and validates against the matching
 * UBL 2.1 schema.
 *
 * @param {string} xml  The generated XML document.
 * @returns {{ documentType: 'Invoice'|'CreditNote'|null, issues: Array<{rule: string, path: string, message: string, severity: string, line: number|null, column: number|null, xmlPath: string}>, evalErrors: Array }}
 */
export function validateGenerateXsd(xml) {
  return validateXsd(xml);
}
