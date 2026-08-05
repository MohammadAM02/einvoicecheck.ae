#!/usr/bin/env node
/**
 * Regenerates the VAT_CATEGORY_CODES block in app/api/src/rules/codelists.js
 * and app/web/src/lib/rules/codelists.js from the vendored PINT AE
 * Aligned-TaxCategoryCodes.gc genericode file (source of truth).
 *
 * Run from anywhere: node scripts/generate-codelists.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const GC_PATH = path.resolve(
  import.meta.dirname,
  '../../../docs/pint-ae-resources/trn-invoice/codelist/Aligned-TaxCategoryCodes.gc'
);
const TARGETS = [
  path.resolve(import.meta.dirname, '../src/rules/codelists.js'),
  path.resolve(import.meta.dirname, '../../web/src/lib/rules/codelists.js'),
];

// EN 16931 rate semantics overlaid on the genericode (the .gc carries only
// code+name; rates are enforced separately by BR-S/BR-Z/BR-E — see vatCategory.js).
const expectedRates = { S: 5, Z: 0, E: 0, O: 0, AE: 0, N: 5 };

/** Parse a genericode .gc file into { code -> name } for the (id) column. */
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

const codes = parseGenericode(readFileSync(GC_PATH, 'utf8'));

// Drift guard: if the .gc ever drops an expected code, fail the generation
// instead of silently changing the rule set.
const MISSING = Object.keys(expectedRates).filter((c) => !(c in codes));
if (MISSING.length > 0) {
  throw new Error(
    `PINT AE codelist drift: Aligned-TaxCategoryCodes.gc missing expected codes: ${MISSING.join(', ')}`
  );
}

const entries = Object.keys(codes)
  .map(
    (code) =>
      `  ${JSON.stringify(code)}: { name: ${JSON.stringify(codes[code])}, expectedRate: ${expectedRates[code] ?? 0} },`
  )
  .join('\n');

const block = `// BEGIN GENERATED — do not edit by hand (run: node scripts/generate-codelists.mjs)
export const VAT_CATEGORY_CODES = {
${entries}
};
// END GENERATED`;

const BLOCK_RE = /\/\/ BEGIN GENERATED[\s\S]*?\/\/ END GENERATED/;

for (const target of TARGETS) {
  const src = readFileSync(target, 'utf8');
  if (!BLOCK_RE.test(src)) {
    throw new Error(`generate-codelists: markers not found in ${target} — refusing to touch it`);
  }
  writeFileSync(target, src.replace(BLOCK_RE, block));
  console.log(`rewrote ${path.relative(process.cwd(), target)}`);
}
