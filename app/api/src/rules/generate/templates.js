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
 * {{LINE_CATEGORY}}, {{LINE_RATE}}, {{LINE_STD_ITEM_ID}},
 * {{LINE_TAX_AMOUNT}}, {{LINE_PAYABLE_AMOUNT}} per line. The Price details
 * and ItemPriceExtension blocks are required by PINT-AE Billing
 * (ibr-126-ae, ibr-104-ae, ibr-194-ae); the StandardItemIdentification and
 * CommodityClassification blocks satisfy the AE reverse-charge line rules
 * (ibr-166-ae, ibr-174-ae).
 */
const STANDARD_LINE_FRAGMENT = `<cac:InvoiceLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="H87">{{LINE_QTY}}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:StandardItemIdentification>
          <cbc:ID schemeID="0160">{{LINE_STD_ITEM_ID}}</cbc:ID>
        </cac:StandardItemIdentification>
        <cac:CommodityClassification>
          <cbc:NatureCode>DL8.48.3.1</cbc:NatureCode>
        </cac:CommodityClassification>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          {{LINE_TAX_CATEGORY_EXTRA}}
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
        <cac:AllowanceCharge>
          <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
          <cbc:AllowanceChargeReasonCode>95</cbc:AllowanceChargeReasonCode>
          <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
          <cbc:Amount currencyID="AED">0.00</cbc:Amount>
          <cbc:BaseAmount currencyID="AED">{{LINE_PRICE}}</cbc:BaseAmount>
        </cac:AllowanceCharge>
      </cac:Price>
      <cac:ItemPriceExtension>
        <cbc:Amount currencyID="AED">{{LINE_PAYABLE_AMOUNT}}</cbc:Amount>
{{LINE_TAX_TOTAL_BLOCK}}      </cac:ItemPriceExtension>
    </cac:InvoiceLine>`;

const SUMMARY_LINE_FRAGMENT = `<cac:InvoiceLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="H87">{{LINE_QTY}}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:StandardItemIdentification>
          <cbc:ID schemeID="0160">{{LINE_STD_ITEM_ID}}</cbc:ID>
        </cac:StandardItemIdentification>
        <cac:CommodityClassification>
          <cbc:NatureCode>DL8.48.3.1</cbc:NatureCode>
        </cac:CommodityClassification>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          {{LINE_TAX_CATEGORY_EXTRA}}
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
        <cac:AllowanceCharge>
          <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
          <cbc:AllowanceChargeReasonCode>95</cbc:AllowanceChargeReasonCode>
          <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
          <cbc:Amount currencyID="AED">0.00</cbc:Amount>
          <cbc:BaseAmount currencyID="AED">{{LINE_PRICE}}</cbc:BaseAmount>
        </cac:AllowanceCharge>
      </cac:Price>
      <cac:ItemPriceExtension>
        <cbc:Amount currencyID="AED">{{LINE_PAYABLE_AMOUNT}}</cbc:Amount>
{{LINE_TAX_TOTAL_BLOCK}}      </cac:ItemPriceExtension>
    </cac:InvoiceLine>`;

const CREDIT_NOTE_LINE_FRAGMENT = `<cac:CreditNoteLine>
      <cbc:ID>{{LINE_ID}}</cbc:ID>
      <cbc:CreditedQuantity unitCode="H87">{{LINE_QTY}}</cbc:CreditedQuantity>
      <cbc:LineExtensionAmount currencyID="AED">{{LINE_EXT}}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>{{LINE_NAME}}</cbc:Description>
        <cbc:Name>{{LINE_NAME}}</cbc:Name>
        <cac:StandardItemIdentification>
          <cbc:ID schemeID="0160">{{LINE_STD_ITEM_ID}}</cbc:ID>
        </cac:StandardItemIdentification>
        <cac:CommodityClassification>
          <cbc:NatureCode>DL8.48.3.1</cbc:NatureCode>
        </cac:CommodityClassification>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>{{LINE_CATEGORY}}</cbc:ID>
          {{LINE_TAX_CATEGORY_EXTRA}}
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="AED">{{LINE_PRICE}}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="H87">1</cbc:BaseQuantity>
        <cac:AllowanceCharge>
          <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
          <cbc:AllowanceChargeReasonCode>95</cbc:AllowanceChargeReasonCode>
          <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
          <cbc:Amount currencyID="AED">0.00</cbc:Amount>
          <cbc:BaseAmount currencyID="AED">{{LINE_PRICE}}</cbc:BaseAmount>
        </cac:AllowanceCharge>
      </cac:Price>
      <cac:ItemPriceExtension>
        <cbc:Amount currencyID="AED">{{LINE_PAYABLE_AMOUNT}}</cbc:Amount>
{{LINE_TAX_TOTAL_BLOCK}}      </cac:ItemPriceExtension>
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
          {{TAX_CATEGORY_RATE_BLOCK}}
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
    invoiceTypeCode: '380',
    customizationId: 'urn:peppol:pint:billing-1@ae-1',
    categories: Object.freeze(['S']),
    lineBlockFragment: STANDARD_LINE_FRAGMENT,
    taxSubtotalBlockFragment: TAX_SUBTOTAL_FRAGMENT,
  }),
  'summary-tax-invoice': Object.freeze({
    id: 'summary-tax-invoice',
    name: 'Summary tax invoice',
    skeletonPath: resolve(SKELETON_DIR, 'summary-tax-invoice.xml'),
    invoiceTypeCode: '480',
    customizationId: 'urn:peppol:pint:billing-1@ae-1',
    categories: Object.freeze(['E', 'O', 'Z']),
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
