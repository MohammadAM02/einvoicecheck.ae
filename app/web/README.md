# einvoicecheck.ae — web service

Next.js 15 web application for the UAE e-invoice **preflight validation** API. Deploys to Railway.

## Positioning guardrail

Preflight validation only. Copy must never claim FTA accreditation, transmission of legal e-invoices, replacement of an accredited service provider, or statutory archival. The guardrail lives in `src/lib/site.ts`.

## Run

```bash
npm install
npm run dev
npm run test
npm run build
npm start
```

## Billing

PayPal is the only payment integration.

- Free signup provisions an API key with no checkout.
- Starter and Pro use PayPal Subscriptions.
- The server calls PayPal REST APIs directly; no payment SDK is installed.
- Subscription state is driven by verified PayPal webhooks at `/api/webhooks/paypal`.
- PayPal processes payments; einvoicecheck.ae remains the service provider and seller.

Required environment variables are documented in `.env.example`.

## Billing routes

| Route | Purpose |
|---|---|
| `/api/billing/checkout` | Start PayPal subscription approval |
| `/api/billing/change-plan` | Revise an existing PayPal subscription |
| `/api/billing/cancel` | Cancel an existing PayPal subscription |
| `/api/webhooks/paypal` | Verified PayPal subscription events |

## Waitlist store

`src/app/api/waitlist/route.ts` still uses `WAITLIST_STORE_PATH`. Railway container storage is ephemeral, so this remains temporary until moved to MongoDB.
