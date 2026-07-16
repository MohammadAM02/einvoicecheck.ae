# GR1 - Free browser tool: UAE e-invoice validator

Live in the repo at **`/tools/uae-e-invoice-validator`** (+ API route `/api/tools/validate`).
Already in `sitemap.xml` (M1 reserved the slug in `TOOL_SLUGS`). **Not deployed** - deploy
remains PENDING on the human. There is no live URL and none is claimed anywhere.

---

## 1. Target keyword

**`e invoicing UAE` - 1,000 est. searches/month** (per `handoffs/M1/seo_baseline.md`).

**Honest caveat, restated so nobody downstream over-claims it:** V1 classifies this keyword as
**`commercial`**, not `informational`. GTM §2.4 asks for a free tool on an *informational*
keyword with real volume. This is the closest thing the cluster has: it is the only
research-stage query among the five (the other four are explicitly transactional or
vendor-selection), it is 1.7x the next keyword, and ~11x the exact-match technical term. So the
tool targets it knowing the intent label is a compromise, not a match. If the page ends up
attracting buyers rather than researchers, that is the expected failure mode - and the page is
built to convert them anyway (signup CTA above the fold of the second section).

Secondary/exact-match: `PINT AE validation` (90/mo) stays on `/tools/pint-ae-validator`, which
still renders the waitlist shell. GR1 built **one** tool, as scoped.

---

## 2. What it does

- **Zero login.** No signup, no API key, no email, no cookie. Paste or upload -> result.
- Accepts a **canonical JSON invoice** or a **UBL 2.1 / PINT AE XML** document (also the
  `{ "document": "<Invoice>..." }` envelope, because the engine's `normalizeInput()` does).
- Renders the result exactly as the API returns it: `valid` / `invalid`, `invoiceType`,
  `schemaVersion`, and the normalized field-level errors - `path`, `rule`, `severity`,
  `message`, `fix` - in a table with severity pills.
- Buttons: *Validate invoice*, *Upload a file*, *Load a sample* (the sample is deliberately
  broken, so a first-time visitor sees a real error list).

### It reuses the REAL rule engine - it is not a reimplementation

`app/web/src/lib/rules/**` is a **byte-for-byte copy** of `app/api/src/rules/**`
(`engine.js`, `registry.js`, `normalize.js`, `xml.js`, `codelists.js`, `money.js`, `error.js`,
`checks/*.js`). `src/lib/validation.ts` is a thin typed wrapper that calls
`validateInvoice(text)` - the same function `POST /v1/validate` calls in
`app/api/src/routes/validate.js`.

Why vendored rather than cross-imported: the web Dockerfile only copies `app/web/src`, so a
relative import into `app/api` would compile locally and break in the container.

**Drift guard:** `app/web/test/tool-engine-parity` (in `test/tools-validate.test.ts`) SHA-256s
both trees and fails the test suite if a single byte differs. The free tool therefore cannot
diverge from the paid engine without turning the build red. If you change a rule in
`app/api/src/rules`, re-copy it into `app/web/src/lib/rules`.

It runs **server-side** in a Next.js route handler (`runtime = 'nodejs'`). No external API
dependency at all - the tool works with the API undeployed, which it currently is. Nothing is
fabricated: an unparseable input returns the engine's own `ENG-PARSE-01` error, not a guess.

No invoice content is persisted. Validation happens in memory and the request is discarded.

---

## 3. Funnel: tool -> signup -> paid

1. **Entry** - organic (`e invoicing UAE`), header nav ("Free tool"), and internal links from
   `/`, `/blog` wk1/wk2/wk7, and the other two tool pages.
2. **Result** - the user gets their real error list with zero friction. No email wall.
3. **CTA immediately under the result** - "Do this on every invoice - get an API key" -> `/signup`,
   plus a secondary link to `/docs`.
4. **"Need this on every invoice? One API call."** section with the real copy-pasteable snippets
   (below) and three CTAs: `/signup` (free trial, $0 / 14 days / 100 validations), `/docs`,
   `/pricing`.
5. **Paid** - signup lands in E2's real auth + Dodo Payments checkout (Starter $29 / Growth $99).
   Billing is **Dodo Payments**; no other processor appears anywhere in this build.
6. **Optional email capture *after* the result** (GTM §2.4: capture after delivering value) -
   the existing `WaitlistForm` with `source=tool:uae-e-invoice-validator`, labelled as optional.

The result page also carries the hourly-cap line ("N of 20 free checks left this hour"), which
is itself an upgrade prompt: the API has no browser cap.

---

## 4. Exact CTA + code snippet on the page

Rendered from `src/app/tools/[slug]/page.tsx`. `API_BASE_URL` is
`https://api.einvoicecheck.ae` by default (`NEXT_PUBLIC_API_BASE_URL`) - a **planned** host, not
a deployed one. It matches `handoffs/E1/openapi.yaml`: `POST /v1/validate`, `x-api-key` header,
JSON body or `{ document: "<xml>" }`, response `{ valid, invoiceType, schemaVersion, errors[] }`.

cURL:

```bash
curl -X POST https://api.einvoicecheck.ae/v1/validate \
  -H "x-api-key: $EINVOICECHECK_API_KEY" \
  -H "content-type: application/json" \
  --data-binary @invoice.json
```

Node:

```js
// Same engine, same errors - just automated.
const res = await fetch("https://api.einvoicecheck.ae/v1/validate", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EINVOICECHECK_API_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify(invoice), // or { document: "<Invoice>...</Invoice>" } for UBL/PINT AE XML
});

const { valid, invoiceType, schemaVersion, errors } = await res.json();
if (!valid) {
  for (const e of errors) {
    console.error(`[${e.severity}] ${e.path} ${e.rule}: ${e.message}`);
  }
  process.exit(1); // fail the build before the file reaches your ASP
}
```

CTA button text: **"Get an API key - $0 for 14 days, 100 validations"** -> `/signup`.

---

## 5. IP rate limit (shared Redis)

`src/lib/toolRateLimit.ts`, wired through the existing `src/lib/redis.ts` client - the **same**
Redis instance `app/api` reads `plan:limits:*` from. Namespace: `tool:rl:<tool>:<ipHash>:<window>`.

- **20 validations per IP per hour** (`TOOL_RATE_LIMIT_PER_HOUR`, default 20). Fixed window:
  `INCR`, then `EXPIRE 3600` on first hit, then `TTL` for the reset - the same shape as the API's
  per-key limiter.
- IP is taken from `x-forwarded-for` (first hop) / `x-real-ip` and stored only as a **salted
  SHA-256 prefix** (`TOOL_RATE_LIMIT_SALT`). The raw address never reaches Redis.
- Over the cap -> **429** with a message that names the cap, the reset time, and points at the
  uncapped API.
- **Fail open** if Redis is unreachable: the request is served and `rateLimit.degraded = true`
  is surfaced in the UI ("rate limiting is degraded right now"). It is never silently ignored.
- **Production must not run unlimited:** set `TOOL_RATE_LIMIT_REQUIRE_REDIS=true` and a Redis
  outage returns **503** instead of an unlimited free tool. Tested both ways.

Env vars for the operator: `REDIS_URL` (already used), `TOOL_RATE_LIMIT_PER_HOUR`,
`TOOL_RATE_LIMIT_SALT`, `TOOL_RATE_LIMIT_REQUIRE_REDIS`.

---

## 6. Guardrail

Present three times on the page, all explicit:

- The shared `GuardrailNotice` (unchanged, `GUARDRAIL` in `src/lib/site.ts`).
- A tool-specific notice directly under the validator: a pass means the file is structurally and
  arithmetically clean against the rules this engine checks - it does **not** make an invoice
  "compliant", **does not submit anything**, is **not FTA accreditation**, does not transmit legal
  e-invoices, does not replace an accredited service provider, and provides **no statutory
  archival**.
- The green result badge reads **"Passes preflight"**, never "compliant" or "submitted", and the
  clean-result copy repeats the caveat.

A "What this checks" section lists exactly the eight registered rule groups (invoice type, TRN,
required fields, currency/code lists, VAT category/rate, line arithmetic, tax breakdown, document
totals) and states plainly what the engine does **not** do (no XSD/Schematron conformance, no FTA
registration lookup, no transmission). No invented rules.

---

## 7. Files

| Path | What |
|------|------|
| `app/web/src/app/tools/[slug]/page.tsx` | landing copy, snippets, CTAs, guardrail (TODO(GR1) slot filled) |
| `app/web/src/components/InvoiceValidator.tsx` | the client tool (paste / upload / sample / result table) |
| `app/web/src/app/api/tools/validate/route.ts` | zero-login server route: rate limit -> engine |
| `app/web/src/lib/validation.ts` | typed wrapper over the vendored engine |
| `app/web/src/lib/rules/**` | the REAL engine, byte-identical copy of `app/api/src/rules/**` |
| `app/web/src/lib/toolRateLimit.ts` | IP rate limit on shared Redis |
| `app/web/src/lib/redis.ts` | +`incr`/`expire`/`ttl` on the client type (additive only) |
| `app/web/src/app/globals.css` | GR1 block (tool input, severity pills) |
| `app/web/test/tools-validate.test.ts` | 9 tests: engine parity, JSON, XML, parse error, rate limit, fail-open, require-Redis |
| `app/web/tsconfig.json` | `allowJs: true` (to import the vendored `.js` engine) |
| `app/web/package.json` | +`fast-xml-parser` (the engine's only dependency) |

Untouched, as instructed: `/alternatives/*`, `/vs/*`, `/legal/*`, `/contact`, `/dashboard`,
`/signup`, `/login`, `/api/webhooks/*`, and everything E2 owns.
