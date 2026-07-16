/**
 * UAE / PINT AE code lists.
 *
 * Sources (fetched July 2026):
 *  - AE VAT category codes: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/Aligned-TaxCategoryCodes/
 *  - UAE Electronic Invoicing Guidelines v1.1 (MoF, 01 June 2026)
 *  - UAE Electronic Invoice mandatory fields v1.0 (MoF, 23 Feb 2026)
 *
 * TODO(pint-ae-xsd): replace these hand-maintained lists with the genericode
 * code lists shipped inside the official PINT AE package once the machine
 * -readable .gc / XSD files are wired in.
 */

// AE-aligned VAT category codes (subset of UNCL5305 used by PINT AE).
export const VAT_CATEGORY_CODES = {
  S: { name: 'Standard rate', expectedRate: 5 },
  Z: { name: 'Zero rated', expectedRate: 0 },
  E: { name: 'Exempt from tax', expectedRate: 0 },
  O: { name: 'Services outside scope of tax', expectedRate: 0 },
  AE: { name: 'VAT reverse charge', expectedRate: 0 },
  N: { name: 'Standard rate additional VAT', expectedRate: 5 },
};

// UAE standard VAT rate (Federal Decree-Law No. 8 of 2017).
export const UAE_STANDARD_VAT_RATE = 5;

// Domestic settlement currency.
export const DOMESTIC_CURRENCY = 'AED';

// ISO 4217 alpha-3 shape (membership check is shape-based; full ISO table is
// out of scope for preflight — AED is the one that matters for UAE domestic).
export const ISO4217_RE = /^[A-Z]{3}$/;

// UNCL1001 invoice type codes recognised by PINT AE (BT-3).
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
