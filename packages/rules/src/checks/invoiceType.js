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
