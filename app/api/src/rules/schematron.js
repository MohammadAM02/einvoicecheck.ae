import { err } from './error.js';
import { isNumber } from './money.js';

/**
 * Schematron layer — PINT AE business rules implemented as deterministic
 * checks, registered ahead of the semantic rules (registry.js). Rule IDs carry
 * the official PINT AE references (https://docs.peppol.eu/poac/ae/v1.0.1/
 * pint-ae/trn-invoice/businessrule/):
 *
 *   IBR-073    ibt-002 (Issue date) shall be in the format YYYY-MM-DD
 *   EN 16931 BR-CO-11  ibt-113 (Prepaid amount) shall not exceed ibt-115
 *
 * Note on the prepaid check: the vendored PINT AE .sch does not carry a
 * prepaid-vs-payable assert — its ibr-co-11 is the allowance-sum rule (BR-CO-11
 * per docs.peppol.eu). The check below is the EN 16931 BR-CO-11 equivalent, so
 * it keeps the engine-specific ID ENG-SCH-01/IBT-113-LE-IBT-115 rather than
 * colliding with the interpreter's real ibr-co-11.
 *
 * ponytail: these are JS implementations of the two PINT rules the semantic
 * engine does not cover. The full interpreter over the raw XML (all 301
 * asserts, jsdom/fontoxpath) lives in schematron-interpreter.js — API-only,
 * wired by the route layer; this module is vendored to the web app
 * byte-identical and must not import server-only modules. Rule IDs must not
 * change.
 */
export const schematronRule = {
  id: 'ENG-SCH-01',
  spec: 'IBR-073, EN 16931 BR-CO-11 prepaid <= payable (ibt-113 <= ibt-115)',
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

    // Prepaid amount shall not exceed payable amount (ibt-113 <= ibt-115).
    // No PINT AE assert covers this — see the module comment.
    const prepaid = inv.prepaidAmount;
    const payable = inv.totals && inv.totals.payableAmount;
    if (isNumber(prepaid) && isNumber(payable) && Number(prepaid) > Number(payable)) {
      out.push(err('/prepaidAmount', 'ENG-SCH-01/IBT-113-LE-IBT-115',
        `Prepaid amount (BT-113) ${prepaid} exceeds payable amount (BT-115) ${payable}.`,
        `Set prepaidAmount to at most ${payable}.`));
    }

    return out;
  },
};
