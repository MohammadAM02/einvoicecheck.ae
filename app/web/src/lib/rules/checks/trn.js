import { err, warn } from '../error.js';

/**
 * UAE Tax Registration Number (TRN) checks.
 *
 * The FTA VAT TRN is a 15-digit numeric identifier (BT-31 seller / BT-48 buyer
 * tax registration identifier in PINT AE). Note: the Peppol *participant*
 * identifier uses the first 10 digits (the corporate-tax TIN); this preflight
 * validates the full 15-digit VAT TRN carried on the tax invoice.
 *
 * Cites: UAE E-Invoicing Guidelines v1.1; PINT AE BT-31 / BT-48;
 * FTA VAT TRN = 15 digits.
 */
const TRN_RE = /^\d{15}$/;

export const trnRule = {
  id: 'ENG-TRN-01',
  spec: 'BT-31 / BT-48 (PINT AE); FTA 15-digit TRN',
  description: 'Seller TRN mandatory and 15 numeric digits; buyer TRN 15 digits when present.',
  evaluate(inv) {
    const out = [];
    const sellerTrn = inv.supplier?.trn;
    if (!sellerTrn) {
      out.push(
        err(
          '/supplier/trn',
          'ENG-TRN-01/BT-31',
          'Seller Tax Registration Number (BT-31) is missing.',
          'Provide the 15-digit FTA VAT TRN of the supplier.'
        )
      );
    } else if (!TRN_RE.test(String(sellerTrn).trim())) {
      out.push(
        err(
          '/supplier/trn',
          'ENG-TRN-02/BT-31',
          `Seller TRN "${sellerTrn}" is not a valid 15-digit UAE TRN.`,
          'A UAE FTA VAT TRN is exactly 15 numeric digits (no spaces or letters).'
        )
      );
    }

    const buyerTrn = inv.customer?.trn;
    if (!buyerTrn) {
      out.push(
        warn(
          '/customer/trn',
          'ENG-TRN-03/BT-48',
          'Buyer Tax Registration Number (BT-48) is absent.',
          'For a B2B tax invoice, include the buyer 15-digit TRN. Omit only for B2C.'
        )
      );
    } else if (!TRN_RE.test(String(buyerTrn).trim())) {
      out.push(
        err(
          '/customer/trn',
          'ENG-TRN-04/BT-48',
          `Buyer TRN "${buyerTrn}" is not a valid 15-digit UAE TRN.`,
          'A UAE FTA VAT TRN is exactly 15 numeric digits.'
        )
      );
    }
    return out;
  },
};
