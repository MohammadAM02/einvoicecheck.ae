/**
 * UAE / PINT AE code lists.
 *
 * Sources (fetched July 2026):
 *  - AE VAT category codes: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/Aligned-TaxCategoryCodes/
 *  - UAE Electronic Invoicing Guidelines v1.1 (MoF, 01 June 2026)
 *  - UAE Electronic Invoice mandatory fields v1.0 (MoF, 23 Feb 2026)
 *
 * The AE VAT category set is parsed from the official genericode file vendored
 * in docs/pint-ae-resources (source of truth), NOT hand-maintained here.
 */

import fs from 'node:fs';
import path from 'node:path';

// Vendored resource files (source of truth — see docs/pint-ae-resources, v1.03).
// src/rules -> src -> api -> app -> repo root.
const RESOURCES_DIR = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'docs', 'pint-ae-resources', 'trn-invoice', 'codelist');

/** Read a genericode .gc file and return { code -> name } for the first (id) column. */
function readGenericode(pathToFile) {
  const xml = fs.readFileSync(pathToFile, 'utf8');
  const map = {};
  // Each <Row> has one <Value ColumnRef="id"> with a <SimpleValue>; optionally a
  // <Value ColumnRef="name"> carrying the human-readable name.
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

// AE-aligned VAT category codes — parsed from the official genericode.
// The .gc carries the official code set (S, E, O, AE, Z and "additional VAT"
// coded as Greek Nu, normalized to Latin N). Rates are enforced separately by
// EN 16931 BR-S/BR-Z/BR-E (standard = 5, zero/exempt/out-of-scope = 0,
// additional = 5) — see vatCategory.js.
const AW_Tax = readGenericode(path.join(RESOURCES_DIR, 'Aligned-TaxCategoryCodes.gc'));

// Compare against the rate semantics we expect; missing/extra codes surface
// here so vendored-list drift breaks a test instead of silently changing rules.
const expectedRates = { S: 5, Z: 0, E: 0, O: 0, AE: 0, N: 5 };
// Drift detection: if the .gc ever drops an expected code, fail at startup
// instead of silently changing the rule set.
const MISSING = Object.keys(expectedRates).filter((c) => !(c in AW_Tax));
if (MISSING.length > 0) {
  throw new Error(
    `PINT AE codelist drift: Aligned-TaxCategoryCodes.gc missing expected codes: ${MISSING.join(', ')}`
  );
}

export const VAT_CATEGORY_CODES = Object.fromEntries(
  Object.keys(AW_Tax).map((code) => [code, { name: AW_Tax[code], expectedRate: expectedRates[code] ?? 0 }])
);

// UAE standard VAT rate (Federal Decree-Law No. 8 of 2017).
export const UAE_STANDARD_VAT_RATE = 5;

// Domestic settlement currency.
export const DOMESTIC_CURRENCY = 'AED';

// ISO 4217 alpha-3 shape (membership check is shape-based; full ISO table is
// out of scope for preflight — AED is the one that matters for UAE domestic).
export const ISO4217_RE = /^[A-Z]{3}$/;

// UNCL1001 invoice type codes recognised by PINT AE (BT-3). The pack's
// UNCL1001-inv.gc is a minimal baseline (380, 480); the engine's list is the
// UAE-aligned subset the interpreter's ibr-cl-01 enforces over the full
// UNCL1001 set at runtime.
export const INVOICE_TYPE_CODES = {
  380: 'Commercial invoice',
  381: 'Credit note',
  383: 'Debit note',
  386: 'Prepayment invoice',
  388: 'Tax invoice',
  389: 'Self-billed invoice',
};

// Credit-note document type codes (UBL CreditNote root / typeCode).
export const CREDIT_NOTE_TYPE_CODES = new Set(['381']);

export function isKnownVatCategory(code) {
  return Object.prototype.hasOwnProperty.call(VAT_CATEGORY_CODES, code);
}

export function isKnownInvoiceType(code) {
  return Object.prototype.hasOwnProperty.call(INVOICE_TYPE_CODES, String(code));
}
