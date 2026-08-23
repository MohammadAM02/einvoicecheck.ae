import { XMLParser, XMLValidator } from 'fast-xml-parser';

/**
 * Map a UBL 2.1 / PINT AE Invoice or CreditNote XML document into the engine's
 * canonical invoice model. This is intentionally a documented-field mapping,
 * not full XSD/Schematron validation.
 *
 * The XML pipeline applies the parser gate, native UBL 2.1 XSD validation,
 * deterministic semantic checks, and the node-only PINT AE Schematron layer in
 * xml-validation.js. This mapper only projects the documented BT-* fields
 * needed by the deterministic engine.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true, // cbc:/cac: -> bare names
  parseTagValue: false, // keep raw strings; we coerce numbers ourselves
  trimValues: true,
});

function toArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

/** UBL amount nodes carry a #text value plus a currencyID attribute. */
function amount(node) {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'object') return node['#text'];
  return node;
}

function text(node) {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'object') return node['#text'];
  return node;
}

function num(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function partyTrn(party) {
  if (!party) return undefined;
  // Prefer PartyTaxScheme/CompanyID (VAT TRN), fall back to PartyLegalEntity.
  const pts = toArray(party.PartyTaxScheme)[0];
  return (
    text(pts?.CompanyID) ??
    text(toArray(party.PartyLegalEntity)[0]?.CompanyID)
  );
}

function partyName(party) {
  return text(toArray(party?.PartyLegalEntity)[0]?.RegistrationName) ??
    text(toArray(party?.PartyName)[0]?.Name);
}

export function looksLikeXml(body) {
  return typeof body === 'string' && body.trimStart().startsWith('<');
}

export function parseUblInvoice(xmlString) {
  const gate = XMLValidator.validate(xmlString);
  if (gate !== true) {
    const e = new Error(gate?.err?.msg || 'Document is not well-formed XML');
    e.code = 'BAD_XML_WELLFORMED';
    throw e;
  }
  const tree = parser.parse(xmlString);
  const root = tree.Invoice ? 'Invoice' : tree.CreditNote ? 'CreditNote' : null;
  if (!root) {
    const e = new Error('Unrecognized UBL document: expected <Invoice> or <CreditNote> root element');
    e.code = 'BAD_XML_ROOT';
    throw e;
  }
  const doc = tree[root];

  const supplierParty = toArray(doc.AccountingSupplierParty)[0]?.Party;
  const customerParty = toArray(doc.AccountingCustomerParty)[0]?.Party;

  const lmt = toArray(doc.LegalMonetaryTotal)[0] || {};
  const taxTotal = toArray(doc.TaxTotal)[0] || {};

  const taxSubtotals = toArray(taxTotal.TaxSubtotal).map((st) => {
    const cat = toArray(st.TaxCategory)[0] || {};
    return {
      taxableAmount: num(amount(st.TaxableAmount)),
      taxAmount: num(amount(st.TaxAmount)),
      category: { code: text(cat.ID), rate: num(text(cat.Percent)) },
    };
  });

  const lineKey = root === 'CreditNote' ? 'CreditNoteLine' : 'InvoiceLine';
  const qtyKey = root === 'CreditNote' ? 'CreditedQuantity' : 'InvoicedQuantity';
  const lines = toArray(doc[lineKey]).map((ln, i) => {
    const item = toArray(ln.Item)[0] || {};
    const cat = toArray(item.ClassifiedTaxCategory)[0] || {};
    const price = toArray(ln.Price)[0] || {};
    // UBL allows multiple AllowanceCharge per line: ChargeIndicator false =
    // allowance (subtracted), true = charge (added). Amount is authoritative.
    let allowance = 0;
    let charge = 0;
    for (const ac of toArray(ln.AllowanceCharge)) {
      const amt = num(amount(ac.Amount)) ?? 0;
      if (text(ac.ChargeIndicator) === 'true') charge += amt;
      else allowance += amt;
    }
    return {
      id: text(ln.ID) ?? String(i + 1),
      quantity: num(amount(ln[qtyKey])),
      unitPrice: num(amount(price.PriceAmount)),
      lineExtensionAmount: num(amount(ln.LineExtensionAmount)),
      allowance,
      charge,
      taxCategory: { code: text(cat.ID), rate: num(text(cat.Percent)) },
      itemName: text(item.Name),
    };
  });

  return {
    format: 'ubl-xml',
    root,
    schemaVersion: text(doc.CustomizationID) || 'urn:peppol:pint:billing-1@ae-1',
    invoiceType: text(doc.InvoiceTypeCode) ?? text(doc.CreditNoteTypeCode) ??
      (root === 'CreditNote' ? '381' : '380'),
    invoiceNumber: text(doc.ID),
    issueDate: text(doc.IssueDate),
    currency: text(doc.DocumentCurrencyCode),
    taxCurrency: text(doc.TaxCurrencyCode),
    supplier: { trn: partyTrn(supplierParty), name: partyName(supplierParty) },
    customer: { trn: partyTrn(customerParty), name: partyName(customerParty) },
    lines,
    allowanceTotal: num(amount(lmt.AllowanceTotalAmount)) ?? 0,
    chargeTotal: num(amount(lmt.ChargeTotalAmount)) ?? 0,
    prepaidAmount: num(amount(lmt.PrepaidAmount)) ?? 0,
    roundingAmount: num(amount(lmt.PayableRoundingAmount)) ?? 0,
    taxSubtotals,
    totals: {
      lineExtensionAmount: num(amount(lmt.LineExtensionAmount)),
      taxExclusiveAmount: num(amount(lmt.TaxExclusiveAmount)),
      taxAmount: num(amount(taxTotal.TaxAmount)),
      taxInclusiveAmount: num(amount(lmt.TaxInclusiveAmount)),
      payableAmount: num(amount(lmt.PayableAmount)),
    },
    _warnings: [],
  };
}
