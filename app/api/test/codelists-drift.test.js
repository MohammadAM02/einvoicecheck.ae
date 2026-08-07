import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { VAT_CATEGORY_CODES } from '../src/rules/codelists.js';

const GC_PATH = path.resolve(
  import.meta.dirname,
  '../pint-ae-resources/trn-invoice/codelist/Aligned-TaxCategoryCodes.gc'
);

// Mirrors scripts/generate-codelists.mjs — if the .gc changes without
// regenerating, this deep-equal fails and the drift breaks the suite.
function parseGenericode(xml) {
  const map = {};
  const rows = [...xml.matchAll(/<gc:Row>([\s\S]*?)<\/gc:Row>/g)];
  for (const [, row] of rows) {
    const id = row.match(/ColumnRef="id">\s*<gc:SimpleValue>([^<]*)<\/gc:SimpleValue>/);
    if (!id) continue;
    let code = id[1];
    if (code === '\u039D') code = 'N'; // Greek capital Nu -> Latin N (jurisdiction .sch uses Latin N)
    const name = row.match(/ColumnRef="name">\s*<gc:SimpleValue>([^<]*)<\/gc:SimpleValue>/);
    map[code] = name ? name[1] : '';
  }
  return map;
}

describe('VAT category codelist drift guard', () => {
  it('VAT_CATEGORY_CODES matches the vendored Aligned-TaxCategoryCodes.gc', () => {
    // AE (VAT Reverse Charge) carries a notional rate (5 or 0) in official
    // PINT-AE samples; null = rate not enforced by the semantic engine.
    const expectedRates = { S: 5, Z: 0, E: 0, O: 0, AE: null, N: 5 };
    const codes = parseGenericode(readFileSync(GC_PATH, 'utf8'));
    const expected = Object.fromEntries(
      Object.keys(codes).map((code) => [
        code,
        { name: codes[code], expectedRate: expectedRates[code] === null ? null : (expectedRates[code] ?? 0) },
      ])
    );
    expect(VAT_CATEGORY_CODES).toEqual(expected);
  });

  it('carries the EN 16931 rate semantics on the expected codes', () => {
    expect(VAT_CATEGORY_CODES.S.expectedRate).toBe(5);
    expect(VAT_CATEGORY_CODES.Z.expectedRate).toBe(0);
    expect(VAT_CATEGORY_CODES.E.expectedRate).toBe(0);
    expect(VAT_CATEGORY_CODES.O.expectedRate).toBe(0);
    // AE is not rate-enforced (notional rate; seller tax amount must be 0).
    expect(VAT_CATEGORY_CODES.AE.expectedRate).toBe(null);
    expect(VAT_CATEGORY_CODES.N.expectedRate).toBe(5);
  });
});
