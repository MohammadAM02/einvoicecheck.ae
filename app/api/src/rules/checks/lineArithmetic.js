import { err } from '../error.js';
import { moneyEq, round2, isNumber, fmt } from '../money.js';

/**
 * Per-line net amount arithmetic:
 *   line net (BT-131) = quantity (BT-129) x unit price (BT-146)
 *                       - line allowance + line charge
 *
 * Cites: PINT AE BT-131 line net amount; EN 16931 BR-24/BR-CO-4 line
 * calculation as inherited by PINT AE.
 */
export const lineArithmeticRule = {
  id: 'ENG-LINE-01',
  spec: 'BT-131 line net = qty x price (EN 16931 BR-CO-4, PINT AE)',
  description: 'Each invoice line net amount equals quantity x unit price (± line allowance/charge).',
  evaluate(inv) {
    const out = [];
    (inv.lines || []).forEach((ln, i) => {
      const base = `/lines/${i}`;
      if (!isNumber(ln.quantity) || !isNumber(ln.unitPrice)) {
        if (!isNumber(ln.quantity)) {
          out.push(err(`${base}/quantity`, 'ENG-LINE-02/BT-129',
            'Line quantity (BT-129) is missing or not numeric.', 'Provide a numeric quantity.'));
        }
        if (!isNumber(ln.unitPrice)) {
          out.push(err(`${base}/unitPrice`, 'ENG-LINE-03/BT-146',
            'Line unit price (BT-146) is missing or not numeric.', 'Provide a numeric unit price.'));
        }
        return;
      }
      if (!isNumber(ln.lineExtensionAmount)) {
        out.push(err(`${base}/lineExtensionAmount`, 'ENG-LINE-04/BT-131',
          'Line net amount (BT-131) is missing.', 'Provide lineExtensionAmount.'));
        return;
      }
      const expected = round2(
        Number(ln.quantity) * Number(ln.unitPrice) - Number(ln.allowance || 0) + Number(ln.charge || 0)
      );
      if (!moneyEq(expected, ln.lineExtensionAmount)) {
        out.push(err(`${base}/lineExtensionAmount`, 'ENG-LINE-05/BT-131',
          `Line net amount ${fmt(ln.lineExtensionAmount)} does not equal quantity x unit price (${fmt(expected)}).`,
          `Set lineExtensionAmount to ${fmt(expected)} (= ${fmt(ln.quantity)} x ${fmt(ln.unitPrice)}).`));
      }
    });
    return out;
  },
};
