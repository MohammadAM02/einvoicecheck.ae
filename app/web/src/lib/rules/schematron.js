import { err } from './error.js';
import { isNumber } from './money.js';

/**
 * Schematron layer — PINT AE business rules implemented as deterministic
 * checks, registered ahead of the semantic rules (registry.js). Rule IDs carry
 * the official PINT AE references (https://docs.peppol.eu/poac/ae/v1.0.1/
 * pint-ae/trn-invoice/businessrule/):
 *
 *   IBR-073    ibt-002 (Issue date) shall be in the format YYYY-MM-DD
 *   IBR-CO-11  ibt-113 (Prepaid amount) shall not exceed ibt-115 (Payable amount)
 *
 * ponytail: these are JS implementations of the two PINT rules the semantic
 * engine does not cover. When the official PINT AE XSD + Schematron ruleset is
 * vendored with a runner (xml.js TODO(pint-ae-xsd)), this module becomes the
 * adapter that maps runner output into the same {path, rule, message, fix}
 * error shape — the rule IDs must not change.
 */
export const schematronRule = {
  id: 'ENG-SCH-01',
  spec: 'IBR-073, IBR-CO-11 (PINT AE Schematron)',
  description: 'PINT AE Schematron-layer checks: issue date format and prepaid-vs-payable.',
  evaluate(inv) {
    const out = [];

    // IBR-073 — issue date format YYYY-MM-DD (ibt-002)
    const d = inv.issueDate;
    if (d !== undefined && d !== '') {
      const iso = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
      const real = iso && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
      if (!real) {
        out.push(err('/issueDate', 'ENG-SCH-01/IBR-073',
          `Issue date (BT-2) "${d}" is not a valid YYYY-MM-DD date.`,
          'Set issueDate to YYYY-MM-DD, for example 2026-08-01.'));
      }
    }

    // IBR-CO-11 — prepaid amount shall not exceed payable amount (ibt-113 <= ibt-115)
    const prepaid = inv.prepaidAmount;
    const payable = inv.totals && inv.totals.payableAmount;
    if (isNumber(prepaid) && isNumber(payable) && Number(prepaid) > Number(payable)) {
      out.push(err('/prepaidAmount', 'ENG-SCH-01/IBR-CO-11',
        `Prepaid amount (BT-113) ${prepaid} exceeds payable amount (BT-115) ${payable}.`,
        `Set prepaidAmount to at most ${payable}.`));
    }

    return out;
  },
};
