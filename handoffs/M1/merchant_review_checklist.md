# Dodo Payments merchant review (G2B) — self-check

**Workflow:** proven-demand-api-v1 · **Step:** M1b · **Date:** 2026-07-14

Dodo performs a live review of the real website before approving live mode. All nine required sections exist and are reachable. Paths are relative to the deployed site root (no live URL exists yet — nothing has been deployed and none is fabricated here).

| # | Required section | URL that satisfies it | What is there |
|---|---|---|---|
| 1 | **Product explanation** — what it does, plainly | `/` (hero + "One POST. Every error, with the fix." + live request/response sample), also `/docs` | Preflight validation API for UAE PINT AE / UBL 2.1 e-invoices. Plain-language hero, a real curl example, a real JSON error response. |
| 2 | **Target users** — who it is for | `/` → "Who it is for" section | Three named segments: UAE ERP integrators; finance & accounting software vendors; in-house finance engineering teams. |
| 3 | **How it works** — concrete flow | `/` → "How it works" (3 numbered steps), expanded at `/docs` | POST an invoice (JSON, envelope, or UBL/PINT AE XML) → get normalized field-level errors with path, rule id, severity and a suggested fix → fix it before your accredited provider rejects it. |
| 4 | **Pricing** | `/pricing` (also summarised on `/`) | Free trial (100 validations) / $29 per month / $99 per month, published on the page with no sales call. Includes the competitor price benchmark (a visible entrant charges ~AED 1,470/yr ≈ $33/mo for 500 docs). **Explicitly states billing is not live yet and no card details are collected.** |
| 5 | **Early-access CTA** — clear, working | `/waitlist` (form posts to `/api/waitlist`); CTA repeated in the header, on `/`, and on `/pricing` | Working email capture. No card, no payment step. |
| 6 | **Contact details** | `/contact` | Support channel, billing channel (routed to Dodo as MoR), privacy/data-request channel, and pre-launch channel. Operator identity and point of contact are rendered as visible `[OPERATOR TO COMPLETE: ...]` placeholders — **these must be filled before submitting to Dodo.** |
| 7 | **Terms of Service** | `/legal/terms` | Names Dodo Payments as merchant of record and seller of record; states we never handle card data; states billing is not live; states the product guardrail; disclaims warranties; limits liability. |
| 8 | **Privacy Policy** | `/legal/privacy` | Truthful data-flow description: invoice payloads received for validation (may contain PII), API-key **hashes** and usage-metering events in MongoDB, rate-limit counters in Redis. Card data is explicitly held by Dodo, not us. Retention periods are placeholders — not invented. |
| 9 | **Refund Policy** | `/legal/refunds` | Dodo executes refunds as MoR. 14-day full refund on first payment; duplicate charges always refunded; pro-rata on outage or discontinuation; renewals not refunded by default. Flags that it has not yet been reconciled with Dodo's own MoR terms. |

**Footer (present on every page via `SiteFooter`)** links: Contact, Terms of Service, Privacy Policy, Refund Policy — plus the guardrail sentence and a line naming Dodo Payments as merchant of record. All four new routes are in `/sitemap.xml`.

## Blockers to clear BEFORE submitting to Dodo

1. Provision the support email address and fill `TODO.supportEmail` in `app/web/src/lib/site.ts`.
2. Fill the operator legal name, point of contact and emirate. The identity you give Dodo must match `/legal/terms` §1 exactly.
3. Decide the data retention periods (invoice payloads, logs/metering, waitlist emails) and fill them in.
4. Set the effective date on the three legal pages.
5. Read Dodo's merchant-of-record terms and reconcile `/legal/refunds` against them.
6. Deploy. Dodo reviews the live site; nothing is deployed yet.

Full detail: `handoffs/M1/legal_review_notes.md`.
