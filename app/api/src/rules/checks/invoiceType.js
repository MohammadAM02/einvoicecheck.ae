import { err, warn } from '../error.js';
import { isKnownInvoiceType, INVOICE_TYPE_CODES } from '../codelists.js';

/**
 * BT-3 invoice type code detection + code-list membership.
 * Cites: UNCL1001 (BT-3) as adopted by PINT AE; UAE mandatory-fields v1.0.
 */
export const invoiceTypeRule = {
  id: 'ENG-TYPE-01',
  spec: 'BT-3 / UNCL1001 (PINT AE)',
  description: 'Invoice type code must be present and a recognised PINT AE type.',
  evaluate(inv) {
    const out = [];
    const code = inv.invoiceType;
    if (code === undefined || code === null || code === '') {
      out.push(
        err(
          '/invoiceType',
          'ENG-TYPE-01/BT-3',
          'Invoice type code (BT-3) is missing.',
          `Set invoiceType to one of: ${Object.keys(INVOICE_TYPE_CODES).join(', ')} (e.g. "388" for a tax invoice).`
        )
      );
      return out;
    }
    if (code === '389') {
      out.push(
        warn(
          '/invoiceType',
          'ENG-TYPE-01/SELF-BILLING',
          'Self-billed invoice (389) is not yet supported by this validator. Structural checks ran, but self-billing business rules (PINT-AE Self-Billing 1.0.4) are not vendored, so results are incomplete.',
          'Use an accredited ASP for self-billed invoices, or validate a supplier-issued invoice (388) instead.'
        )
      );
      return out;
    }
    // PINT-AE Billing recognises 480 (out of scope of VAT) alongside the
    // codelist subset; the generated summary template emits it.
    if (code === '480') {
      return out;
    }
    if (!isKnownInvoiceType(code)) {
      out.push(
        warn(
          '/invoiceType',
          'ENG-TYPE-01/BT-3',
          `Invoice type code "${code}" is not in the recognised PINT AE list.`,
          `Use a known code: ${Object.keys(INVOICE_TYPE_CODES).join(', ')}.`
        )
      );
    }
    return out;
  },
};
