/**
 * Test fixtures — a fully valid UAE tax invoice and deliberately broken
 * variants. All amounts are AED, standard-rated at 5%.
 *
 * Mirror of app/api/test/helpers/fixtures.js — kept in lockstep so the
 * migration test exercises the exact same inputs.
 */

// Valid: 2 lines, standard rate 5%, totals reconcile exactly.
export function validInvoice() {
  return {
    invoiceType: '388', // tax invoice
    invoiceNumber: 'INV-2026-0001',
    issueDate: '2026-07-14',
    currency: 'AED',
    supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
    customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
    lines: [
      {
        id: '1',
        quantity: 10,
        unitPrice: 50,
        lineExtensionAmount: 500,
        taxCategory: { code: 'S', rate: 5 },
        itemName: 'Widget A',
      },
      {
        id: '2',
        quantity: 4,
        unitPrice: 25,
        lineExtensionAmount: 100,
        taxCategory: { code: 'S', rate: 5 },
        itemName: 'Widget B',
      },
    ],
    allowanceTotal: 0,
    chargeTotal: 0,
    prepaidAmount: 0,
    roundingAmount: 0,
    taxSubtotals: [
      { taxableAmount: 600, taxAmount: 30, category: { code: 'S', rate: 5 } },
    ],
    totals: {
      lineExtensionAmount: 600,
      taxExclusiveAmount: 600,
      taxAmount: 30,
      taxInclusiveAmount: 630,
      payableAmount: 630,
    },
  };
}

// Broken: bad TRN, wrong VAT rate, line + document totals that do not add up.
export function brokenInvoice() {
  const inv = validInvoice();
  inv.supplier.trn = '12345'; // not 15 digits
  inv.lines[0].lineExtensionAmount = 999; // != 10 * 50
  inv.lines[0].taxCategory.rate = 8; // standard must be 5
  inv.taxSubtotals[0].taxAmount = 12; // != 600 * 5%
  inv.totals.taxInclusiveAmount = 700; // != 600 + 30
  return inv;
}

// Minimal valid UBL 2.1 / PINT AE XML tax invoice (single line, 5%).
export function validUblXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>
  <cbc:ID>INV-XML-001</cbc:ID>
  <cbc:IssueDate>2026-07-14</cbc:IssueDate>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme><cbc:CompanyID>100123456700003</cbc:CompanyID></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>Falcon Trading LLC</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme><cbc:CompanyID>100987654300003</cbc:CompanyID></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>Oasis Retail FZE</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="AED">30.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="AED">600.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="AED">30.00</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5</cbc:Percent></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="AED">600.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="AED">600.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="AED">630.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="AED">630.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">12</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="AED">600.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Widget A</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5</cbc:Percent></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="AED">50.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}
