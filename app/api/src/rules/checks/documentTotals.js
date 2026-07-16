import { err } from '../error.js';
import { moneyEq, round2, isNumber, fmt } from '../money.js';

/**
 * Document-level total arithmetic. Rule IDs below are the PINT AE / EN 16931
 * calculation rules confirmed from the PINT AE business-rule set
 * (https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/businessrule/):
 *
 *   IBR-CO-10  sum of line net (ibt-106) = Σ line net (ibt-131)
 *   IBR-CO-13  total w/o tax (ibt-109)  = ibt-106 - allowances (ibt-107) + charges (ibt-108)
 *   IBR-CO-14  total tax (ibt-110)      = Σ tax category tax amount (ibt-117)
 *   IBR-CO-15  total w/ tax (ibt-112)   = ibt-109 + ibt-110
 *   IBR-CO-16  amount due (ibt-115)     = ibt-112 - prepaid (ibt-113) + rounding (ibt-114)
 */
export const documentTotalsRule = {
  id: 'ENG-TOT-01',
  spec: 'IBR-CO-10/13/14/15/16 (PINT AE)',
  description: 'Document totals reconcile: line sum, tax-exclusive, tax, tax-inclusive and payable amounts.',
  evaluate(inv) {
    const out = [];
    const t = inv.totals || {};
    const lines = inv.lines || [];
    const subtotals = inv.taxSubtotals || [];

    // IBR-CO-10
    if (isNumber(t.lineExtensionAmount) && lines.every((l) => isNumber(l.lineExtensionAmount))) {
      const sum = round2(lines.reduce((s, l) => s + Number(l.lineExtensionAmount), 0));
      if (!moneyEq(sum, t.lineExtensionAmount)) {
        out.push(err('/totals/lineExtensionAmount', 'ENG-TOT-10/IBR-CO-10',
          `Sum of line net amounts (BT-106) ${fmt(t.lineExtensionAmount)} does not equal Σ line nets (${fmt(sum)}).`,
          `Set totals.lineExtensionAmount to ${fmt(sum)}.`));
      }
    }

    // IBR-CO-13
    if (isNumber(t.lineExtensionAmount) && isNumber(t.taxExclusiveAmount)) {
      const expected = round2(
        Number(t.lineExtensionAmount) - Number(inv.allowanceTotal || 0) + Number(inv.chargeTotal || 0)
      );
      if (!moneyEq(expected, t.taxExclusiveAmount)) {
        out.push(err('/totals/taxExclusiveAmount', 'ENG-TOT-13/IBR-CO-13',
          `Tax-exclusive amount (BT-109) ${fmt(t.taxExclusiveAmount)} does not equal line sum - allowances + charges (${fmt(expected)}).`,
          `Set totals.taxExclusiveAmount to ${fmt(expected)}.`));
      }
    }

    // IBR-CO-14
    if (isNumber(t.taxAmount) && subtotals.length && subtotals.every((s) => isNumber(s.taxAmount))) {
      const sum = round2(subtotals.reduce((s, st) => s + Number(st.taxAmount), 0));
      if (!moneyEq(sum, t.taxAmount)) {
        out.push(err('/totals/taxAmount', 'ENG-TOT-14/IBR-CO-14',
          `Invoice total tax (BT-110) ${fmt(t.taxAmount)} does not equal Σ tax subtotal amounts (${fmt(sum)}).`,
          `Set totals.taxAmount to ${fmt(sum)}.`));
      }
    }

    // IBR-CO-15
    if (isNumber(t.taxExclusiveAmount) && isNumber(t.taxAmount) && isNumber(t.taxInclusiveAmount)) {
      const expected = round2(Number(t.taxExclusiveAmount) + Number(t.taxAmount));
      if (!moneyEq(expected, t.taxInclusiveAmount)) {
        out.push(err('/totals/taxInclusiveAmount', 'ENG-TOT-15/IBR-CO-15',
          `Tax-inclusive amount (BT-112) ${fmt(t.taxInclusiveAmount)} does not equal tax-exclusive + tax (${fmt(expected)}).`,
          `Set totals.taxInclusiveAmount to ${fmt(expected)}.`));
      }
    }

    // IBR-CO-16
    if (isNumber(t.taxInclusiveAmount) && isNumber(t.payableAmount)) {
      const expected = round2(
        Number(t.taxInclusiveAmount) - Number(inv.prepaidAmount || 0) + Number(inv.roundingAmount || 0)
      );
      if (!moneyEq(expected, t.payableAmount)) {
        out.push(err('/totals/payableAmount', 'ENG-TOT-16/IBR-CO-16',
          `Amount due (BT-115) ${fmt(t.payableAmount)} does not equal tax-inclusive - prepaid + rounding (${fmt(expected)}).`,
          `Set totals.payableAmount to ${fmt(expected)}.`));
      }
    }

    return out;
  },
};
