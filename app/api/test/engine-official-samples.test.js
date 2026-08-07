import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { convert } from '../src/rules/convert/index.js';

const sample = (name) =>
  readFileSync(new URL(`../pint-ae-resources/trn-invoice/example/${name}`, import.meta.url), 'utf8');

describe('official PINT-AE samples (engine false-positive regression)', () => {
  it('Standard tax invoice.xml repairs cleanly (line-level allowance+charge parsed)', async () => {
    const res = await convert(sample('Standard tax invoice.xml'), { mode: 'full' });
    expect(res.status).not.toBe('REFUSED');
    expect(res.blocked).toEqual([]);
  });

  it('Summary tax invoice.xml repairs cleanly (AE reverse-charge handled)', async () => {
    const res = await convert(sample('Summary tax invoice.xml'), { mode: 'full' });
    expect(res.status).not.toBe('REFUSED');
    expect(res.blocked).toEqual([]);
  });

  it('self-billed invoice (389) returns an explicit unsupported warning, not a silent pass', async () => {
    const xml = sample('Standard tax invoice.xml').replace('<cbc:InvoiceTypeCode>380', '<cbc:InvoiceTypeCode>389');
    const res = await convert(xml, { mode: 'full' });
    const warned = (res.blocked || []).some((b) => b.rule === 'ENG-TYPE-01/SELF-BILLING')
      || (res.dataIssues || []).some((d) => d.rule === 'ENG-TYPE-01/SELF-BILLING');
    expect(warned).toBe(true);
  });
});
