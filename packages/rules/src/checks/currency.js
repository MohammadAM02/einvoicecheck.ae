import { err, warn } from '../error.js';
import { DOMESTIC_CURRENCY, ISO4217_RE } from '../codelists.js';

/**
 * Currency presence, ISO 4217 shape, and the UAE requirement that VAT be
 * accounted in AED.
 *
 * Cites: PINT AE IBR-005 / IBR-CL-04 (DocumentCurrencyCode must be a valid
 * ISO 4217 alpha-3 code); UAE Guidelines v1.1 — VAT amounts must be reported
 * in AED, and a tax accounting currency (AED) is required when the invoice
 * currency is not AED (PINT IBR-053 / IBR-077).
 */
export const currencyRule = {
  id: 'ENG-CUR-01',
  spec: 'IBR-005 / IBR-CL-04 / IBR-053 / IBR-077 (PINT AE); AED accounting',
  description: 'Document currency present + ISO 4217; AED tax currency when invoice currency is not AED.',
  evaluate(inv) {
    const out = [];
    const cur = inv.currency;
    if (!cur) {
      out.push(
        err('/currency', 'ENG-CUR-01/IBR-005',
          'Document currency code (BT-5) is missing.',
          'Provide a currency, e.g. "AED".')
      );
      return out;
    }
    if (!ISO4217_RE.test(String(cur))) {
      out.push(
        err('/currency', 'ENG-CUR-02/IBR-CL-04',
          `Currency "${cur}" is not a valid ISO 4217 alpha-3 code.`,
          'Use a 3-letter uppercase code such as "AED".')
      );
    }
    if (cur !== DOMESTIC_CURRENCY) {
      // Foreign-currency invoice: VAT must still be accounted in AED.
      if (inv.taxCurrency !== DOMESTIC_CURRENCY) {
        out.push(
          err('/taxCurrency', 'ENG-CUR-03/IBR-053',
            `Invoice currency is "${cur}" but the tax accounting currency is not AED.`,
            'Set taxCurrency to "AED" and report VAT amounts in AED (BT-6).')
        );
      } else {
        out.push(
          warn('/currency', 'ENG-CUR-04',
            `Invoice currency is "${cur}" (non-AED). Ensure the AED VAT accounting amount and exchange rate are supplied.`,
            'Confirm taxCurrency "AED" and the applicable FTA exchange rate.')
        );
      }
    }
    return out;
  },
};
