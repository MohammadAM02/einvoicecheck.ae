// app/api/src/rules/xml-validation.js — layered XML validation core.
//
// validateXmlDocument(xml) runs the full strict UBL validation pipeline for a
// PINT AE XML document and reports it in three layers:
//   format    — XML well-formedness / parse gate (ENG-PARSE-01)
//   structure — UBL 2.1 XSD structural validation (XSD-01 / XSD-ERR)
//   semantic  — canonical engine rules + PINT AE Schematron
//
// The semantic layer runs even when the structure layer failed: an XSD
// violation reports the schema problem AND the business-rule defects.
// Fail-closed: a document that fails well-formedness skips both deeper layers.
import { normalizeInput } from './normalize.js';
import { evaluateInvoiceRules, SCHEMA_VERSION_DEFAULT } from './engine.js';
import { validateXsd } from './xsd.js';
import { validateSchematron } from '../schematron-interpreter.js';

const layer = (status, issues) => ({ status, issues });

/**
 * Client-facing messages must never leak server filesystem layout: libxml2
 * can embed schema file paths in XSD-ERR text. Strip path-like fragments.
 */
function safeMessage(message) {
  return String(message)
    .replace(/file:\/\/[^\s]*/g, '')
    .replace(/[A-Za-z]:[\\/][^\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize any engine/XSD/Schematron issue into the 8-field shape. */
function withLocation(issue) {
  return {
    path: issue.path ?? '/',
    rule: issue.rule,
    severity: issue.severity ?? 'error',
    message: safeMessage(issue.message),
    fix: issue.fix ?? '',
    line: issue.line ?? null,
    column: issue.column ?? null,
    xmlPath: issue.xmlPath ?? null,
  };
}

const hasError = (issues) => issues.some((i) => i.severity === 'error');

/**
 * Validate a UBL 2.1 / PINT AE XML document across the format, structure and
 * semantic layers.
 *
 * @returns {{
 *   valid: boolean,
 *   inputFormat: 'xml',
 *   validationScope: 'pint-ae-ubl-xml',
 *   invoiceType: string|null,
 *   schemaVersion: string,
 *   format: {status, issues},
 *   structure: {status, issues},
 *   semantic: {status, issues},
 * }}
 */
/** Layered parse-failure result (F-01 contract): malformed input is a 200
 * with a failed format layer, never a route crash. */
function parseFailed(message) {
  return {
    valid: false,
    inputFormat: 'xml',
    validationScope: 'pint-ae-ubl-xml',
    invoiceType: null,
    schemaVersion: SCHEMA_VERSION_DEFAULT,
    format: layer('failed', [
      withLocation({
        path: '/',
        rule: 'ENG-PARSE-01',
        severity: 'error',
        message: `Could not parse the invoice: ${message}`,
        fix: 'Send a canonical JSON invoice or a valid UBL 2.1 / PINT AE XML document.',
      }),
    ]),
    structure: layer('skipped', []),
    semantic: layer('skipped', []),
  };
}

export function validateXmlDocument(xml) {
  let normalized;
  try {
    normalized = normalizeInput(xml, 'application/xml');
  } catch (err) {
    // jsdom's XML parser throws for forbidden XML 1.0 characters instead of
    // returning a parseError; fold those into the layered parse gate so the
    // caller gets a valid:false diagnosis (F-01 contract) instead of a crash.
    normalized = { invoice: null, parseError: err?.message || String(err) };
  }
  const { invoice, parseError } = normalized;

  if (parseError) {
    return parseFailed(parseError);
  }

  // Structure and semantic layers re-parse the document; their parsers throw
  // on namespace well-formedness violations (e.g. an unbound prefix) and
  // forbidden characters. Convert any such throw into the layered parse-gate
  // result instead of crashing the route.
  try {

  // Structure: neutral XSD authority.
  const xsd = validateXsd(xml);
  const structureIssues = xsd.issues.map(withLocation);
  const structure = layer(hasError(structureIssues) ? 'failed' : 'passed', structureIssues);

  // Semantic: engine rules + Schematron, run even when structure failed.
  const engine = evaluateInvoiceRules(invoice);
  const sch = validateSchematron(xml);
  let semanticIssues = [...engine.errors, ...sch.errors].map(withLocation);

  // The interpreter's ibr-073 assert covers the same defect as the adapter's
  // ENG-SCH-01/IBR-073 date check (the adapter always runs; the interpreter is
  // XML-only). When the interpreter reported it, drop the adapter duplicates —
  // one defect, one rule id (same dedupe as routes/validate.js).
  if (sch.errors.some((e) => e.rule === 'ibr-073')) {
    semanticIssues = semanticIssues.filter(
      (i) => !(i.rule.includes('IBR-073') && !i.rule.includes('ibr-073'))
    );
  }
  const semantic = layer(hasError(semanticIssues) ? 'failed' : 'passed', semanticIssues);

  // Valid = no error-severity issue in any non-skipped layer. Warnings never
  // invalidate the document.
  const valid = !hasError([...structureIssues, ...semanticIssues]);

  return {
    valid,
    inputFormat: 'xml',
    validationScope: 'pint-ae-ubl-xml',
    invoiceType: invoice.invoiceType ?? null,
    schemaVersion: invoice.schemaVersion || SCHEMA_VERSION_DEFAULT,
    format: layer('passed', []),
    structure,
    semantic,
  };
  } catch (err) {
    return parseFailed(err?.message || String(err));
  }
}
