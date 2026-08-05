import { err } from './error.js';

/**
 * XSD-lite structural layer — PINT AE structural rules that operate on the
 * canonical model, registered with the Schematron layer ahead of the semantic
 * rules. This is the "B" path: hand-written structural checks instead of the
 * official UBL 2.1 XSD + Schematron runner.
 *
 * Covered here (PINT AE refs — term IDs are IBT-*, rule IDs are IBR-*):
 *   IBR-001    ibt-024 (CustomizationID / Specification identifier) present,
 *              and its value shall be the PINT AE specification URN
 *   BR-CO-18   each invoice line (ibg-25) shall have a unique id (ibt-126)
 *   BT-1       invoice number shall be max 16 characters
 *
 * ponytail: raw-XML concerns the parser collapses (duplicate elements,
 * element order) are NOT detectable at the rule layer — that is a parse-time
 * ceiling; upgrade by running the official XSD at parse time if a customer
 * requires byte-for-byte conformance.
 */
export const structureRule = {
  id: 'ENG-XSD-01',
  spec: 'IBR-001 (IBT-024 CustomizationID URN), BR-CO-18 (IBT-126), BT-1 (PINT AE structural / XSD-lite)',
  description: 'Structural conformance: CustomizationID URN, line-id uniqueness, invoice number length.',
  evaluate(inv) {
    const out = [];

    // IBR-001 (ibt-024) — Specification identifier present and equal to the PINT AE URN
    const sv = inv.schemaVersion;
    if (sv && !/^urn:peppol:pint:billing-\d+@ae-\d+$/.test(String(sv))) {
      out.push(err('/schemaVersion', 'ENG-XSD-01/IBT-024',
        `CustomizationID (BT-24) "${sv}" is not a PINT AE specification URN.`,
        'Set schemaVersion to urn:peppol:pint:billing-1@ae-1.'));
    }

    // BR-CO-18 — each invoice line shall have a unique id (ibt-126)
    const seen = new Set();
    for (const ln of inv.lines || []) {
      const id = ln.id;
      if (id === undefined || id === '') continue;
      if (seen.has(id)) {
        out.push(err('/lines', 'ENG-XSD-01/BR-CO-18 (BT-126)',
          `Invoice line id "${id}" is not unique.`,
          'Give each line a unique id.'));
        break;
      }
      seen.add(id);
    }

    // BT-1 — invoice number max 16 characters
    const num = inv.invoiceNumber;
    if (num !== undefined && num !== '' && String(num).length > 16) {
      out.push(err('/invoiceNumber', 'ENG-XSD-01/BT-1',
        `Invoice number (BT-1) is ${String(num).length} characters; the maximum is 16.`,
        'Shorten the invoice number to 16 characters or fewer.'));
    }

    return out;
  },
};
