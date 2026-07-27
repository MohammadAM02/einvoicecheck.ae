const VALID_INVOICE = {
  invoiceType: '388',
  invoiceNumber: 'INV-2026-0001',
  issueDate: '2026-07-14',
  currency: 'AED',
  supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
  customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
  lines: [
    { id: '1', quantity: 10, unitPrice: 50, lineExtensionAmount: 500, taxCategory: { code: 'S', rate: 5 }, itemName: 'Widget A' },
  ],
  taxSubtotals: [
    { taxableAmount: 500, taxAmount: 25, category: { code: 'S', rate: 5 } },
  ],
  totals: {
    lineExtensionAmount: 500,
    taxExclusiveAmount: 500,
    taxAmount: 25,
    taxInclusiveAmount: 525,
    payableAmount: 525,
  },
};

const BROKEN_INVOICE = {
  ...VALID_INVOICE,
  invoiceNumber: 'INV-2026-0002',
  supplier: { trn: '12345', name: 'Falcon Trading LLC' },
  lines: [
    { id: '1', quantity: 10, unitPrice: 50, lineExtensionAmount: 999, taxCategory: { code: 'S', rate: 8 }, itemName: 'Widget A' },
  ],
  totals: {
    lineExtensionAmount: 500,
    taxExclusiveAmount: 500,
    taxAmount: 25,
    taxInclusiveAmount: 700,
    payableAmount: 700,
  },
};

export const VALID_JSON_SAMPLE = JSON.stringify(VALID_INVOICE, null, 2);
export const BROKEN_JSON_SAMPLE = JSON.stringify(BROKEN_INVOICE, null, 2);
