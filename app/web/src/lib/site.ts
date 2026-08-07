export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://einvoicecheck.ae').replace(/\/$/, '');
export const SITE_NAME = 'einvoicecheck.ae';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.einvoicecheck.ae';

export const GUARDRAIL =
  'einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival.';

export const PRICING = {
  trial: { name: 'Free trial', price: 0, priceLabel: '$0', cadence: 'no card required', docs: '100 validations', blurb: 'Enough to wire the API into one CI pipeline and see your real error list.' },
  starter: { name: 'Starter', price: 29, priceLabel: '$29', cadence: 'per month', docs: '2,000 validations / month', blurb: 'For one finance system or ERP export you need to keep clean before it reaches your ASP.' },
  pro: { name: 'Pro', price: 99, priceLabel: '$99', cadence: 'per month', docs: '15,000 validations / month', blurb: 'For teams validating every invoice in CI across several entities or clients.' },
} as const;

export const TODO = {
  operatorLegalName: '[OPERATOR TO COMPLETE: legal name of operator (individual / sole proprietor)]',
  operatorEmirate: '[OPERATOR TO COMPLETE: UAE emirate of residence]',
  supportEmail: '[OPERATOR TO COMPLETE: support email address - not yet provisioned]',
  contactName: '[OPERATOR TO COMPLETE: name of the point of contact]',
  supportSla: '[OPERATOR TO COMPLETE: support response-time commitment]',
  payloadRetention: '[OPERATOR TO COMPLETE: retention period for submitted invoice payloads]',
  logRetention: '[OPERATOR TO COMPLETE: retention period for request logs and metering events]',
  legalEffectiveDate: '[OPERATOR TO COMPLETE: effective date of these terms]',
  governingLawEmirate: '[OPERATOR TO COMPLETE: governing law / courts (emirate) - confirm with counsel]',
} as const;

export const PAYMENT_PROCESSOR = { name: 'PayPal', url: 'https://www.paypal.com' } as const;
export const COMPETITOR_SLUGS = ['cleartax', 'comarch', 'sovos'] as const;
export const TOOL_SLUGS = ['uae-e-invoice-validator', 'pint-ae-validator', 'trn-format-checker', 'xml-repairer', 'xml-generator'] as const;
export type CompetitorSlug = (typeof COMPETITOR_SLUGS)[number];
export type ToolSlug = (typeof TOOL_SLUGS)[number];
