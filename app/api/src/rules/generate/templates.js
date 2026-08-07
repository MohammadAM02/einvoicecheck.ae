/**
 * Template registry for the XML invoice generator.
 *
 * Each template maps to an official-sample skeleton and defines its supported
 * VAT categories, line block fragment, and tax-subtotal block fragment.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKELETON_DIR = resolve(__dirname, 'skeletons');

/**
 * Line block fragment (one InvoiceLine), tokenized. The generator fills
 * {{LINE_ID}}, {{LINE_NAME}}, {{LINE_QTY}}, {{LINE_PRICE}}, {{LINE_EXT}},
 * {{LINE_CATEGORY}}, {{LINE_RATE}} per line.
 */
const STANDARD_LINE_FRAGMENT = `<cac:InvoiceLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="H87">{{LINE_QTY}}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          <cbc:Percent>{{LINE_RATE}}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
      </cac:Price>
    </cac:InvoiceLine>`;

const SUMMARY_LINE_FRAGMENT = `<cac:InvoiceLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="H87">{{LINE_QTY}}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          <cbc:Percent>{{LINE_RATE}}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
      </cac:Price>
    </cac:InvoiceLine>`;

const CREDIT_NOTE_LINE_FRAGMENT = `<cac:CreditNoteLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:CreditedQuantity unitCode="H87">{{LINE_QTY}}</cbc:CreditedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          <cbc:Percent>{{LINE_RATE}}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
      </cac:Price>
    </cac:CreditNoteLine>`;

/**
 * Tax-subtotal block fragment, tokenized. The generator fills
 * {{TAXABLE_AMOUNT}}, {{TAX_AMOUNT}}, {{CATEGORY}}, {{RATE}} per category.
 */
const TAX_SUBTOTAL_FRAGMENT = `<cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="AED">{{TAXABLE_AMOUNT}}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="AED">{{TAX_AMOUNT}}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>{{CATEGORY}}</cbc:ID>
          <cbc:Percent>{{RATE}}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`;

export const TEMPLATES = Object.freeze({
  'standard-tax-invoice': Object.freeze({
    id: 'standard-tax-invoice',
    name: 'Standard tax invoice',
    skeletonPath: resolve(SKELETON_DIR, 'standard-tax-invoice.xml'),
    invoiceTypeCode: '388',
    customizationId: 'urn:peppol:pint:billing-1@ae-1',
    categories: Object.freeze(['S']),
    lineBlockFragment: STANDARD_LINE_FRAGMENT,
    taxSubtotalBlockFragment: TAX_SUBTOTAL_FRAGMENT,
  }),
  'summary-tax-invoice': Object.freeze({
    id: 'summary-tax-invoice',
    name: 'Summary tax invoice',
    skeletonPath: resolve(SKELETON_DIR, 'summary-tax-invoice.xml'),
    invoiceTypeCode: '386',
    customizationId: 'urn:peppol:pint:billing-1@ae-1',
    categories: Object.freeze(['S', 'AE']),
    lineBlockFragment: SUMMARY_LINE_FRAGMENT,
    taxSubtotalBlockFragment: TAX_SUBTOTAL_FRAGMENT,
  }),
  'standard-tax-credit-note': Object.freeze({
    id: 'standard-tax-credit-note',
    name: 'Standard tax credit note',
    skeletonPath: resolve(SKELETON_DIR, 'standard-tax-credit-note.xml'),
    invoiceTypeCode: '381',
    customizationId: 'urn:peppol:pint:billing-1@ae-1',
    categories: Object.freeze(['S']),
    lineBlockFragment: CREDIT_NOTE_LINE_FRAGMENT,
    taxSubtotalBlockFragment: TAX_SUBTOTAL_FRAGMENT,
  }),
});
