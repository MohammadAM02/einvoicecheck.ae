# Q1 — Ship Gate Report (adversarial pre-launch audit)

**Workflow:** proven-demand-api-v1 · **Step:** Q1 · **Date:** 2026-07-14
**Auditor:** ship_gate_evaluator (independent; handoff reports were treated as claims to verify, not facts)
**Scope:** `app/api` (E1 Fastify preflight API), `app/web` (Next.js 15 site + Dodo billing), `handoffs/`

## VERDICT: **PASS** (ship with the HIGH/MEDIUM items fixed soon)

No CRITICAL findings. No committed secrets, no auth/IDOR hole, no XXE, webhook is signature-verified and replay-idempotent, guardrail copy is intact, no fabricated facts, and the most-current handoff numbers (GR1 42/42, E2 build EXIT 0) reproduce exactly. Two older handoff test reports are **stale** (undercount because later steps added passing tests) but do **not** overstate — every test is genuinely green.

---

## Findings (severity-ordered)

| # | Sev | Location | Scenario → outcome | Fix |
|---|-----|----------|--------------------|-----|
| H1 | HIGH | `app/web/src/lib/billing.ts:247` (insert) vs `:271-347` (mutate), route `webhooks/dodo/route.ts:44-45` | Idempotency marker `WebhookEvent.create({webhookId})` is committed **before** `applyState`, with no transaction. If `applyState` throws (transient Mongo error) after the marker inserts, the route returns 500 so Dodo retries — but the retry hits the unique-index dedupe and returns 200 `handled:false`. The subscription state change is **permanently lost** (e.g. customer pays but stays on `trial`, or cancels but keeps `pro`). Replays are correctly idempotent; this is a durability gap, not a forgery. | Insert the idempotency marker in the **same transaction** as the state mutation (commit both or neither), or move the marker insert to **after** a successful `applyState`, or make the handler upsert-and-reconcile so a retry re-applies. |
| M1 | MED | `app/api/src/plugins/security.js:105-108` | Per-key API rate limiter fails **OPEN** on any Redis error, with only a `log.warn` and **no override flag**. If Redis is down in production, all paid rate limits are silently disabled → unlimited requests (cost / DoS on the metered API). The free tool has `TOOL_RATE_LIMIT_REQUIRE_REDIS`; the paid API has no equivalent. (Note: a *missing/garbage* `plan:limits:*` blob fails **CLOSED** to the 60/min default via `parsePlanLimit` → good; only a full Redis outage is fail-open.) | Add a `RATE_LIMIT_REQUIRE_REDIS=true` path that returns 503 (or falls back to a conservative in-process cap) instead of unconditionally allowing on limiter failure. |
| M2 | MED | `handoffs/E1/test_report.md:8,18-25`; `handoffs/E2/billing_test_report.md:37-44` | Stale counts. E1 claims **18/18 across 5 suites**; the tree now runs **19/19 across 6 suites** (`test/planLimit.test.js`, added by E2, is absent from E1's report). E2 claims web **33/33**; current is **42/42** (GR1 added 9). Both predate later steps — they **undercount**, not overstate; all tests pass. | Regenerate E1/E2 reports, or add a note that later steps superseded them. Not ship-blocking. |
| L1 | LOW | `app/web/src/lib/validation.ts:11`, `app/web/src/app/api/webhooks/dodo/route.ts:14` (comments) | Comments reference a parity test `test/tool-engine-parity.test.ts` that does not exist. The real parity check lives in `test/tools-validate.test.ts:65-81` and works. Documentation drift only. | Fix the comment to point at `tools-validate.test.ts`. |
| L2 | LOW | `app/web/test/tools-validate.test.ts:72` | Parity `hashTree` only hashes `.js` files. A rule added as a non-`.js` file would escape the drift check. All rules are `.js` today, so no current gap. | Hash all files, or assert file-name set equality across trees too. |

---

## 13 mandatory checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | No secrets committed; `.env.example` names-only | **PASS** | Secret-pattern scan (`whsec_`, `sk_live/test`, `pdk_live_<hex>`, `AKIA`, `-----BEGIN`, `mongodb+srv://u:p@`) over `app/**` (excl. node_modules/.next) = 0 real hits. No committed `.env`/`.env.local`. `app/api/.env.example` & `app/web/.env.example` list names only; secret vars (`DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `AUTH_SECRET`) are blank. |
| 2 | Webhook security | **PASS** | `billing.ts:235` verifies via SDK `client.webhooks.unwrap(rawBody,…)`; `unsafe_unwrap` absent from `app/*/src` (grep exit 1). Raw body used: `route.ts:21 request.text()` + `runtime='nodejs'`, `dynamic='force-dynamic'`. Bad signature → `catch` returns **401** at `billing.ts:239-241`, *before* `connectMongo()` (:243) and any write → zero state change. Idempotency: `WebhookEvent` unique index on `webhookId` (`models.ts:152`); replay → E11000 → `deduped:200` (`billing.ts:248-253`). *(See H1 for the commit-ordering durability gap.)* |
| 3 | Auth (scrypt / cookie / key hashing) | **PASS** | scrypt with 16-byte random salt, N=64 key len, `timingSafeEqual` (`auth.ts:20-32`). Session = base64url payload + HMAC-SHA256, verified with `timingSafeEqual` and expiry (`auth.ts:37-58`); unsigned/tampered token rejected. Cookie `HttpOnly; SameSite=Lax; Secure` in prod (`auth.ts:60-63`). `AUTH_SECRET` throws in prod if unset (`auth.ts:12-14`). API keys stored SHA-256 hex only, raw `pdk_live_<32hex>` returned once (`models.ts:49-54`, `keys.ts:60-84`), never logged in request paths. |
| 4 | Authorization / IDOR | **PASS** | Every dashboard/billing route derives the actor from `currentUser(request)` (session), never a client-supplied id. `revokeKey` filters `{_id:keyId, userId, active:true}` (`keys.ts:90-94`) → user A cannot revoke B's key. `listKeys`/`usageSummary` scope by `userId` (`keys.ts:28`, `usage.ts:30`). Billing acts on `user.dodoSubscriptionId` from session. API `/usage` scopes to the authenticated `request.apiKey._id` (`usage.js:25`). No missing ownership check found. |
| 5 | Injection / XXE / entity-expansion / body DoS | **PASS** | Empirically tested the exact `fast-xml-parser` config in `rules/xml.js:14-20`: external entity `file:///etc/passwd` → **"External entities are not supported"** (throws, no read); billion-laughs `&lol5;` → expanded length **6** (no recursive expansion), <2 ms. Body caps: API `bodyLimit: 5 MB` (`app.js:23`); free tool `MAX_DOCUMENT_BYTES = 256 KB` → 413 (`validation.ts:33`, `tools/validate/route.ts:38`). |
| 6 | Rate limiting enforced | **PARTIAL / PASS with M1** | API per-key sliding window in Redis, plan-gated via `plan:limits:*` (`security.js:52-124`); free tool per-IP fixed window (`toolRateLimit.ts`). Enforcement verified by `rateLimit.test.js` and `tools-validate.test.ts:139-207`. **M1:** the paid API limiter fails OPEN on Redis outage with no override flag. |
| 7 | PII / log hygiene | **PASS** | `meter()` writes only endpoint/method/status/outcome — never the payload (`validate.js:31-44`). No log statement in `app/*/src` references body/document/apikey/password/payload (grep = 0). Free-tool IP stored only as salted SHA-256 prefix (`toolRateLimit.ts:41-44`). `seedApiKey.js` prints the raw key once — intentional manual CLI, not a server log. |
| 8 | Stripe eradication | **PASS** | Case-insensitive `stripe` over `app/*/src`, `app/*/test`, both `package.json`, both lockfiles, `.env*` = **0 hits** (node_modules excluded per spec). Billing is Dodo (`dodopayments@^2.42.2`). |
| 9 | Engine vendoring parity (GR1) | **PASS** | `diff -rq app/api/src/rules app/web/src/lib/rules` → **identical**. Parity test exists and runs (`tools-validate.test.ts:65-81`): SHA-256-hashes every `.js` in both trees and `expect(...).toEqual(...)` — a one-byte divergence fails the suite. Confirmed green in the reproduced web run. Duplication is an acceptable trade here (web Dockerfile copies only `app/web/src`, so cross-package import wouldn't survive the build) *given* the enforced hash test; see L1/L2 for the doc-name drift and the `.js`-only scope. |
| 10 | E2↔E1 coupling soundness | **PASS** | `plans.js` added; `security.js` reads `plan:limits:*`. Missing/garbage blob → `parsePlanLimit` returns null → falls back to `ApiKey.rateLimitPerMinute ?? 60` default = fails **CLOSED** (`security.js:99`). E1 tests still green (19/19). Full Redis outage → fail-open (M1). |
| 11 | Guardrail integrity | **PASS** | Every FTA/transmission/ASP/archival mention in `app/web/src` is a **disclaimer** ("not FTA-accredited", "does not transmit legal e-invoices", "does not replace an accredited service provider", "no statutory archival") — `page.tsx:21`, `docs/page.tsx:25`, `pricing/page.tsx:27`, `legal/terms:109`, `vs/[slug]:58`, `InvoiceValidator.tsx:207-210` ("not…filed, accepted, or made legally compliant. Preflight only."), `lib/site.ts:16`. No claim of compliance/accreditation/submission found. |
| 12 | No fabricated facts | **PASS** | No invented company/licence/VAT/phone/address. Copy explicitly states none exists ("no trade licence number… because none exists" — `contact:57`, `legal/terms:51-52`, `site.ts:49`). `[OPERATOR TO COMPLETE]` placeholders still present (`site.ts:50-60`, `legal/privacy:136,144`, `legal/terms:37`). |
| 13 | Build/test truth | **PASS (with M2 note)** | Real numbers reproduced below. GR1 (42/42) and E2 build (EXIT 0) reproduce exactly. E1 (18/18) and E2-billing (33/33) are stale undercounts — not overstated. |

---

## Real build/test output (reproduced this audit)

**`app/api` — `npm test` (vitest 2.1.9):**
```
✓ test/validate.test.js  (6)
✓ test/engine.test.js    (7)
✓ test/planLimit.test.js (1)
✓ test/usage.test.js     (2)
✓ test/rateLimit.test.js (1)
✓ test/health.test.js    (2)
Test Files  6 passed (6)
     Tests  19 passed (19)
```
`app/api` has **no `build` script** (plain-JS Fastify service — expected; nothing to compile).

**`app/web` — `npm test` (vitest 4.1.10):**
```
✓ test/tools-validate.test.ts (9)
✓ test/auth-keys.test.ts      (7)
✓ test/billing.test.ts        (12)
✓ test/webhooks.test.ts       (14)
Test Files  4 passed (4)
     Tests  42 passed (42)
```

**`app/web` — `npm run build` (next build): EXIT 0.** 24 routes compiled; all 14 `/api/*` routes emitted as dynamic (ƒ) server functions; static/SSG pages prerendered. No type or lint failure.

### Handoff reconciliation
- `handoffs/GR1/build_report.md` (42/42 tests, build compiled, 24/24 pages) — **reproduces exactly.**
- `handoffs/E2/build_report.md` (EXIT 0) — **reproduces.**
- `handoffs/E1/test_report.md` claims **18/18 / 5 suites** — actual **19/19 / 6 suites** (stale, undercount, all green).
- `handoffs/E2/billing_test_report.md` claims web **33/33** — actual **42/42** (stale; GR1 added 9). All green.
- **No handoff report overstates its results.** No report claims green where reality is red.

---

## Unproven-because-no-deploy (expected, NOT defects)
- No real Dodo credentials → live webhook signature path, real checkout/portal/dunning, and live_mode KYC gate are untested end-to-end (E2's own report flags this). Client defaults to `test_mode`.
- Waitlist route (`api/waitlist/route.ts`) is a documented file-append stub on an ephemeral Railway FS — labelled TODO(E2), not relied on for billing.
