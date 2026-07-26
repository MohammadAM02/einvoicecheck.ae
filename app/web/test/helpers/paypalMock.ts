import { vi } from 'vitest';

export type PayPalCall = { url: string; method: string; headers: Headers; body: unknown };
export const paypalCalls: PayPalCall[] = [];
let verificationStatus: 'SUCCESS' | 'FAILURE' = 'SUCCESS';

export function resetPayPalCalls(): void { paypalCalls.length = 0; verificationStatus = 'SUCCESS'; }
export function setPayPalVerificationStatus(status: 'SUCCESS' | 'FAILURE'): void { verificationStatus = status; }
export function callsTo(path: string): PayPalCall[] { return paypalCalls.filter((call) => call.url.includes(path)); }

function parseBody(init?: RequestInit): unknown {
  if (typeof init?.body !== 'string') return init?.body ?? null;
  if (init.body === 'grant_type=client_credentials') return init.body;
  try { return JSON.parse(init.body); } catch { return init.body; }
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export function installPayPalFetchMock(): void {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    paypalCalls.push({ url, method, headers: new Headers(init?.headers), body: parseBody(init) });

    if (url.endsWith('/v1/oauth2/token')) return json({ access_token: 'paypal_access_token_mock', expires_in: 3600 });
    if (url.endsWith('/v1/notifications/verify-webhook-signature')) return json({ verification_status: verificationStatus });
    if (url.endsWith('/v1/billing/subscriptions') && method === 'POST') {
      return json({ id: 'I-PAYPAL-MOCK', status: 'APPROVAL_PENDING', links: [{ href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=mock', rel: 'approve', method: 'GET' }] }, 201);
    }
    if (url.includes('/v1/billing/subscriptions/') && url.endsWith('/revise')) {
      return json({ id: 'I-PAYPAL-MOCK', status: 'ACTIVE', links: [{ href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=revise', rel: 'approve', method: 'GET' }] });
    }
    if (url.includes('/v1/billing/subscriptions/') && url.endsWith('/cancel')) return new Response(null, { status: 204 });
    return json({ message: `Unhandled PayPal mock request: ${method} ${url}` }, 500);
  }));
}
