/**
 * Layered XML validation core tests (app/api/src/rules/xml-validation.js).
 *
 * Three layers: format (well-formedness / parse), structure (XSD), semantic
 * (engine rules + PINT AE Schematron). Layers are skipped when an earlier
 * gate fails, except semantic which runs even after an XSD failure.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateXmlDocument } from '../src/rules/xml-validation.js';
import { validUblXml, validCreditNoteXml } from './helpers/fixtures.js';

const STANDARD = fs.readFileSync(
  path.join(import.meta.dirname, '..', 'schematron', 'examples', 'Standard tax invoice.xml'),
  'utf8');

describe('validateXmlDocument (layered XML validation core)', () => {
  it('stops after a malformed XML format failure', () => {
    const result = validateXmlDocument(validUblXml().replace('</Invoice>', '</Invocie>'));
    expect(result.valid).toBe(false);
    expect(result.format.status).toBe('failed');
    expect(result.format.issues[0].rule).toBe('ENG-PARSE-01');
    expect(result.structure.status).toBe('skipped');
    expect(result.semantic.status).toBe('skipped');
  });

  it('runs semantic rules after an XSD failure', () => {
    const result = validateXmlDocument(validUblXml().replace(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:oasis:names:specification:ubl:schema:xsd:Wrong-2',
    ));
    expect(result.format.status).toBe('passed');
    expect(result.structure.status).toBe('failed');
    expect(result.structure.issues.some((issue) => issue.rule === 'XSD-01')).toBe(true);
    // Semantic runs even when structure failed: it is never skipped. (The
    // stub fixture is not PINT-AE conformant, so the interpreter legitimately
    // finds defects — status here is 'failed', not 'passed'; the point of the
    // assertion is that the layer ran.)
    expect(result.semantic.status).not.toBe('skipped');
    expect(result.valid).toBe(false);
  });

  it('passes the structure layer for a valid Invoice', () => {
    const result = validateXmlDocument(STANDARD);
    expect(result.format.status).toBe('passed');
    expect(result.structure.status).toBe('passed');
    expect(result.structure.issues).toEqual([]);
  });

  it('passes the structure layer for a valid CreditNote', () => {
    const result = validateXmlDocument(validCreditNoteXml());
    expect(result.format.status).toBe('passed');
    expect(result.structure.status).toBe('passed');
    expect(result.structure.issues).toEqual([]);
  });

  it('rejects XML with a non-zero AE reverse-charge subtotal tax (A-004)', () => {
    const baseXml = fs.readFileSync(
      path.join(import.meta.dirname, '..', 'pint-ae-resources', 'trn-invoice', 'example', 'Supply under Reverse charge mechanism.xml'),
      'utf8'
    );
    // PINT-AE sample's AE subtotal tax is 0 (rule absent); corrupt it and
    // the AE zero-tax rule must fire.
    const zeroRules = validateXmlDocument(baseXml).semantic.issues.map((i) => i.rule);
    expect(zeroRules).not.toContain('aligned-ibrp-ae-09-ae');
    const xml = baseXml.replace(
      /(<cbc:TaxAmount currencyID="AED">)0(<\/cbc:TaxAmount>\s*<cac:TaxCategory>\s*<cbc:ID>AE<\/cbc:ID>)/,
      '$15$2'
    );
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(false);
    const aeRules = result.semantic.issues.map((i) => i.rule);
    expect(aeRules).toContain('aligned-ibrp-ae-09-ae');
  });

  it('every issue location field is either a real value or null', () => {
    const results = [
      validateXmlDocument(validUblXml().replace('</Invoice>', '</Invocie>')),
      validateXmlDocument(validUblXml().replace(
        'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'urn:oasis:names:specification:ubl:schema:xsd:Wrong-2',
      )),
      validateXmlDocument(validUblXml()),
      validateXmlDocument(validCreditNoteXml()),
    ];
    for (const result of results) {
      for (const layer of ['format', 'structure', 'semantic']) {
        for (const issue of result[layer].issues) {
          for (const key of ['line', 'column', 'xmlPath']) {
            expect(issue[key] === null || typeof issue[key] === 'string' || typeof issue[key] === 'number')
              .toBe(true);
          }
        }
      }
    }
  });
});
