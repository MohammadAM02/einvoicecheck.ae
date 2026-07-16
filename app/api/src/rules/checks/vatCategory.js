import { err } from '../error.js';
import { VAT_CATEGORY_CODES, isKnownVatCategory } from '../codelists.js';

/**
 * VAT category code membership + rate consistency, on every invoice line and
 * every tax subtotal.
 *
 * Cites: AE VAT category code list (S, Z, E, O, AE, N) —
 *   https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/Aligned-TaxCategoryCodes/ ;
 * EN 16931 VAT-category rules "BR-S", "BR-Z", "BR-E" as inherited by PINT AE
 * (standard rated => rate 5, zero rated => 0, exempt/out-of-scope => 0).
 */
function checkCategory(out, path, code, rate) {
  if (code === undefined || code === null || code === '') {
    out.push(err(path + '/code', 'ENG-VAT-01/BT-151',
      'VAT category code is missing.',
      `Provide one of: ${Object.keys(VAT_CATEGORY_CODES).join(', ')}.`));
    return;
  }
  if (!isKnownVatCategory(code)) {
    out.push(err(path + '/code', 'ENG-VAT-02/BT-151',
      `VAT category code "${code}" is not an AE-aligned category.`,
      `Use one of: ${Object.keys(VAT_CATEGORY_CODES).join(', ')}.`));
    return;
  }
  const expected = VAT_CATEGORY_CODES[code].expectedRate;
  if (rate === undefined || rate === null) {
    // Rate is required for rated categories (S/N); 0 is implied for Z/E/O/AE.
    if (expected !== 0) {
      out.push(err(path + '/rate', 'ENG-VAT-03/BT-152',
        `VAT rate is missing for category "${code}" (${VAT_CATEGORY_CODES[code].name}).`,
        `Set the rate to ${expected}.`));
    }
    return;
  }
  if (Number(rate) !== expected) {
    out.push(err(path + '/rate', 'ENG-VAT-04/BR-S/BR-Z/BR-E',
      `VAT category "${code}" (${VAT_CATEGORY_CODES[code].name}) must carry rate ${expected}, found ${rate}.`,
      `Correct the rate to ${expected} or change the category code.`));
  }
}

export const vatCategoryRule = {
  id: 'ENG-VAT-01',
  spec: 'AE VAT category code list; EN 16931 BR-S/BR-Z/BR-E (PINT AE)',
  description: 'Every line and tax subtotal uses an AE VAT category with a consistent rate.',
  evaluate(inv) {
    const out = [];
    (inv.lines || []).forEach((ln, i) => {
      checkCategory(out, `/lines/${i}/taxCategory`, ln.taxCategory?.code, ln.taxCategory?.rate);
    });
    (inv.taxSubtotals || []).forEach((st, i) => {
      checkCategory(out, `/taxSubtotals/${i}/category`, st.category?.code, st.category?.rate);
    });
    return out;
  },
};
