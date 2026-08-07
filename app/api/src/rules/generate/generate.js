/**
 * Token-skeleton XML invoice generator.
 *
 *   generateInvoice({ template, data }) → { xml, template, engineVersion }
 *
 * Reads the skeleton for the chosen template, renders dynamic line and tax
 * blocks, substitutes all tokens with XML-escaped values, and runs the XSD
 * oracle as a runtime gate. Throws on any validation failure or XSD issue.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { TEMPLATES } from './templates.js';
import { computeTotals } from './totals.js';
import { VAT_CATEGORY_CODES } from '../codelists.js';
import { round2, isNumber } from '../money.js';
import { validateGenerateXsd } from './validate-xsd.js';

export const GENERATOR_VERSION = '1.0.0';

const TOKEN_RE = /\{\{(\w+)\}\}/g;
const TRN_RE = /^\d{15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * XML-escape a value for safe inclusion in element text or attribute values.
 * Escapes: & < > " '
 */
function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a numeric value for XML output. Uses fixed-point (2 dp) for amounts,
 * and enforces no NaN/Infinity can enter the XML.
 */
function fmtAmount(n) {
  if (!isNumber(n)) throw new Error(`Non-numeric amount: ${n}`);
  const r = round2(n);
  if (!Number.isFinite(r)) throw new Error(`Non-finite amount: ${r}`);
  return r.toFixed(2);
}

/**
 * Generate the current timestamp in +04:00 (UAE timezone offset). Used for
 * IssueTime when the caller does not supply one.
 */
function issueTimeNow() {
  const now = new Date();
  // UAE is UTC+4 all year (no DST). Compute in +04:00 offset.
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const uae = new Date(utc + 4 * 3600000);
  const hh = String(uae.getUTCHours()).padStart(2, '0');
  const mm = String(uae.getUTCMinutes()).padStart(2, '0');
  const ss = String(uae.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}+04:00`;
}

/**
 * Build the token → value map for static (non-line, non-subtotal) tokens.
 * User-supplied fields take precedence; everything else gets a sensible
 * default so the skeleton is fully resolved.
 */
function buildTokenMap(input, template, totals) {
  const s = input.supplier || {};
  const c = input.customer || {};
  const dueDate = input.dueDate || input.issueDate;

  return {
    CUSTOMIZATION_ID: template.customizationId,
    PROFILE_EXECUTION_ID: '00000000',
    INVOICE_NUMBER: input.invoiceNumber,
    UUID: randomUUID(),
    ISSUE_DATE: input.issueDate,
    ISSUE_TIME: issueTimeNow(),
    DUE_DATE: dueDate,
    INVOICE_TYPE_CODE: template.invoiceTypeCode,
    NOTE: 'Tax invoice',
    TAX_POINT_DATE: input.issueDate,
    CURRENCY: 'AED',
    ACCOUNTING_COST: 'Regular sales',
    BUYER_REFERENCE: '',
    INVOICE_PERIOD_START: input.issueDate,
    INVOICE_PERIOD_END: input.issueDate,
    ORDER_REFERENCE_ID: '',
    SALES_ORDER_ID: '',
    BILLING_REF_ID: '',
    BILLING_REF_DATE: input.issueDate,
    DESPATCH_DOC_REF_ID: '',
    ORIGINATOR_DOC_REF_ID: '',
    ADD_DOC_REF_ID_1: '',
    ADD_DOC_REF_URI_1: '',
    ADD_DOC_REF_ID_2: '',
    ADD_DOC_REF_FILENAME_2: '',
    ADD_DOC_REF_BINARY_2: '',
    ADD_DOC_REF_FILENAME_1: '',
    ADD_DOC_REF_BINARY_1: '',
    PROJECT_REF_ID: '',
    DISCREPANCY_RESPONSE_CODE: '',
    SUPPLIER_ENDPOINT_ID: s.trn ? s.trn.slice(0, 10) : '',
    SUPPLIER_NAME: s.name || '',
    SUPPLIER_STREET: 'Street Name',
    SUPPLIER_CITY: 'Dubai',
    SUPPLIER_COUNTRY_SUBENTITY: 'DU',
    SUPPLIER_COUNTRY_CODE: 'AE',
    SUPPLIER_TRN: s.trn || '',
    SUPPLIER_LEGAL_NAME: s.name || '',
    SUPPLIER_TRADE_LICENSE: '',
    SUPPLIER_LEGAL_FORM: 'Merchant',
    SUPPLIER_CONTACT_NAME: '',
    SUPPLIER_CONTACT_PHONE: '',
    SUPPLIER_CONTACT_EMAIL: '',
    CUSTOMER_ENDPOINT_ID: c.trn ? c.trn.slice(0, 10) : '',
    CUSTOMER_NAME: c.name || '',
    CUSTOMER_STREET: 'Street Name',
    CUSTOMER_CITY: 'Dubai',
    CUSTOMER_COUNTRY_SUBENTITY: 'DU',
    CUSTOMER_COUNTRY_CODE: 'AE',
    CUSTOMER_TRN: c.trn || '',
    CUSTOMER_LEGAL_NAME: c.name || '',
    CUSTOMER_TRADE_LICENSE: '',
    CUSTOMER_CONTACT_NAME: '',
    CUSTOMER_CONTACT_PHONE: '',
    CUSTOMER_CONTACT_EMAIL: '',
    PAYEE_NAME: s.name || '',
    PAYEE_COMPANY_ID: '',
    PAYMENT_MEANS_NAME: 'Credit transfer',
    PAYMENT_MEANS_CODE: '30',
    CARD_ACCOUNT_NUMBER: '',
    CARD_NETWORK_ID: '',
    CARD_HOLDER_NAME: '',
    PAYMENT_TERMS_NOTE: '',
    PAYEE_ACCOUNT_SCHEME: 'IBAN',
    PAYEE_ACCOUNT_ID: '',
    PAYEE_ACCOUNT_NAME: '',
    PAYEE_BANK_ID: '',
    ALLOWANCE_1_REASON_CODE: '100',
    ALLOWANCE_1_REASON: 'Discount',
    ALLOWANCE_1_MULTIPLIER: '0',
    ALLOWANCE_1_AMOUNT: '0',
    ALLOWANCE_1_BASE_AMOUNT: '0',
    ALLOWANCE_1_TAX_CATEGORY: 'S',
    ALLOWANCE_1_TAX_RATE: '5',
    CHARGE_1_REASON_CODE: '',
    CHARGE_1_REASON: '',
    CHARGE_1_MULTIPLIER: '0',
    CHARGE_1_AMOUNT: '0',
    CHARGE_1_BASE_AMOUNT: '0',
    CHARGE_1_TAX_CATEGORY: 'S',
    CHARGE_1_TAX_RATE: '5',
    // Totals (computed)
    LINE_EXTENSION_TOTAL: fmtAmount(totals.lineExtension),
    TAX_EXCLUSIVE_TOTAL: fmtAmount(totals.taxExclusive),
    TAX_INCLUSIVE_TOTAL: fmtAmount(totals.taxInclusive),
    TAX_TOTAL: fmtAmount(totals.taxTotal),
    PAYABLE_TOTAL: fmtAmount(totals.payable),
    PAYABLE_ROUNDING: '0.00',
  };
}

/**
 * Validate input data. Returns an array of { field, message } objects.
 * Empty array means valid.
 */
function validateInput(data, template) {
  const errors = [];

  if (!data.invoiceNumber || typeof data.invoiceNumber !== 'string' || !data.invoiceNumber.trim()) {
    errors.push({ field: 'invoiceNumber', message: 'Invoice number is required.' });
  }
  if (!data.issueDate || !DATE_RE.test(data.issueDate)) {
    errors.push({ field: 'issueDate', message: 'Issue date is required and must be YYYY-MM-DD.' });
  }
  if (data.dueDate && !DATE_RE.test(data.dueDate)) {
    errors.push({ field: 'dueDate', message: 'Due date must be YYYY-MM-DD.' });
  }

  // Supplier
  if (!data.supplier || typeof data.supplier !== 'object') {
    errors.push({ field: 'supplier', message: 'Supplier is required.' });
  } else {
    if (!data.supplier.trn || !TRN_RE.test(String(data.supplier.trn).replace(/\s|-/g, ''))) {
      errors.push({ field: 'supplier.trn', message: 'Supplier TRN must be exactly 15 digits.' });
    }
    if (!data.supplier.name || typeof data.supplier.name !== 'string' || !data.supplier.name.trim()) {
      errors.push({ field: 'supplier.name', message: 'Supplier name is required.' });
    }
  }

  // Customer
  if (!data.customer || typeof data.customer !== 'object') {
    errors.push({ field: 'customer', message: 'Customer is required.' });
  } else {
    if (!data.customer.trn || !TRN_RE.test(String(data.customer.trn).replace(/\s|-/g, ''))) {
      errors.push({ field: 'customer.trn', message: 'Customer TRN must be exactly 15 digits.' });
    }
    if (!data.customer.name || typeof data.customer.name !== 'string' || !data.customer.name.trim()) {
      errors.push({ field: 'customer.name', message: 'Customer name is required.' });
    }
  }

  // Lines
  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    errors.push({ field: 'lines', message: 'At least one invoice line is required.' });
  } else {
    const allowedCategories = template.categories;
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      if (!line.name || typeof line.name !== 'string' || !line.name.trim()) {
        errors.push({ field: `lines[${i}].name`, message: 'Line name is required.' });
      }
      const qty = Number(line.quantity);
      if (!isNumber(qty) || qty <= 0) {
        errors.push({ field: `lines[${i}].quantity`, message: 'Quantity must be a positive number.' });
      }
      const price = Number(line.unitPrice);
      if (!isNumber(price) || price < 0) {
        errors.push({ field: `lines[${i}].unitPrice`, message: 'Unit price must be a non-negative number.' });
      }
      if (!line.category || !allowedCategories.includes(line.category)) {
        const allowed = allowedCategories.join(', ');
        errors.push({ field: `lines[${i}].category`, message: `Category must be one of: ${allowed}.` });
      }
    }
  }

  return errors;
}

/**
 * Render one line using the template's line block fragment.
 *
 * @param {object} line  { name, quantity, unitPrice, category }
 * @param {number} index  0-based line index
 * @param {Record<string, number>} rates  category → rate percent
 * @param {string} lineFrag  the tokenized line block fragment
 * @returns {string}
 */
function renderLine(line, index, rates, lineFrag) {
  const ext = round2(Number(line.quantity) * Number(line.unitPrice));
  const rate = rates[line.category] ?? VAT_CATEGORY_CODES[line.category]?.expectedRate ?? 0;

  const lineTokens = {
    LINE_ID: String(index + 1),
    LINE_NAME: line.name,
    LINE_QTY: fmtAmount(Number(line.quantity)),
    LINE_PRICE: fmtAmount(Number(line.unitPrice)),
    LINE_EXT: fmtAmount(ext),
    LINE_CATEGORY: line.category,
    LINE_RATE: String(rate),
  };

  return lineFrag.replace(TOKEN_RE, (match, token) => {
    if (token in lineTokens) return xmlEscape(lineTokens[token]);
    // Extra tokens not in our standard set — provide safe defaults.
    if (token === 'LINE_NOTE') return '';
    if (token === 'LINE_PERIOD_START' || token === 'LINE_PERIOD_END') return '';
    if (token === 'LINE_UNIT_CODE') return 'H87';
    if (token === 'LINE_ORDER_LINE_ID') return xmlEscape(String(index + 1));
    if (token === 'LINE_ORDER_REF_ID') return '';
    if (token === 'LINE_BUYER_ITEM_ID' || token === 'LINE_SELLER_ITEM_ID') return '';
    if (token === 'LINE_DESC') return xmlEscape(line.name);
    if (token === 'LINE_PROP_NAME' || token === 'LINE_PROP_VALUE') return '';
    return match;
  });
}

/**
 * Render one tax subtotal block for a category.
 *
 * @param {{ category: string, taxable: number, tax: number, rate: number }} cat
 * @param {string} frag  the tokenized tax subtotal block fragment
 * @returns {string}
 */
function renderTaxSubtotal(cat, frag) {
  const subtotalTokens = {
    TAXABLE_AMOUNT: fmtAmount(cat.taxable),
    TAX_AMOUNT: fmtAmount(cat.tax),
    CATEGORY: cat.category,
    RATE: String(cat.rate),
  };

  return frag.replace(TOKEN_RE, (match, token) => {
    if (token in subtotalTokens) return xmlEscape(subtotalTokens[token]);
    return match;
  });
}

/**
 * Generate PINT-AE UBL XML invoice.
 *
 * @param {{ template: string, data: object }} opts
 * @returns {{ xml: string, template: string, engineVersion: string }}
 * @throws {Error} with { validationErrors?: Array } on validation failure
 */
export function generateInvoice({ template: templateId, data } = {}) {
  // --- 1. Resolve template ---
  const template = TEMPLATES[templateId];
  if (!template) {
    const known = Object.keys(TEMPLATES).join(', ');
    const err = new Error(`Unknown template "${templateId}". Must be one of: ${known}.`);
    err.validationErrors = [{ field: 'template', message: `Unknown template. Must be one of: ${known}.` }];
    throw err;
  }

  // --- 2. Validate input ---
  const fieldErrors = validateInput(data, template);
  if (fieldErrors.length > 0) {
    const err = new Error('Validation failed.');
    err.validationErrors = fieldErrors;
    throw err;
  }

  // --- 3. Normalise TRN (strip spaces/dashes before use) ---
  const supplierTrn = (data.supplier.trn || '').replace(/\s|-/g, '');
  const customerTrn = (data.customer.trn || '').replace(/\s|-/g, '');
  const normalised = {
    ...data,
    supplier: { ...data.supplier, trn: supplierTrn },
    customer: { ...data.customer, trn: customerTrn },
  };

  // --- 4. Compute totals ---
  const rates = {};
  for (const cat of template.categories) {
    const info = VAT_CATEGORY_CODES[cat];
    rates[cat] = info?.expectedRate ?? 0;
  }
  // AE rate is notional 5% for the percent field in XML despite tax=0
  if (template.categories.includes('AE')) {
    rates['AE'] = 5;
  }
  const totals = computeTotals(normalised.lines, rates);

  // --- 5. Build static token map ---
  const tokenMap = buildTokenMap(normalised, template, totals);

  // --- 6. Read skeleton ---
  let skeleton = readFileSync(template.skeletonPath, 'utf8');

  // --- 7. Render lines ---
  const lineFrag = template.lineBlockFragment;
  const renderedLines = normalised.lines
    .map((line, i) => renderLine(line, i, rates, lineFrag))
    .join('\n');
  skeleton = skeleton.replace('{{LINE_BLOCK}}', renderedLines);

  // --- 8. Render tax subtotals ---
  const taxFrag = template.taxSubtotalBlockFragment;
  const renderedSubtotals = Object.values(totals.byCategory)
    .map((cat) => renderTaxSubtotal(cat, taxFrag))
    .join('\n');
  skeleton = skeleton.replace('{{TAX_SUBTOTAL_BLOCK}}', renderedSubtotals);

  // --- 9. Substitute remaining static tokens ---
  const missing = [];
  const result = skeleton.replace(TOKEN_RE, (match, token) => {
    if (token === 'LINE_BLOCK' || token === 'TAX_SUBTOTAL_BLOCK') return match;
    if (token in tokenMap) return xmlEscape(tokenMap[token]);
    // Legacy spike tokens — provide empty defaults
    if (token.startsWith('LINE_') || token.startsWith('TAX_SUBTOTAL_') || token.startsWith('TAX_RATE_')) return '';
    missing.push(token);
    return match;
  });

  // --- 10. Unresolved-token audit ---
  if (missing.length > 0) {
    throw new Error(`Unresolved tokens in generated XML: ${missing.join(', ')}`);
  }
  if (result.includes('{{LINE_BLOCK}}') || result.includes('{{TAX_SUBTOTAL_BLOCK}}')) {
    throw new Error('Block tokens not fully resolved in generated XML.');
  }

  // --- 11. Runtime XSD oracle ---
  const xsdResult = validateGenerateXsd(result);
  if (xsdResult.issues.length > 0) {
    const msgs = xsdResult.issues.map((i) => `${i.rule} ${i.path}: ${i.message}`).join('; ');
    throw new Error(`XSD validation failed on generated invoice: ${msgs}`);
  }
  if (xsdResult.evalErrors.length > 0) {
    const msgs = xsdResult.evalErrors.map((e) => e.message).join('; ');
    throw new Error(`XSD evaluation error on generated invoice: ${msgs}`);
  }

  return {
    xml: result,
    template: templateId,
    engineVersion: GENERATOR_VERSION,
  };
}
