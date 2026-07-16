import DodoPayments from 'dodopayments';

/**
 * Dodo Payments client (our Merchant of Record). Everything is env-driven:
 * drop DODO_PAYMENTS_API_KEY into Railway and this works with zero code change.
 *
 * `environment` DEFAULTS TO test_mode. Flipping it to live_mode is a deliberate
 * launch-gate action and requires approved individual KYC.
 */
export type DodoEnvironment = 'test_mode' | 'live_mode';

export function dodoEnvironment(): DodoEnvironment {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY);
}

export class BillingNotConfiguredError extends Error {
  status = 503;
  constructor() {
    super(
      'Billing is not configured yet: DODO_PAYMENTS_API_KEY is unset. See handoffs/E2/DODO_SETUP.md.',
    );
  }
}

let cached: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!isBillingConfigured()) throw new BillingNotConfiguredError();
  cached ??= new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: dodoEnvironment(),
  });
  return cached;
}

/** Tests only — drop the memoised client between cases. */
export function resetDodoClient(): void {
  cached = null;
}

/** Where Dodo sends the customer back to after checkout / portal / dunning. */
export function returnUrl(suffix = ''): string {
  const base =
    process.env.DODO_RETURN_URL ??
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://einvoicecheck.ae').replace(/\/$/, '')}/dashboard?checkout=success`;
  return suffix ? `${base}${base.includes('?') ? '&' : '?'}${suffix}` : base;
}
