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
 * The XML pipeline separately runs native UBL 2.1 XSD validation and the
 * node-only PINT AE Billing Schematron interpreter. This registry contains the
 * deterministic rules shared by canonical JSON preflight and XML validation.
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
