import { err } from '../error.js';
import { isNumber } from '../money.js';

/**
 * Presence of the core mandatory fields of a UAE tax invoice (subset of the
 * 51 mandatory fields across invoice details, seller/buyer, document totals
 * and tax breakdown).
 *
 * Cites: UAE Electronic Invoice mandatory fields v1.0 (MoF, 23 Feb 2026);
 * PINT AE BT-1, BT-2, BT-27, BT-44, and the document-total group.
 */
export const requiredFieldsRule = {
  id: 'ENG-REQ-01',
  spec: 'UAE mandatory fields v1.0 (BT-1/BT-2/BT-27/BT-44/totals)',
  description: 'Core mandatory header, party and total fields must be present.',
  evaluate(inv) {
    const out = [];
    const require = (cond, path, rule, msg, fix) => {
      if (!cond) out.push(err(path, rule, msg, fix));
    };

    require(!!inv.invoiceNumber, '/invoiceNumber', 'ENG-REQ-01/BT-1',
      'Invoice number (BT-1) is missing.', 'Provide a unique invoice identifier.');
    require(!!inv.issueDate, '/issueDate', 'ENG-REQ-02/BT-2',
      'Invoice issue date (BT-2) is missing.', 'Provide the issue date in YYYY-MM-DD.');
    require(!!inv.supplier?.name, '/supplier/name', 'ENG-REQ-03/BT-27',
      'Seller name (BT-27) is missing.', 'Provide the registered supplier name.');
    require(!!inv.customer?.name, '/customer/name', 'ENG-REQ-04/BT-44',
      'Buyer name (BT-44) is missing.', 'Provide the buyer name.');

    require(inv.lines && inv.lines.length > 0, '/lines', 'ENG-REQ-05',
      'Invoice must contain at least one line item.', 'Add one or more invoice lines.');

    require(inv.taxSubtotals && inv.taxSubtotals.length > 0, '/taxSubtotals', 'ENG-REQ-06/BG-23',
      'VAT breakdown (BG-23) is missing.', 'Provide at least one tax subtotal (taxable amount, tax amount, category).');

    require(isNumber(inv.totals?.lineExtensionAmount), '/totals/lineExtensionAmount', 'ENG-REQ-07/BT-106',
      'Sum of line net amounts (BT-106) is missing.', 'Provide totals.lineExtensionAmount.');
    require(isNumber(inv.totals?.taxExclusiveAmount), '/totals/taxExclusiveAmount', 'ENG-REQ-08/BT-109',
      'Invoice total without tax (BT-109) is missing.', 'Provide totals.taxExclusiveAmount.');
    require(isNumber(inv.totals?.taxAmount), '/totals/taxAmount', 'ENG-REQ-09/BT-110',
      'Invoice total tax amount (BT-110) is missing.', 'Provide totals.taxAmount.');
    require(isNumber(inv.totals?.taxInclusiveAmount), '/totals/taxInclusiveAmount', 'ENG-REQ-10/BT-112',
      'Invoice total with tax (BT-112) is missing.', 'Provide totals.taxInclusiveAmount.');
    require(isNumber(inv.totals?.payableAmount), '/totals/payableAmount', 'ENG-REQ-11/BT-115',
      'Amount due for payment (BT-115) is missing.', 'Provide totals.payableAmount.');

    return out;
  },
};
