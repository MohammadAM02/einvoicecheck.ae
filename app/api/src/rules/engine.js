import { RULES } from './registry.js';
import { normalizeInput } from './normalize.js';

export const SCHEMA_VERSION_DEFAULT = 'urn:peppol:pint:billing-1@ae-1';

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
          message: `Could not parse invoice: ${parseError}`,
          fix: 'Send a canonical JSON invoice, or a valid UBL 2.1 / PINT AE XML document.',
        },
      ],
    };
  }

  const errors = [];
  for (const rule of RULES) {
    try {
      const produced = rule.evaluate(invoice) || [];
      for (const e of produced) errors.push(e);
    } catch (e) {
      // A rule crash must never take down the request; surface it deterministically.
      errors.push({
        path: '/',
        rule: `${rule.id}/INTERNAL`,
        severity: 'error',
        message: `Rule ${rule.id} failed to evaluate: ${e.message}`,
        fix: 'Check the field(s) referenced by this rule for malformed values.',
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
