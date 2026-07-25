export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://einvoicecheck.ae'
).replace(/\/$/, '');

export const SITE_NAME = 'einvoicecheck.ae';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.einvoicecheck.ae';

/**
 * The single sentence that must survive every copy edit.
 * Preflight validation only: no FTA accreditation, no transmission, no ASP
 * replacement, no statutory archival.
 */
export const GUARDRAIL =
  'einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival.';

export const PRICING = {
  trial: {
    name: 'Free trial',
    price: 0,
    priceLabel: '$0',
    cadence: 'for 14 days',
    docs: '100 validations',
    blurb: 'Enough to wire the API into one CI pipeline and see your real error list.',
  },
  starter: {
    name: 'Starter',
    price: 29,
    priceLabel: '$29',
    cadence: 'per month',
    docs: '2,000 validations / month',
    blurb: 'For one finance system or ERP export you need to keep clean before it reaches your ASP.',
  },
  growth: {
    name: 'Growth',
    price: 99,
    priceLabel: '$99',
    cadence: 'per month',
    docs: '15,000 validations / month',
    blurb: 'For teams validating every invoice in CI across several entities or clients.',
  },
} as const;

/**
 * Real-world facts that are NOT yet known or provisioned.
 *
 * RULE: never fabricate any of these. The operator is an individual in the UAE
 * with no registered company and no trade licence. Every unknown must render as
 * a visible [OPERATOR TO COMPLETE: ...] placeholder until the operator fills it
 * in. A placeholder is correct. A fabrication is a compliance failure.
 * Tracked in handoffs/M1/legal_review_notes.md.
 */
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

/** Merchant of record. We do not take card payments directly - Dodo Payments does. */
export const MERCHANT_OF_RECORD = {
  name: 'Dodo Payments',
  url: 'https://dodopayments.com',
} as const;

/** Reserved for M2 (comparison pages) and GR1 (free tool). Keep slugs in sync. */
export const COMPETITOR_SLUGS = ['cleartax', 'comarch', 'sovos'] as const;
export const TOOL_SLUGS = ['uae-e-invoice-validator', 'pint-ae-validator', 'trn-format-checker'] as const;

export type CompetitorSlug = (typeof COMPETITOR_SLUGS)[number];
export type ToolSlug = (typeof TOOL_SLUGS)[number];
