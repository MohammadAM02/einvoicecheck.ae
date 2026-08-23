/**
 * Schematron layer — browser-safe adapter, vendored byte-identical to the
 * web tool (app/web/src/lib/rules/). The full PINT AE interpreter
 * (validateSchematron) is node-only and lives OUTSIDE this tree at
 * ../schematron-interpreter.js; it is wired by the route layer.
 *
 * PINT AE business rules implemented as deterministic checks, registered
 * ahead of the semantic rules (registry.js). Rule IDs carry the official
 * PINT AE Billing v1.0.4 references (see the vendored ruleset manifest
 *
 *   IBR-073    ibt-002 (Issue date) shall be in the format YYYY-MM-DD
 *   IBR-CO-11  ibt-113 (Prepaid amount) shall not exceed ibt-115 (Payable amount)
 */
import { err } from './error.js';
import { isNumber } from './money.js';

/**
 * Engine rule adapter — registered in registry.js ahead of the semantic rules.
 * Keeps the two deterministic PINT checks the engine covers (IBR-073 date
 * format, IBR-CO-11 prepaid <= payable) so the canonical JSON path and rule
 * IDs stay stable. The full interpreter (validateSchematron) runs over raw
 * XML and is wired by the route layer; rule IDs must not change.
 *
 * This adapter ALWAYS checks the date, on every path. The API route dedupes
 * against the interpreter's own ibr-073 assert when XML runs both (see
 * routes/validate.js) so the API still reports one defect once. The free web
 * tool has no interpreter, so its XML coverage relies on this check directly.
 * IBR-CO-11 has no .sch equivalent (the .sch only has the stronger ibr-co-16
 * equality), so it runs on both paths.
 */
export const schematronRule = {
  id: 'ENG-SCH-01',
  spec: 'IBR-073, IBR-CO-11 (PINT AE Schematron)',
  description: 'PINT AE Schematron-layer checks: issue date format and prepaid-vs-payable.',
  evaluate(inv) {
    const out = [];

    // IBR-073 — issue date format YYYY-MM-DD (ibt-002). Always checked: the
    // API route dedupes against the interpreter's ibr-073 assert for XML
    // (see routes/validate.js); the web tool has no interpreter, so this is
    // its only date coverage.
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
