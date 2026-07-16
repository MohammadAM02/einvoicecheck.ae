import { looksLikeXml, parseUblInvoice } from './xml.js';

/**
 * Coerce any accepted input into the canonical invoice model consumed by the
 * rule engine. Accepts:
 *   - a raw UBL 2.1 / PINT AE XML string
 *   - a canonical JSON invoice object (this API's documented invoice DTO)
 *   - a JSON envelope { format: 'xml', document: '<Invoice>...' }
 *
 * Returns { invoice, parseError }. parseError is set when the input could not
 * be parsed at all (so the route can answer with a single structural error
 * rather than a stack trace).
 */
export function normalizeInput(body, contentType = '') {
  try {
    if (typeof body === 'string') {
      if (looksLikeXml(body)) return { invoice: parseUblInvoice(body) };
      // A JSON string body
      return { invoice: fromJson(JSON.parse(body)) };
    }
    if (body && typeof body === 'object') {
      if (typeof body.document === 'string' && looksLikeXml(body.document)) {
        return { invoice: parseUblInvoice(body.document) };
      }
      if (typeof body.invoice === 'object' && body.invoice) {
        return { invoice: fromJson(body.invoice) };
      }
      return { invoice: fromJson(body) };
    }
    return { parseError: 'Empty or unsupported request body' };
  } catch (e) {
    return { parseError: e.message || 'Failed to parse invoice' };
  }
}

function n(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const x = Number(v);
  return Number.isNaN(x) ? undefined : x;
}

/** Map a canonical JSON invoice DTO to the internal model, filling defaults. */
function fromJson(obj) {
  const lines = Array.isArray(obj.lines) ? obj.lines : [];
  return {
    format: 'json',
    root: String(obj.invoiceType) === '381' ? 'CreditNote' : 'Invoice',
    schemaVersion: obj.schemaVersion || 'urn:peppol:pint:billing-1@ae-1',
    invoiceType: obj.invoiceType !== undefined ? String(obj.invoiceType) : undefined,
    invoiceNumber: obj.invoiceNumber ?? obj.id,
    issueDate: obj.issueDate,
    currency: obj.currency,
    taxCurrency: obj.taxCurrency,
    supplier: {
      trn: obj.supplier?.trn,
      name: obj.supplier?.name,
    },
    customer: {
      trn: obj.customer?.trn,
      name: obj.customer?.name,
    },
    lines: lines.map((ln, i) => ({
      id: ln.id ?? String(i + 1),
      quantity: n(ln.quantity),
      unitPrice: n(ln.unitPrice),
      lineExtensionAmount: n(ln.lineExtensionAmount),
      allowance: n(ln.allowance) ?? 0,
      charge: n(ln.charge) ?? 0,
      taxCategory: {
        code: ln.taxCategory?.code,
        rate: n(ln.taxCategory?.rate),
      },
      itemName: ln.itemName,
    })),
    allowanceTotal: n(obj.allowanceTotal) ?? 0,
    chargeTotal: n(obj.chargeTotal) ?? 0,
    prepaidAmount: n(obj.prepaidAmount) ?? 0,
    roundingAmount: n(obj.roundingAmount) ?? 0,
    taxSubtotals: Array.isArray(obj.taxSubtotals)
      ? obj.taxSubtotals.map((st) => ({
          taxableAmount: n(st.taxableAmount),
          taxAmount: n(st.taxAmount),
          category: { code: st.category?.code, rate: n(st.category?.rate) },
        }))
      : [],
    totals: {
      lineExtensionAmount: n(obj.totals?.lineExtensionAmount),
      taxExclusiveAmount: n(obj.totals?.taxExclusiveAmount),
      taxAmount: n(obj.totals?.taxAmount),
      taxInclusiveAmount: n(obj.totals?.taxInclusiveAmount),
      payableAmount: n(obj.totals?.payableAmount),
    },
    _warnings: [],
  };
}
