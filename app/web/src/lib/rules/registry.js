import { invoiceTypeRule } from './checks/invoiceType.js';
import { trnRule } from './checks/trn.js';
import { requiredFieldsRule } from './checks/requiredFields.js';
import { currencyRule } from './checks/currency.js';
import { vatCategoryRule } from './checks/vatCategory.js';
import { lineArithmeticRule } from './checks/lineArithmetic.js';
import { documentTotalsRule } from './checks/documentTotals.js';
import { taxBreakdownRule } from './checks/taxBreakdown.js';
import { schematronRule } from './schematron.js';
import { structureRule } from './structure.js';

/**
 * Ordered rule registry. Order is fixed for deterministic output. The
 * Schematron + structural (XSD-lite) layers (PINT AE rule IDs) run ahead of
 * the semantic rules; when the official UBL/PINT AE XSD + Schematron ruleset
 * is vendored with a runner (see TODO(pint-ae-xsd) in xml.js), its adapter
 * registers here too.
 */
export const RULES = [
  schematronRule,
  structureRule,
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
