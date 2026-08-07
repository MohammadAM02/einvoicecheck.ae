/**
 * Deterministic totals computation for the XML invoice generator.
 *
 * Uses round2 from ../money.js — identical semantics to the validation engine,
 * so generated documents cannot fail ENG-LINE-05 / ENG-TAX-08 / ENG-TAX-09 /
 * document-total arithmetic.
 *
 * AE (VAT Reverse Charge): UAE domestic reverse-charge supplies carry a notional
 * 5% rate but 0 tax. The taxable amount is included in totals; the tax amount is
 * always 0. See PINT-AE § BTAE-08 / the engine's AE reverse-charge handling.
 */

import { round2 } from '../money.js';
import { VAT_CATEGORY_CODES } from '../codelists.js';

/**
 * @typedef {{ category: string, taxable: number, tax: number }} CategoryTotal
 * @typedef {{ lineExtension: number, byCategory: Record<string, CategoryTotal>, taxTotal: number, taxExclusive: number, taxInclusive: number, payable: number }} TotalsResult
 */

/**
 * Compute document totals from line items and per-category tax rates.
 *
 * AE taxable is included in all totals; AE tax is 0. The caller supplies a
 * rates map like { S: 5, AE: 5 } — the AE rate is stored at 5 (notional) but
 * the tax amount is forced to 0.
 *
 * @param {Array<{ quantity: number, unitPrice: number, category: string }>} lines
 * @param {Record<string, number>} rates  category -> rate percent
 * @returns {TotalsResult}
 */
export function computeTotals(lines, rates) {
  const byCategory = {};

  let lineExtension = 0;

  for (const line of lines) {
    const ext = round2(line.quantity * line.unitPrice);
    lineExtension = round2(lineExtension + ext);

    const cat = line.category;
    if (!byCategory[cat]) {
      const catInfo = VAT_CATEGORY_CODES[cat];
      const rate = rates[cat] ?? catInfo?.expectedRate ?? 0;
      byCategory[cat] = { category: cat, taxable: 0, tax: 0, rate };
    }
    byCategory[cat].taxable = round2(byCategory[cat].taxable + ext);
  }

  // Compute tax per category. AE tax is always 0.
  for (const entry of Object.values(byCategory)) {
    if (entry.category === 'AE') {
      entry.tax = 0;
    } else {
      entry.tax = round2(entry.taxable * (entry.rate / 100));
    }
  }

  const taxTotal = round2(Object.values(byCategory).reduce((sum, c) => sum + c.tax, 0));
  const taxExclusive = lineExtension; // v1: no allowances/charges
  const taxInclusive = round2(taxExclusive + taxTotal);
  const payable = taxInclusive; // v1: no rounding

  return {
    lineExtension,
    byCategory,
    taxTotal,
    taxExclusive,
    taxInclusive,
    payable,
  };
}
