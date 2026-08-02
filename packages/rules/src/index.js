/**
 * @einvoicecheck/rules — shared UAE e-invoice validation rules
 *
 * Re-exports the engine, registry, and all supporting modules so consumers
 * (app/api, app/web) import from a single package.
 */
export { validateInvoice, SCHEMA_VERSION_DEFAULT } from './engine.js';
export { RULES, ruleCatalog } from './registry.js';
export { normalizeInput } from './normalize.js';
export { parseUblInvoice, looksLikeXml } from './xml.js';
export { err, warn } from './error.js';
export { round2, moneyEq, isNumber, fmt } from './money.js';
export {
  VAT_CATEGORY_CODES, UAE_STANDARD_VAT_RATE, DOMESTIC_CURRENCY,
  ISO4217_RE, INVOICE_TYPE_CODES, CREDIT_NOTE_TYPE_CODES,
  isKnownVatCategory, isKnownInvoiceType,
} from './codelists.js';
