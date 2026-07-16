# E2 — Billing test report (Dodo Payments)

**Date:** 2026-07-14 · **Step:** E2 (dashboard + billing) · **Provider:** Dodo Payments (merchant of record)

---

## ⚠️ Read this before quoting any number below

**These tests ran against a MOCKED `dodopayments` SDK, not against Dodo Payments.**
There are **no Dodo credentials in this environment** — no API key, no webhook secret, no product
IDs, and no live Mongo/Redis/API. Nothing here touched Dodo's servers. No test-mode transaction was
performed, and none is claimed.

**A real test-mode end-to-end against Dodo is still OUTSTANDING and must be run by the operator**
once credentials exist (`handoffs/E2/DODO_SETUP.md` has the exact steps and commands).

### What these tests DO prove
- Our code calls the correct Dodo SDK surface with the correct arguments (asserted call-by-call).
- Product IDs are read from env and are **never** hardcoded (removing an env var makes checkout fail loudly).
- The client **defaults to `test_mode`** and only goes live on an explicit `live_mode`.
- Our webhook route reads the **raw body**, verifies via the SDK's `unwrap()`, and **rejects** a bad
  signature or a tampered body.
- Idempotency: replaying the same `webhook-id` produces **exactly one** state change.
- Plan → rate-limit propagation lands at the exact Redis key `app/api` reads, in a blob `app/api`'s
  own parser accepts (the API-side test asserts the resulting **429**).

### What they DO NOT prove (blocked on credentials)
- That Dodo's **real** signature scheme matches our verifier end-to-end. The mock reimplements
  Standard Webhooks HMAC-SHA256 faithfully (`webhook-id . webhook-timestamp . raw_body`), but a
  reimplementation is not the real SDK verifier and not a real delivery.
- That a **real checkout_url** is issued, a card is charged, or a subscription is created.
- That our product/price mapping matches products that do not yet exist in the Dodo dashboard.
- Behaviour of Dodo's real retry/dunning timing.

---

## Test run 1 — `app/web` (dashboard + billing) · 33/33 passed

Command: `cd app/web && npx vitest run` · Vitest 4.1.10 · mongodb-memory-server + ioredis-mock +
mocked `dodopayments`.

```
 Test Files  3 passed (3)
      Tests  33 passed (33)
   Duration  9.03s
```

| # | Test case | Area | Result |
|---|---|---|---|
| 1 | Signup creates account, mints one key, returns raw key exactly once (`pdk_live_<32hex>`), sets session cookie | Onboarding | ✅ pass |
| 2 | Key stored **SHA-256 hashed only**; raw value absent from the stored doc; prefix retained for display | Onboarding | ✅ pass |
| 3 | Signup publishes the **trial** rate limit to shared Redis for the new key | Rate limits | ✅ pass |
| 4 | Duplicate email → 409; password < 10 chars → 400 | Onboarding | ✅ pass |
| 5 | Login accepts the right password, rejects the wrong one | Auth | ✅ pass |
| 6 | Key CRUD through the routes: create → list → revoke; raw key never appears in the list | Keys | ✅ pass |
| 7 | Revoking a key deletes its published rate limit from Redis | Keys | ✅ pass |
| 8 | Revoking twice → 404 | Keys | ✅ pass |
| 9 | Key routes require a session → 401 | Auth | ✅ pass |
| 10 | Dodo client **defaults to `test_mode`** (unset or unrecognised env), `live_mode` only when explicit | Config | ✅ pass |
| 11 | Checkout calls `checkoutSessions.create()` with the **env-sourced** `product_id`, `return_url`, `metadata.user_id`; returns `checkout_url` | Checkout | ✅ pass |
| 12 | Trial checkout sends `subscription_data.trial_period_days` | Checkout | ✅ pass |
| 13 | Unknown plan → 400 | Checkout | ✅ pass |
| 14 | Missing `DODO_PRODUCT_ID_PRO` → 500 naming the env var (**never hardcodes an ID**) | Checkout | ✅ pass |
| 15 | **SUBSCRIBE → UPGRADE → CANCEL state machine** (see below) | Lifecycle | ✅ pass |
| 16 | Customer portal via `customers.customerPortal.create(customerId)` → uses `.link` | Portal | ✅ pass |
| 17 | Portal without a billing customer → 409 | Portal | ✅ pass |
| 18 | Dunning: on_hold → `updatePaymentMethod(id, { type: 'new', return_url })` | Dunning | ✅ pass |
| 19 | Plan limits written at `plan:limits:<keyId>`; parsed by **app/api's own parser**; downgrade rewrites it | Rate limits | ✅ pass |
| 20 | Usage aggregated from Mongo `UsageEvent` into a 30-day series + outcome + quota view | Usage | ✅ pass |
| 21 | Overage → on-demand `subscriptions.charge()` (no invented Dodo meter) | Usage billing | ✅ pass |
| 22 | **Webhook: correctly-signed payload accepted** (200, handled) | Webhook | ✅ pass |
| 23 | **Webhook: BAD SIGNATURE REJECTED — 401, zero state change, event not even recorded** | Webhook | ✅ pass |
| 24 | **Webhook: body tampered after signing → 401** (proves the raw body is what's verified) | Webhook | ✅ pass |
| 25 | Webhook without a `webhook-id` header → 400 | Webhook | ✅ pass |
| 26 | **Webhook REPLAY: same `webhook-id` twice → second is deduped, exactly ONE state change, one ledger row** | Idempotency | ✅ pass |
| 27 | **Replay of an older delivery after a newer one does NOT roll state backwards** (active → cancelled → replay(active) stays cancelled) | Idempotency | ✅ pass |
| 28 | `subscription.active` → status active, plan from product_id, ids + period stored, Redis limits raised | Event | ✅ pass |
| 29 | `subscription.renewed` → stays active, period extended | Event | ✅ pass |
| 30 | `subscription.updated` (upgrade to Pro) → plan + Redis limits follow the product_id | Event | ✅ pass |
| 31 | `subscription.on_hold` → status on_hold, entitlements drop to trial (recoverable) | Event | ✅ pass |
| 32 | `subscription.failed` → status failed, entitlements drop to trial (terminal) | Event | ✅ pass |
| 33 | `payment.succeeded` → recorded | Event | ✅ pass |
| 34 | `payment.failed` → recorded | Event | ✅ pass |
| 35 | Unhandled event type → 200 acknowledged, no state change | Event | ✅ pass |

(35 assertions across 33 test cases — cases 33/34 and 22 share files.)

### The subscribe → upgrade → cancel state machine (test #15), step by step

| Step | Action | Expected | Observed |
|---|---|---|---|
| 0 | signup | plan `trial`, Redis limit 10 rpm | ✅ |
| 1 | `POST /api/billing/checkout {plan: starter}` → `subscription.active` webhook | plan `starter`, status `active`, Redis limit 60 rpm | ✅ |
| 2 | `POST /api/billing/change-plan {plan: pro, proration: prorated_immediately}` → `subscription.updated` | `changePlan()` called with `product_id` = `$DODO_PRODUCT_ID_PRO` + **explicit** `proration_billing_mode`; plan `pro`, Redis limit 300 rpm | ✅ |
| 3 | `POST /api/billing/cancel` → `subscription.updated {status: cancelled}` | `subscriptions.update(cancel_at_next_billing_date: true)`; status `cancelled`, plan back to `trial`, Redis limit 10 rpm | ✅ |

---

## Test run 2 — `app/api` (interop: does an over-plan call actually 429?) · 19/19 passed

Command: `cd app/api && npx vitest run` · Vitest 2.1.9.

```
 Test Files  6 passed (6)
      Tests  19 passed (19)
   Duration  13.77s
```

| Test case | Result |
|---|---|
| **`planLimit.test.js`** — publish `{plan: trial, rateLimitPerMinute: 2}` at `plan:limits:<keyId>` (the exact blob app/web writes) → 3rd call in the window returns **429 `rate_limited`**, and `x-ratelimit-limit: 2` (plan limit beats the global default of 60) | ✅ pass |
| 18 pre-existing E1 tests (engine, validate, usage, health, rate limit) still pass after the limiter change | ✅ pass |

This is the plan-gating proof: the dashboard writes the limit, the API enforces it.

---

## Build

`cd app/web && npm run build` → **exit 0**, 22 static pages + 12 dynamic routes. Full output in
`handoffs/E2/build_report.md`.

## Ship-gate checks (Q1)

| Check | Command | Result |
|---|---|---|
| No `stripe` anywhere (case-insensitive) in `app/` source, `package.json`, `.env*` | `grep -rin stripe app --exclude-dir=node_modules --exclude-dir=.next` | **0 hits** |
| No `stripe` in either lockfile | `grep -ic stripe app/*/package-lock.json` | **0, 0** |
| Unverified/unsafe webhook unwrap absent from all production paths | `grep -rin "unsafe_unwrap\|unsafeUnwrap" app/*/src` | **0 hits** (the mock in `test/` deliberately does not implement it either) |

---

## Outstanding — operator must do this before launch

1. Create the 3 products in the Dodo dashboard and set `DODO_PRODUCT_ID_{TRIAL,STARTER,PRO}`.
2. Generate a **test-mode** API key → `DODO_PAYMENTS_API_KEY`.
3. Register `https://einvoicecheck.ae/api/webhooks/dodo` → `DODO_PAYMENTS_WEBHOOK_KEY`.
4. **Run the real test-mode E2E** (checkout with a Dodo test card, upgrade, cancel, replay a webhook
   from the dashboard's delivery log) and append the result to this file. Until that is done,
   **billing is unproven against the real provider.**

---

## Appendix A — raw `app/web` test output (unedited)

```

 RUN  v4.1.10 F:/Administrator/Downloads/Proven-Demand API Sprint/app/web

 ✓ test/auth-keys.test.ts > signup auto-provisions an API key > creates the account, mints one key, and returns the raw key exactly once 555ms
 ✓ test/billing.test.ts > Dodo client configuration > defaults to test_mode when DODO_PAYMENTS_ENVIRONMENT is unset 554ms
 ✓ test/billing.test.ts > checkout > creates a checkout session with the env-sourced product id and returns checkout_url 167ms
 ✓ test/auth-keys.test.ts > signup auto-provisions an API key > publishes the trial rate limit to shared Redis for the new key 143ms
 ✓ test/auth-keys.test.ts > signup auto-provisions an API key > rejects a duplicate email and a weak password 83ms
 ✓ test/webhooks.test.ts > webhook signature verification (Standard Webhooks, via SDK unwrap) > accepts a correctly signed payload 808ms
 ✓ test/billing.test.ts > checkout > sends trial_period_days for the free trial product 79ms
 ✓ test/billing.test.ts > checkout > rejects an unknown plan 103ms
 ✓ test/auth-keys.test.ts > signup auto-provisions an API key > logs in with the right password and refuses the wrong one 274ms
 ✓ test/billing.test.ts > checkout > fails loudly if the product id env var is missing (never hardcodes one) 117ms
 ✓ test/webhooks.test.ts > webhook signature verification (Standard Webhooks, via SDK unwrap) > REJECTS a bad signature with 401 and changes no state 372ms
 ✓ test/billing.test.ts > subscribe → upgrade → cancel state machine > walks the full lifecycle and keeps Redis limits in step 132ms
 ✓ test/auth-keys.test.ts > API key CRUD > creates, lists and revokes keys through the route handlers 235ms
 ✓ test/billing.test.ts > customer portal + dunning recovery > opens the customer portal via customers.customerPortal.create(...).link 101ms
 ✓ test/webhooks.test.ts > webhook signature verification (Standard Webhooks, via SDK unwrap) > rejects a payload whose body was tampered with after signing 105ms
 ✓ test/billing.test.ts > customer portal + dunning recovery > 409s the portal when there is no billing customer yet 140ms
 ✓ test/auth-keys.test.ts > API key CRUD > refuses to revoke twice 148ms
 ✓ test/auth-keys.test.ts > API key CRUD > requires a session 14ms
 ✓ test/webhooks.test.ts > webhook signature verification (Standard Webhooks, via SDK unwrap) > rejects a delivery with no webhook-id header 128ms
 ✓ test/billing.test.ts > customer portal + dunning recovery > on_hold → updatePaymentMethod(id, { type: new, return_url }) 208ms
 ✓ test/webhooks.test.ts > webhook idempotency (webhook-id is the key) > applies the same delivery exactly once when replayed 210ms
 ✓ test/billing.test.ts > plan → rate limit propagation (the contract app/api reads) > writes a blob at the exact Redis key app/api reads, and app/api can parse it 184ms
 ✓ test/webhooks.test.ts > webhook idempotency (webhook-id is the key) > a replay after a later event does not roll state backwards 186ms
 ✓ test/billing.test.ts > usage (Mongo UsageEvent is the source of truth) > aggregates metering events into a daily series and a quota view 231ms
 ✓ test/webhooks.test.ts > the 7 handled events > subscription.active → active + plan entitlements + Redis limits 170ms
 ✓ test/billing.test.ts > usage (Mongo UsageEvent is the source of truth) > flags overage above the plan quota (billed as an on-demand charge, not a Dodo meter) 171ms
 ✓ test/webhooks.test.ts > the 7 handled events > subscription.renewed → stays active, period extended 157ms
 ✓ test/webhooks.test.ts > the 7 handled events > subscription.updated (upgrade to pro) → plan + limits follow the product id 180ms
 ✓ test/webhooks.test.ts > the 7 handled events > subscription.on_hold → recoverable, entitlements drop to trial 256ms
 ✓ test/webhooks.test.ts > the 7 handled events > subscription.failed → terminal, entitlements drop to trial 159ms
 ✓ test/webhooks.test.ts > the 7 handled events > payment.succeeded → recorded 172ms
 ✓ test/webhooks.test.ts > the 7 handled events > payment.failed → recorded 129ms
 ✓ test/webhooks.test.ts > the 7 handled events > an unhandled event type is acknowledged but changes nothing 101ms

 Test Files  3 passed (3)
      Tests  33 passed (33)
   Start at  22:47:44
   Duration  9.03s (transform 1.10s, setup 172ms, import 8.54s, tests 15.29s, environment 0ms)

```

## Appendix B — raw `app/api` test output (unedited)

```

 RUN  v2.1.9 F:/Administrator/Downloads/Proven-Demand API Sprint/app/api

 ✓ test/validate.test.js > POST /v1/validate > 401 when the API key header is missing
 ✓ test/validate.test.js > POST /v1/validate > 401 when the API key is invalid
 ✓ test/validate.test.js > POST /v1/validate > accepts a Bearer token form of the key
 ✓ test/validate.test.js > POST /v1/validate > happy path: valid invoice -> 200, valid:true, no errors
 ✓ test/validate.test.js > POST /v1/validate > failure path: deliberately broken invoice -> 200, valid:false, cited errors
 ✓ test/validate.test.js > POST /v1/validate > accepts UBL 2.1 / PINT AE XML via application/xml
 ✓ test/engine.test.js > rule engine (unit, no I/O) > accepts a fully valid AED tax invoice
 ✓ test/engine.test.js > rule engine (unit, no I/O) > is deterministic — identical input yields identical output
 ✓ test/engine.test.js > rule engine (unit, no I/O) > flags TRN, VAT rate, line arithmetic and total mismatches on a broken invoice
 ✓ test/engine.test.js > rule engine (unit, no I/O) > every error object carries the normalized shape {path, rule, severity, message, fix}
 ✓ test/engine.test.js > rule engine (unit, no I/O) > parses and validates UBL 2.1 / PINT AE XML input
 ✓ test/engine.test.js > rule engine (unit, no I/O) > returns a single structural error for unparseable input
 ✓ test/engine.test.js > rule engine (unit, no I/O) > requires AED tax accounting currency for a foreign-currency invoice
 ✓ test/planLimit.test.js > plan-gated rate limits published by the dashboard > honours the published plan limit over the global default and 429s above it
 ✓ test/usage.test.js > GET /usage > 401 without an API key
 ✓ test/usage.test.js > GET /usage > reports metering events written by /v1/validate 583ms
 ✓ test/rateLimit.test.js > per-key rate limiting (Redis sliding window) > allows requests up to the limit, then returns 429
 ✓ test/health.test.js > GET /health > returns 200 and reports Mongo + Redis up
 ✓ test/health.test.js > GET /health > does not require authentication

 Test Files  6 passed (6)
      Tests  19 passed (19)
   Start at  22:48:06
   Duration  13.77s (transform 278ms, setup 0ms, collect 4.63s, tests 8.44s, environment 0ms, prepare 353ms)

```
