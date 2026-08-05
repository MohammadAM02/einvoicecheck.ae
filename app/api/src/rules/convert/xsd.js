// app/api/src/rules/convert/xsd.js
import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const UBL_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'pint-ae-resources', 'ubl-2.1', 'xsd');
const MAIN_DOC = path.join(UBL_DIR, 'maindoc', 'UBL-Invoice-2.1.xsd');

// Load + compile once at module load. Failure here must fail the deploy loudly —
// a missing schema means the gate cannot run (fail-closed at startup).
let schema;
try {
  // file:// base URI is REQUIRED: the XSD's relative schemaLocation imports
  // (../common/…xsd) only resolve when the schema is parsed with a base URI.
  // Spike 004 proved plain parseXml(string) throws 'Invalid XSD schema'.
  schema = libxmljs.parseXml(fs.readFileSync(MAIN_DOC, 'utf8'), {
    baseUrl: 'file://' + MAIN_DOC.replace(/\\/g, '/'),
  });
} catch (e) {
  throw new Error(`UBL 2.1 XSD schema failed to load from ${MAIN_DOC}: ${e.message}`);
}

function pathFromMessage(message) {
  const m = message.match(/\{.*\}([A-Za-z0-9]+)/);
  return m ? `/${m[1]}` : '';
}

/**
 * Structural (XSD) validation gate. Non-blocking by design: issues are reported
 * to the caller, which decides how to surface them (converter dataIssues).
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
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error' });
    return { issues, evalErrors };
  }

  let ok;
  try {
    ok = doc.validate(schema);
  } catch (e) {
    evalErrors.push({ rule: 'XSD-ERR', message: 'XSD validation threw.', error: e.message });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error' });
    return { issues, evalErrors };
  }

  if (!ok) {
    for (const err of doc.validationErrors || []) {
      issues.push({
        rule: 'XSD-01',
        path: pathFromMessage(err.message || ''),
        message: (err.message || 'Unknown XSD violation').trim(),
        severity: 'error',
      });
    }
  }

  return { issues, evalErrors };
}
