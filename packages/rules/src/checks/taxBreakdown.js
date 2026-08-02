import { err, warn } from '../error.js';
import { moneyEq, round2, isNumber, fmt } from '../money.js';

/**
 * VAT breakdown consistency (per category):
 *   - category tax amount (BT-117) = category taxable amount (BT-116) x rate/100
 *     (EN 16931 BR-S-09 / BR-Z-* etc., inherited by PINT AE)
 *   - category taxable amount (BT-116) reconciles to the sum of line net
 *     amounts carrying that category (EN 16931 BR-S-08). When document-level
 *     allowances/charges are present the clean line-sum reconciliation is
 *     ambiguous, so it is downgraded to a warning.
 */
export const taxBreakdownRule = {
  id: 'ENG-TAX-01',
  spec: 'EN 16931 BR-S-08 / BR-S-09 (PINT AE VAT breakdown)',
  description: 'Each VAT subtotal: tax = taxable x rate, and taxable reconciles to line nets of that category.',
  evaluate(inv) {
    const out = [];
    const subtotals = inv.taxSubtotals || [];
    const lines = inv.lines || [];
    const hasDocAdjust = Number(inv.allowanceTotal || 0) !== 0 || Number(inv.chargeTotal || 0) !== 0;

    // Net per category code from the lines.
    const netByCat = new Map();
    for (const l of lines) {
      const code = l.taxCategory?.code;
      if (code === undefined || !isNumber(l.lineExtensionAmount)) continue;
      netByCat.set(code, round2((netByCat.get(code) || 0) + Number(l.lineExtensionAmount)));
    }

    subtotals.forEach((st, i) => {
      const base = `/taxSubtotals/${i}`;
      const rate = st.category?.rate;
      const code = st.category?.code;

      // BR-S-09: tax = taxable x rate/100
      if (isNumber(st.taxableAmount) && isNumber(rate) && isNumber(st.taxAmount)) {
        const expectedTax = round2((Number(st.taxableAmount) * Number(rate)) / 100);
        if (!moneyEq(expectedTax, st.taxAmount)) {
          out.push(err(`${base}/taxAmount`, 'ENG-TAX-09/BR-S-09',
            `VAT subtotal tax ${fmt(st.taxAmount)} for category "${code}" does not equal taxable x rate (${fmt(expectedTax)}).`,
            `Set taxAmount to ${fmt(expectedTax)} (= ${fmt(st.taxableAmount)} x ${rate}%).`));
        }
      }

      // BR-S-08: taxable reconciles to line nets of the same category.
      if (isNumber(st.taxableAmount) && netByCat.has(code)) {
        const lineNet = netByCat.get(code);
        if (!moneyEq(lineNet, st.taxableAmount)) {
          const mk = hasDocAdjust ? warn : err;
          out.push(mk(`${base}/taxableAmount`, 'ENG-TAX-08/BR-S-08',
            `VAT taxable amount ${fmt(st.taxableAmount)} for category "${code}" does not equal the sum of its line nets (${fmt(lineNet)}).`,
            hasDocAdjust
              ? `Reconcile taxable amount with line nets ${fmt(lineNet)} plus any document-level allowance/charge allocated to category "${code}".`
              : `Set taxableAmount to ${fmt(lineNet)}.`));
        }
      }
    });

    return out;
  },
};
