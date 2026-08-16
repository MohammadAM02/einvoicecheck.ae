import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateXsd } from '../src/rules/xsd.js';

const EXAMPLES = path.join(import.meta.dirname, '..', 'schematron', 'examples');
const read = (name) => fs.readFileSync(path.join(EXAMPLES, name), 'utf8');
const STANDARD = read('Standard tax invoice.xml');

describe('validateXsd (UBL 2.1 structural gate)', () => {
  it('returns zero issues for a known-good UBL invoice', () => {
    const r = validateXsd(STANDARD);
    expect(r.evalErrors).toEqual([]);
    expect(r.issues.filter((i) => i.rule === 'XSD-01').length).toBe(0);
  });

  it('flags an unknown element', () => {
    // Insert after the invoice-level <cbc:ID> (AE-01TEST is unique to it).
    // Inserting INSIDE <cbc:ID> would trip a simple-type error whose message
    // does not name the offending element — the brief's original mutation.
    const xml = STANDARD.replace(
      '<cbc:ID>AE-01TEST</cbc:ID>',
      '<cbc:ID>AE-01TEST</cbc:ID>\n\t<cbc:TotallyUnknownElement>1</cbc:TotallyUnknownElement>');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01' && i.message.includes('TotallyUnknownElement'))).toBe(true);
  });

  it('flags element order violations', () => {
    // First <cbc:IssueDate> occurrence is the invoice-level one (line 11).
    // InvoiceTypeCode must come after IssueDate in UBL 2.1.
    const xml = STANDARD.replace(
      '<cbc:IssueDate>', '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n\t<cbc:IssueDate>');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01')).toBe(true);
  });

  it('flags a missing mandatory element', () => {
    // Exact-string replace targets the invoice-level <cbc:IssueDate> (first of
    // two identical occurrences in the file). The brief's regex anchored on
    // '\n' cannot match this CRLF example file.
    const xml = STANDARD.replace('<cbc:IssueDate>2025-02-06</cbc:IssueDate>', '');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01')).toBe(true);
  });

  it('surfaces a validator error as XSD-ERR (fail-closed)', () => {
    // Genuinely unparseable XML: libxmljs.parseXml throws, exercising the
    // fail-closed catch path. (A well-formed non-Invoice root is NOT a
    // validator failure — see the root-mismatch test below.)
    const r = validateXsd('<Invoice');
    expect(r.evalErrors.length + r.issues.filter((i) => i.rule === 'XSD-ERR').length).toBeGreaterThan(0);
  });

  it('flags a well-formed non-Invoice root as XSD-01, not XSD-ERR', () => {
    // Validation ran and found no matching global declaration for the root —
    // a structural finding, not a validator failure.
    const r = validateXsd('<not-an-invoice/>');
    expect(r.issues.some((i) => i.rule === 'XSD-01')).toBe(true);
    expect(r.issues.some((i) => i.rule === 'XSD-ERR')).toBe(false);
    expect(r.evalErrors).toEqual([]);
  });

  it('accepts a valid CreditNote against the CreditNote schema', () => {
    const xml = fs.readFileSync(path.join(import.meta.dirname, 'fixtures/validate/valid-credit-note.xml'), 'utf8');
    const result = validateXsd(xml);
    expect(result.documentType).toBe('CreditNote');
    expect(result.evalErrors).toEqual([]);
    expect(result.issues.filter((issue) => issue.rule === 'XSD-01')).toHaveLength(0);
  });

  it('rejects an Invoice with the wrong default namespace', () => {
    const result = validateXsd(STANDARD.replace(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:oasis:names:specification:ubl:schema:xsd:NotInvoice-2',
    ));
    expect(result.issues.some((issue) => issue.rule === 'XSD-01')).toBe(true);
  });

  it('rejects a CreditNote with the wrong default namespace', () => {
    const xml = fs.readFileSync(path.join(import.meta.dirname, 'fixtures/validate/valid-credit-note.xml'), 'utf8');
    const result = validateXsd(xml.replace(
      'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
      'urn:oasis:names:specification:ubl:schema:xsd:NotCreditNote-2',
    ));
    expect(result.issues.some((issue) => issue.rule === 'XSD-01')).toBe(true);
    expect(result.issues.some((issue) => issue.rule === 'XSD-ERR')).toBe(false);
    expect(result.evalErrors).toEqual([]);
  });
});
