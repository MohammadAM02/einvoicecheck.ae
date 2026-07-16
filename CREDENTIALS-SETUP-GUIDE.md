# Credentials Setup Guide — proven-demand-api-v1

**Project:** `einvoicecheck.ae` — UAE e-invoice preflight validation API
**Billing provider:** **Dodo Payments** (Stripe is NOT used — see §2)
**Last updated:** 2026-07-14

---

## 0. The one rule

**Never paste a secret into a chat, a commit, or a doc — including this one.**
Secrets live in **Railway environment variables** only. Claude/agents need to know that a
credential *exists*, never what it *is*. Every value below is referenced by env var name.

If a secret is ever pasted somewhere it shouldn't be, rotate it immediately rather than deleting the message.

---

## 1. G2 checklist — status

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Domain + DNS access | ✅ Done | `einvoicecheck.ae`, DNS access confirmed |
| 2 | Railway project | ✅ Done | project `einvoicecheck.ae`, env `production`, CLI 5.26.1 authenticated |
| 3 | **Dodo Payments** | ⬜ Outstanding | test-mode key + webhook secret; individual KYC for live |
| 4 | Google Search Console | ⬜ Outstanding | needed for M1 sitemap submission |
| 5 | Support inbox | ⬜ Outstanding | needed for O1 (<5-min response loop, UTC+4) |

M1 (site) and E1 (API) are unblocked and built. **E2 (billing) is blocked on item 3.**

---

## 2. Why Dodo Payments, not Stripe

The founder is operating **initially as an individual in the UAE, without a registered company**.

Dodo Payments is a **Merchant of Record**: it onboards **individual merchants**, pays out to a
**personal bank account**, and is the seller of record (so it handles sales tax/VAT registration
and remittance on our behalf). It supports subscriptions, hosted checkout, a customer portal,
and webhooks — everything E2 needs.

**Stripe is not retained as a parallel integration.** It must not appear in any code, env var,
SDK, dependency, or doc. Q1's ship gate fails the build on any case-insensitive `stripe` match
inside `app/`.

> ⚠️ **Two things to verify yourself before relying on this** (business decisions, not code):
> 1. **Individual-merchant eligibility and UAE payout support** — confirm directly with Dodo during
>    signup that your specific situation (UAE individual, no trade licence) is accepted.
> 2. **KYC timeline.** Live mode requires approved individual KYC. This is the single most likely
>    thing to slip the Jul 25 launch date, because it depends on *their* review queue, not on us.
>    **Start KYC first, before writing any billing code** — it can run in parallel with E2.

---

## 3. Dodo Payments setup

### 3.1 Account + products
1. Sign up at <https://dodopayments.com> and select the **individual / sole proprietor** merchant type.
2. **Submit individual KYC immediately** (identity + personal bank account for payouts). Test mode
   works without it; **live mode does not**.
3. Create three **subscription products** (defaults — adjust to V1 price evidence, which showed a
   competitor at ~AED 1,470/yr ≈ $33/mo for 500 docs):
   - `Free trial` — trial period, 0-cost
   - `Starter` — **$29/mo**
   - `Pro` — **$99/mo**
4. Copy each **`product_id`** — E2 needs them (these are identifiers, not secrets, but keep them in env anyway).

### 3.2 API keys
- Dashboard → Developer → API keys. Generate a **test-mode** key now; generate the live key only
  after KYC approval.
- Base URLs: `https://test.dodopayments.com` (test) / `https://live.dodopayments.com` (live).
- The SDK selects this via `environment: 'test_mode' | 'live_mode'` — **not** by hand-writing URLs.

### 3.3 Webhooks
- Dashboard → Webhooks → add endpoint: `https://einvoicecheck.ae/api/webhooks/dodo`
- Copy the **webhook signing secret**.
- Dodo implements the **Standard Webhooks** spec. Verification is HMAC-SHA256 over
  `webhook-id . webhook-timestamp . raw_body`, delivered with headers `webhook-id`,
  `webhook-signature`, `webhook-timestamp`.
- **Use the SDK's `unwrap()`** to verify. Never `unsafe_unwrap()` in production.
- **`webhook-id` is the idempotency key** — persist it; drop replays.

Events E2 subscribes to:

| Event | Meaning |
|---|---|
| `subscription.active` | activated — provision/raise plan limits |
| `subscription.renewed` | renewal charged — extend period |
| `subscription.updated` | any field changed |
| `subscription.on_hold` | renewal/charge failed — **recoverable**, start dunning |
| `subscription.failed` | initial mandate failed — **terminal** |
| `payment.succeeded` | payment captured |
| `payment.failed` | payment failed |

### 3.4 ⚠️ Usage-based billing — read this
Dodo has **no Stripe-Meters-style metering primitive.** Do not go looking for one.

Our own API already meters every call (E1 writes a `UsageEvent` to MongoDB) — **that stays the
source of truth**. Overage is billed either by:
- **plan tiering** (simplest — cap by plan, upsell on limit), or
- **on-demand charge**: `POST /subscriptions/{subscription_id}/charge`.

E2 must not invent a Dodo metering API.

---

## 4. Environment variables

Set in **Railway** (`railway variables --set "KEY=value"`), never in git. `.env.example` documents
names only.

### API service (`app/api`)
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
MONGODB_URI=${{MongoDB.MONGO_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

### Web / dashboard service (`app/web`)
```
NEXT_PUBLIC_SITE_URL=https://einvoicecheck.ae
MONGODB_URI=${{MongoDB.MONGO_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# --- Dodo Payments ---
DODO_PAYMENTS_API_KEY=            # secret — test-mode key until KYC clears
DODO_PAYMENTS_WEBHOOK_KEY=        # secret — webhook signing secret
DODO_PAYMENTS_ENVIRONMENT=test_mode   # 'test_mode' | 'live_mode'  (defaults to test_mode)
DODO_PRODUCT_ID_STARTER=          # product_id for the $29 tier
DODO_PRODUCT_ID_PRO=              # product_id for the $99 tier
DODO_PRODUCT_ID_TRIAL=            # product_id for the free trial
DODO_RETURN_URL=https://einvoicecheck.ae/dashboard?checkout=success
```

> **Naming caveat, verify at wiring time:** Dodo's own docs are inconsistent about the webhook
> secret env var — the webhooks page uses `DODO_PAYMENTS_WEBHOOK_KEY` while the integration
> tutorial shows `DODO_WEBHOOK_KEY`. We standardise on **`DODO_PAYMENTS_WEBHOOK_KEY`** and read it
> explicitly in our own code, so the SDK's default never matters. Confirm against the dashboard.

**`DODO_PAYMENTS_ENVIRONMENT` must default to `test_mode`.** Flipping it to `live_mode` is a
G3 action, gated on KYC approval.

---

## 5. Google Search Console (outstanding)
You have DNS access, so use the **DNS TXT** verification method for the whole domain.
1. <https://search.google.com/search-console> → Add property → **Domain** → `einvoicecheck.ae`
2. Add the TXT record it gives you at your DNS provider; verify.
3. Submit `https://einvoicecheck.ae/sitemap.xml`.
Full steps: `handoffs/M1/gsc_submission.md`.

## 6. Support inbox (outstanding)
Needed for **O1**'s <5-minute response loop (waking hours, UTC+4).
Provide the address (e.g. `support@einvoicecheck.ae`) and pipe it to an instant phone alert.

---

## 7. Deploy order

1. **E1 API** → `handoffs/E1/DEPLOY.md` (`railway up`, add Mongo + Redis, seed a demo key, smoke test).
2. **M1 site** → `handoffs/M1/live_url.txt` (`railway up`, point DNS at Railway).
3. **GSC** → verify + submit sitemap.
4. **E2 billing** → only after the Dodo test-mode key exists.
5. **G3 launch** → flip `DODO_PAYMENTS_ENVIRONMENT=live_mode` + DNS cutover. **Requires approved KYC.**
