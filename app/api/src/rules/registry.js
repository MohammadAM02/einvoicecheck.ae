import { invoiceTypeRule } from './checks/invoiceType.js';
import { trnRule } from './checks/trn.js';
import { requiredFieldsRule } from './checks/requiredFields.js';
import { currencyRule } from './checks/currency.js';
import { vatCategoryRule } from './checks/vatCategory.js';
import { lineArithmeticRule } from './checks/lineArithmetic.js';
import { documentTotalsRule } from './checks/documentTotals.js';
import { taxBreakdownRule } from './checks/taxBreakdown.js';

/**
 * Ordered rule registry. Order is fixed for deterministic output. To add the
 * official UBL/PINT AE XSD + Schematron layer, register it here ahead of the
 * semantic rules (see TODO(pint-ae-xsd) in xml.js).
 */
export const RULES = [
  invoiceTypeRule,
  requiredFieldsRule,
  trnRule,
  currencyRule,
  vatCategoryRule,
  lineArithmeticRule,
  taxBreakdownRule,
  documentTotalsRule,
];

export function ruleCatalog() {
  return RULES.map((r) => ({ id: r.id, spec: r.spec, description: r.description }));
}
