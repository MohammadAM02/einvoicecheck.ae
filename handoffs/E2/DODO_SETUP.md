# E2 — Dodo Payments setup (operator runbook)

**Everything in `app/web` is built and tested, but billing is INERT until you do the steps below.**
No Dodo credential exists in the repo or in this session. With the env vars set, the code works with
**zero code changes** — nothing is hardcoded.

Billing provider is **Dodo Payments** (merchant of record) — the only one. No other processor is
integrated or retained as a fallback; the Q1 ship gate fails the build on any trace of one.

Time: ~30 minutes, plus Dodo's KYC review queue (which is the real launch risk — start it first).

---

## Step 1 — Account + KYC (do this before anything else)

1. Sign up at <https://dodopayments.com>, choosing the **individual / sole proprietor** merchant type.
2. Submit **individual KYC** immediately (ID + personal bank account for payouts).
   - **Test mode works without KYC.** Live mode does not.
   - Confirm with Dodo directly that a **UAE individual with no trade licence** is accepted, and that
     they pay out to a UAE personal bank account. This is a business fact we cannot verify for you.

## Step 2 — Create the 3 products

Dashboard → **Products** → New product, **type: Subscription**, three times:

| Product | Price | Billing | Notes |
|---|---|---|---|
| **Free trial** | $0 | monthly | The app sends `trial_period_days: 14` at checkout |
| **Starter** | **$29** | monthly | 2,000 validations/mo, 60 req/min |
| **Pro** | **$99** | monthly | 15,000 validations/mo, 300 req/min |

Quotas and rate limits are enforced by **us**, not by Dodo — they live in
`app/api/src/config/plans.js` + `app/web/src/lib/plans.ts` (keep those two in sync).

Copy each **`product_id`** (looks like `pdt_...`). You need all three.

## Step 3 — Test-mode API key

Dashboard → **Developer → API keys** → generate a **test-mode** key. Copy it once.
(Generate the live key only after KYC is approved — that is a G3 action.)

## Step 4 — Register the webhook endpoint

Dashboard → **Webhooks** → Add endpoint:

```
https://einvoicecheck.ae/api/webhooks/dodo
```

Subscribe it to these 7 events (the handler implements exactly these):

```
subscription.active     subscription.renewed    subscription.updated
subscription.on_hold    subscription.failed
payment.succeeded       payment.failed
```

Copy the **webhook signing secret** (`whsec_...`).

> The endpoint verifies every delivery with the SDK's `unwrap()` (Standard Webhooks, HMAC-SHA256 over
> `webhook-id . webhook-timestamp . raw_body`). An unsigned or wrongly-signed delivery gets a **401**
> and changes nothing. `webhook-id` is the idempotency key: replays are dropped.

## Step 5 — Set the env vars in Railway

In the **web** service (project `einvoicecheck.ae`, env `production`):

```bash
railway variables --set "DODO_PAYMENTS_API_KEY=<test-mode key from step 3>"
railway variables --set "DODO_PAYMENTS_WEBHOOK_KEY=<whsec_... from step 4>"
railway variables --set "DODO_PAYMENTS_ENVIRONMENT=test_mode"
railway variables --set "DODO_PRODUCT_ID_TRIAL=<pdt_... free trial>"
railway variables --set "DODO_PRODUCT_ID_STARTER=<pdt_... $29>"
railway variables --set "DODO_PRODUCT_ID_PRO=<pdt_... $99>"
railway variables --set "DODO_RETURN_URL=https://einvoicecheck.ae/dashboard?checkout=success"

# Datastores — the SAME Mongo + Redis the API service uses (shared by design).
railway variables --set 'MONGODB_URI=${{MongoDB.MONGO_URL}}'
railway variables --set 'REDIS_URL=${{Redis.REDIS_URL}}'

# Session signing for the dashboard. Required in production.
railway variables --set "AUTH_SECRET=$(openssl rand -hex 32)"
```

Then redeploy: `railway up`.

**Do not set `DODO_PAYMENTS_ENVIRONMENT=live_mode` yet.** The code defaults to `test_mode`, and going
live is gated on approved KYC (G3).

Sanity check the wiring (no secrets printed):

```bash
railway variables | grep -E 'DODO_|AUTH_SECRET|MONGODB_URI|REDIS_URL' | sed 's/=.*/=<set>/'
```

---

## Step 6 — Run the REAL test-mode E2E (this is still OUTSTANDING)

Everything shipped so far was tested against a **mocked** Dodo SDK. The following has **never been
run against Dodo** and must be, by you, before launch. Do it in test mode.

Use a Dodo **test card** from their docs (e.g. the standard `4242 4242 4242 4242`-style test PAN they
publish — take it from the Dodo test-cards page, not from memory).

**6.1 Signup → API key auto-provision**
1. Go to `https://einvoicecheck.ae/signup`, create an account.
2. Confirm a `pdk_live_...` key is shown **once**.
3. Confirm it works against the API:
   ```bash
   curl -s -X POST https://api.einvoicecheck.ae/v1/validate \
     -H "x-api-key: <the key>" -H "content-type: application/xml" \
     --data-binary @sample-invoice.xml | head
   ```

**6.2 Subscribe**
1. Dashboard → choose **Starter ($29)** → you should be redirected to a **real** Dodo checkout URL.
2. Pay with the test card.
3. Back on `/dashboard`: plan shows **Starter**, status **active**.
4. Dodo dashboard → Webhooks → delivery log: `subscription.active` and `payment.succeeded` both **200**.
5. Confirm the plan limit reached Redis and the API is enforcing 60 rpm:
   ```bash
   railway run --service <api-service> node -e "const R=require('ioredis');const r=new R(process.env.REDIS_URL);r.keys('plan:limits:*').then(async k=>{for(const x of k)console.log(x, await r.get(x));process.exit(0)})"
   ```

**6.3 Upgrade**
1. Dashboard → **Switch to Pro ($99)**.
2. Dodo should charge the prorated difference (`proration_billing_mode: prorated_immediately`).
3. `subscription.updated` arrives; dashboard shows **Pro**; the Redis limit becomes 300.

**6.4 Webhook replay (idempotency — the important one)**
1. Dodo dashboard → Webhooks → delivery log → pick the `subscription.active` delivery → **Resend**.
2. Expect **200** with `{"deduped": true}` in the response body.
3. Confirm nothing changed: the user's plan/status is untouched, and Mongo has exactly one row:
   ```bash
   # webhook_events must contain exactly ONE document with that webhook-id
   railway run --service <web-service> node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{console.log(await m.connection.collection('webhook_events').countDocuments());process.exit(0)})"
   ```

**6.5 Bad signature**
```bash
curl -i -X POST https://einvoicecheck.ae/api/webhooks/dodo \
  -H 'content-type: application/json' \
  -H 'webhook-id: manual-test-1' \
  -H "webhook-timestamp: $(date +%s)" \
  -H 'webhook-signature: v1,ZGVmaW5pdGVseW5vdGF2YWxpZHNpZ25hdHVyZQ==' \
  -d '{"type":"subscription.active","data":{"subscription_id":"sub_fake"}}'
```
Expect **HTTP 401** and no state change. If this returns 200, **stop and escalate** — the endpoint is
forgeable.

**6.6 Dunning / on-hold**
Use Dodo's test controls to force a failed renewal (or a decline-on-renewal test card). Expect
`subscription.on_hold`, the dashboard to show the on-hold banner, and **Update payment method** to
open a real Dodo payment-method flow.

**6.7 Cancel**
Dashboard → **Cancel subscription** → `subscription.updated {status: cancelled}` arrives → plan falls
back to **trial** and the Redis limit drops to 10 rpm (an over-trial call to the API now 429s).

**Record the outcome of 6.1–6.7 in `handoffs/E2/billing_test_report.md` under a new heading
"Real test-mode E2E". Until that section exists, billing is unproven against the real provider.**

---

## Step 7 — Go live (G3, after KYC approval)

1. Generate the **live-mode** API key and a live webhook endpoint + secret.
2. Update `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, and set
   `DODO_PAYMENTS_ENVIRONMENT=live_mode`.
3. Recreate the 3 products in live mode and update the 3 `DODO_PRODUCT_ID_*` vars — **live product IDs
   differ from test ones.**
4. Redeploy, then run **one real $29 checkout on your own card** and refund it from the Dodo portal.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Checkout returns 503 "Billing is not configured" | `DODO_PAYMENTS_API_KEY` unset |
| Checkout returns 500 naming a `DODO_PRODUCT_ID_*` var | That product ID env var is unset — the code never guesses one |
| Webhooks all 401 | Wrong `DODO_PAYMENTS_WEBHOOK_KEY`, or a proxy is rewriting the body (the HMAC is over the raw bytes) |
| Webhooks 200 but nothing changes | The event's user could not be resolved — check `metadata.user_id` is on the checkout session |
| API still 429s at the old limit after an upgrade | The `subscription.updated` webhook did not arrive; check the Dodo delivery log |
