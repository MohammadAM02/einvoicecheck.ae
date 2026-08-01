import { RULES } from './registry.js';
import { normalizeInput } from './normalize.js';
import { isNumber } from './money.js';
import { err } from './error.js';

export const SCHEMA_VERSION_DEFAULT = 'urn:peppol:pint:billing-1@ae-1';

/**
 * Numeric guard. Reconciliation rules (ENG-TOT-*, ENG-TAX-08/09) skip their
 * arithmetic checks when an amount is non-numeric, so an unguarded field would
 * let a malformed amount pass validation silently. Document totals, line
 * amounts and category rates are already covered by ENG-REQ-07..11,
 * ENG-LINE-02..04 and ENG-VAT-03; tax-subtotal amounts are not — guard them
 * here (PRODUCTION_STATUS.md Fault #1).
 */
function numericGuard(invoice) {
  const out = [];
  (invoice.taxSubtotals || []).forEach((st, i) => {
    if (!isNumber(st.taxableAmount)) {
      out.push(err(`/taxSubtotals/${i}/taxableAmount`, 'ENG-NUM-01',
        'Taxable amount (BT-116) is missing or not numeric.',
        'Provide a numeric taxable amount.'));
    }
    if (!isNumber(st.taxAmount)) {
      out.push(err(`/taxSubtotals/${i}/taxAmount`, 'ENG-NUM-01',
        'Tax amount (BT-117) is missing or not numeric.',
        'Provide a numeric tax amount.'));
    }
  });
  return out;
}

/**
 * Run the full preflight validation. Deterministic: same input -> same output.
 *
 * @returns {{ valid, invoiceType, schemaVersion, errors }}
 */
export function validateInvoice(body, contentType = '') {
  const { invoice, parseError } = normalizeInput(body, contentType);

  if (parseError) {
    return {
      valid: false,
      invoiceType: null,
      schemaVersion: SCHEMA_VERSION_DEFAULT,
      errors: [
        {
          path: '/',
          rule: 'ENG-PARSE-01',
          severity: 'error',
          message: `Could not parse the invoice: ${parseError}`,
          fix: 'Send a canonical JSON invoice or a valid UBL 2.1 / PINT AE XML document.',
        },
      ],
    };
  }

  const errors = numericGuard(invoice);
  for (const rule of RULES) {
    try {
      const produced = rule.evaluate(invoice) || [];
      for (const e of produced) errors.push(e);
    } catch (e) {
      // A rule crash must never take down the request or leak internals to the
      // client. Log the full detail server-side; surface a fixed, safe message.
      console.error(`[validateInvoice] rule ${rule.id} crashed`, e);
      errors.push({
        path: '/',
        rule: `${rule.id}/INTERNAL`,
        severity: 'error',
        message: `Rule ${rule.id} could not evaluate this invoice.`,
        fix: 'Re-submit the invoice. If the error persists, contact support.',
      });
    }
  }

  const valid = !errors.some((e) => e.severity === 'error');

  return {
    valid,
    invoiceType: invoice.invoiceType ?? null,
    schemaVersion: invoice.schemaVersion || SCHEMA_VERSION_DEFAULT,
    errors,
  };
}
