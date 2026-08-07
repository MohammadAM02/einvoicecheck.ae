/**
 * XSD validation gate for generated invoices.
 *
 * The main validateXsd in ../convert/xsd.js only handles Invoice schemas.
 * Credit notes use a different root element and schema. This module loads
 * both schemas eagerly and provides a single validateGenerateXsd(xml) that
 * auto-detects the document type from the root element.
 */

import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const UBL_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'pint-ae-resources', 'ubl-2.1', 'xsd');
const MAIN_DIR = path.join(UBL_DIR, 'maindoc');

const SCHEMAS = {};

function loadSchema(filename) {
  const filePath = path.join(MAIN_DIR, filename);
  const key = filename;
  if (SCHEMAS[key]) return SCHEMAS[key];
  try {
    SCHEMAS[key] = libxmljs.parseXml(fs.readFileSync(filePath, 'utf8'), {
      baseUrl: 'file://' + filePath.replace(/\\/g, '/'),
    });
    return SCHEMAS[key];
  } catch (e) {
    throw new Error(`UBL 2.1 XSD schema failed to load from ${filePath}: ${e.message}`);
  }
}

// Eager-load the two schemas we need. Fail at startup if missing.
loadSchema('UBL-Invoice-2.1.xsd');
loadSchema('UBL-CreditNote-2.1.xsd');

function detectSchemaKey(xml) {
  // Fast detection by checking for the CreditNote root namespace or element name.
  if (xml.includes('xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"') ||
      xml.includes('<CreditNote ')) {
    return 'UBL-CreditNote-2.1.xsd';
  }
  return 'UBL-Invoice-2.1.xsd';
}

function pathFromMessage(message) {
  const m = message.match(/\{.*\}([A-Za-z0-9]+)/);
  return m ? `/${m[1]}` : '';
}

/**
 * Structural XSD validation for generated invoices. Auto-detects document type
 * and validates against the appropriate UBL 2.1 schema.
 *
 * @param {string} xml  The generated XML document.
 * @returns {{ issues: Array<{rule: string, path: string, message: string, severity: string}>, evalErrors: Array }}
 */
export function validateGenerateXsd(xml) {
  const issues = [];
  const evalErrors = [];

  const schemaKey = detectSchemaKey(xml);
  const schema = SCHEMAS[schemaKey];
  if (!schema) {
    evalErrors.push({ rule: 'XSD-ERR', message: `No schema loaded for ${schemaKey}.` });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD schema not available for ${schemaKey}.`, severity: 'error' });
    return { issues, evalErrors };
  }

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
