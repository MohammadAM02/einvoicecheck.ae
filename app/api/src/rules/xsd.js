// app/api/src/rules/xsd.js — single native authority for UBL 2.1 Invoice and
// CreditNote structural (XSD) validation. Convert and generate paths both
// delegate here; no other module loads schemas or runs doc.validate().
import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const UBL_DIR = path.resolve(import.meta.dirname, '..', '..', 'pint-ae-resources', 'ubl-2.1', 'xsd');
const MAIN_DIR = path.join(UBL_DIR, 'maindoc');

function loadSchema(filename) {
  const filePath = path.join(MAIN_DIR, filename);
  try {
    // file:// base URI is REQUIRED: the XSD's relative schemaLocation imports
    // (../common/…xsd) only resolve when the schema is parsed with a base URI.
    // Spike 004 proved plain parseXml(string) throws 'Invalid XSD schema'.
    return libxmljs.parseXml(fs.readFileSync(filePath, 'utf8'), {
      baseUrl: 'file://' + filePath.replace(/\\/g, '/'),
    });
  } catch (e) {
    throw new Error(`UBL 2.1 XSD schema failed to load from ${filePath}: ${e.message}`);
  }
}

// Load + compile once at module load. Failure here must fail the deploy loudly —
// a missing schema means the gate cannot run (fail-closed at startup).
const SCHEMAS = {
  Invoice: loadSchema('UBL-Invoice-2.1.xsd'),
  CreditNote: loadSchema('UBL-CreditNote-2.1.xsd'),
};

function pathFromMessage(message) {
  const m = message.match(/\{.*\}([A-Za-z0-9]+)/);
  return m ? `/${m[1]}` : '';
}

/** libxml2 exposes line/column as numbers; keep null when absent. */
const toNumOrNull = (v) => (v === null || v === undefined ? null : Number(v));

function xsdIssue(err, rule) {
  const message = (err.message || 'Unknown XSD violation').trim();
  return {
    rule,
    path: pathFromMessage(message),
    message,
    severity: 'error',
    line: toNumOrNull(err.line),
    column: toNumOrNull(err.column),
    xmlPath: pathFromMessage(message), // best-effort element path from the message
  };
}

/**
 * Structural (XSD) validation gate. Non-blocking by design: issues are reported
 * to the caller, which decides how to surface them (converter dataIssues).
 *
 * Schema selection is by root element local name: CreditNote → CreditNote
 * schema, Invoice → Invoice schema, anything else → Invoice schema so libxml2
 * reports the structural root violation. Unknown roots still yield XSD-01.
 *
 * Fail-closed: if libxml2 cannot even validate the document, that surfaces as
 * an XSD-ERR issue — never a silent pass.
 */
export function validateXsd(xml) {
  const issues = [];
  const evalErrors = [];

  let doc;
  try {
    doc = libxmljs.parseXml(xml);
  } catch (e) {
    evalErrors.push({ rule: 'XSD-ERR', message: 'Document could not be parsed for XSD validation.', error: e.message });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error', line: null, column: null, xmlPath: '' });
    return { documentType: null, issues, evalErrors };
  }

  const rootName = doc.root() ? doc.root().name() : '';
  const documentType = rootName === 'CreditNote' ? 'CreditNote' : rootName === 'Invoice' ? 'Invoice' : null;
  const schema = SCHEMAS[documentType] || SCHEMAS.Invoice;

  let ok;
  try {
    ok = doc.validate(schema);
  } catch (e) {
    evalErrors.push({ rule: 'XSD-ERR', message: 'XSD validation threw.', error: e.message });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error', line: null, column: null, xmlPath: '' });
    return { documentType, issues, evalErrors };
  }

  if (!ok) {
    for (const err of doc.validationErrors || []) {
      issues.push(xsdIssue(err, 'XSD-01'));
    }
  }

  return { documentType, issues, evalErrors };
}
