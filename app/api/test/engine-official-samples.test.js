import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateXmlDocument } from '../src/rules/xml-validation.js';

const sample = (name) =>
  readFileSync(new URL(`../pint-ae-resources/trn-invoice/example/${name}`, import.meta.url), 'utf8');

describe('official PINT-AE samples (engine false-positive regression)', () => {
  it('Standard tax invoice.xml runs the full pipeline (line-level allowance+charge parsed)', () => {
    const res = validateXmlDocument(sample('Standard tax invoice.xml'));
    // Line-level allowance/charge must not fabricate engine errors — the
    // document parses into the canonical model without ENG-* line failures.
    expect(res.format.status).toBe('passed');
    expect(res.semantic.status).not.toBe('skipped');
    const engineErrors = res.semantic.issues.filter(
      (i) => i.severity === 'error' && i.rule.startsWith('ENG-')
    );
    expect(engineErrors).toEqual([]);
  });

  it('Summary tax invoice.xml runs the full pipeline (AE reverse-charge handled)', () => {
    const res = validateXmlDocument(sample('Summary tax invoice.xml'));
    expect(res.format.status).toBe('passed');
    expect(res.semantic.status).not.toBe('skipped');
    const engineErrors = res.semantic.issues.filter(
      (i) => i.severity === 'error' && i.rule.startsWith('ENG-')
    );
    expect(engineErrors).toEqual([]);
  });

  it('self-billed invoice (389) returns an explicit unsupported warning, not a silent pass', () => {
    const xml = sample('Standard tax invoice.xml').replace(
      '<cbc:InvoiceTypeCode>380',
      '<cbc:InvoiceTypeCode>389'
    );
    const res = validateXmlDocument(xml);
    const warned = res.semantic.issues.some((i) => i.rule === 'ENG-TYPE-01/SELF-BILLING');
    expect(warned).toBe(true);
  });
});
