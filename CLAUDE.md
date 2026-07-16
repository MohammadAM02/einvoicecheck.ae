# Project: einvoicecheck.ae — UAE e-invoice preflight validation API

This file primes every session in this repo. Read it before touching code, copy, or infra.
It reflects what's actually in this repo as of 2026-07-16, not aspiration.

## What this is

A deterministic **preflight validator** for UAE e-invoices (PINT AE / UBL 2.1). Customers
POST an invoice (JSON, JSON envelope, or raw XML) to `/v1/validate` and get back a normalized
list of failures — `{ path, rule, severity, message, fix }` — before handing the file to an
accredited Access Service Provider (ASP) for actual transmission.

Two consumer segments: UAE ERP integrators, finance/accounting software vendors, and in-house
finance engineering teams who want a failing CI test instead of a rejection notice three days
later. Self-serve, $29/$99/mo (not live yet — see Status).

**Repo root** = `F:\Administrator\Downloads\Proven-Demand API Sprint`. This is not just the
app — it also contains the GTM plan, the multi-agent build workflow, and per-step handoff
artifacts. Don't treat `app/` as the whole project.

## The one non-negotiable: the positioning guardrail

This product is **not** FTA-accredited, does **not** transmit legal e-invoices, does **not**
replace an accredited ASP, and does **not** provide statutory archival. It lints invoices; it
does not file them.

Every session, in code comments, copy, blog posts, comparison pages, support replies, or
answers to the user — **never let this slip**. Specifically never say or imply:
- "compliant" / "FTA-approved" / "accredited" for this product itself
- that using this API satisfies the UAE e-invoicing mandate on its own
- that it replaces or is an alternative to an ASP (only: "sits in front of one")

The guardrail sentence is centralized in `app/web/src/lib/site.ts` (`GUARDRAIL`) and rendered
by `<GuardrailNotice />` on every commercial page + every footer. If you add a new
commercial-facing page, wire the guardrail in — don't hand-roll new wording.

## Current status (check `handoffs/ledger.json` for the live picture, this will go stale)

- Site is **live** at https://einvoicecheck.ae (Railway), custom domain + valid TLS.
- API is **live** at a Railway URL (see ledger `DEP1` for the exact hostname); health checks
  Mongo + Redis.
- Billing (Dodo Payments) is wired end-to-end but **not live** — test-mode only, pending Dodo's
  individual-merchant KYC review (`G2B`). Do not claim billing is live in copy or code until
  that's confirmed.
- Ship-gate (`Q1`) passed with fixes applied (webhook lost-update race, rate-limiter fail-open
  — both fixed 2026-07-14).
- `G3` (final launch decision) is still **pending** — this is a human gate, don't flip it.
- Known design debt: the free `/tools/uae-e-invoice-validator` tool in `app/web` runs a
  **vendored, byte-for-byte copy** of `app/api/src/rules` (Railway's web Dockerfile only
  copies `app/web/src`, so it can't import the API's engine directly). There's a SHA-256
  parity test guarding drift between the two copies — if you touch rule logic in
  `app/api/src/rules/`, you must update `app/web/src/lib/rules/` identically and keep that
  test green. This duplication is flagged, not fixed — don't "clean it up" by deleting one
  copy without re-plumbing the build.

Before saying anything is "done," re-check `handoffs/ledger.json` — it's the source of truth
for what's actually deployed vs. built-but-blocked.

## Stack — locked, do not re-litigate

- **API** (`app/api`): Node ≥20, Fastify 5, MongoDB via Mongoose, Redis via ioredis, Vitest.
  ESM (`"type": "module"`). Deployed to Railway via Dockerfile.
- **Web** (`app/web`): Next.js 15 (App Router), React 19, TypeScript, Vitest. Deployed to
  Railway via Dockerfile.
- **Billing**: Dodo Payments (`dodopayments` npm SDK) — merchant of record. **Never** Stripe.
  The founder operates as a UAE individual with no trade licence; Dodo supports individual
  merchants with personal-bank payouts, Stripe was explicitly ruled out for this reason. If
  you ever see "stripe" appear in `app/`, that's a regression — grep for it before shipping
  anything billing-related and expect zero hits outside `.next/` vendor bundles.
- **Hosting**: Railway (project `einvoicecheck.ae`). `railway.json` + `Dockerfile` exist in
  both `app/api` and `app/web` — don't introduce a different deploy target without a real
  reason and explicit sign-off.

If you think the stack should change (different DB, different host, different billing
provider), say so explicitly and ask — don't just start writing code against something else.

## Rule engine conventions (`app/api/src/rules/`, mirrored in `app/web/src/lib/rules/`)

- One check module per rule family under `checks/` (currency, documentTotals, invoiceType,
  lineArithmetic, requiredFields, taxBreakdown, trn, vatCategory), wired through `registry.js`
  and executed by `engine.js`.
- Every error normalizes to `{ path, rule, severity, message, fix }`. Output must be
  **deterministic** — identical input → identical output, always. No LLM calls, no
  "confidence scores," inside the validation path itself.
- Every rule's official basis (PINT AE business rule ID, EN 16931 BR code, UAE MoF mandatory
  field spec, FTA TRN format, etc.) is documented in `app/api/README.md`'s rule table and
  should be **cited with a fetch date** when you add or modify a rule — this codebase treats
  "I fetched this from the official source on [date]" as a hard requirement, not a nicety.
  Never invent a rule ID or business-rule citation from memory.
- Structural XSD/Schematron validation is explicitly **out of scope for V1** — anchors are
  marked `TODO(pint-ae-xsd)` in `app/api/src/rules/xml.js`. Don't silently half-implement that
  layer; either do it properly (full XSD + Schematron) or leave the anchor alone.
- Digital signatures, AS4 transmission, and Peppol participant lookup are explicitly **not**
  this product's job — that's the ASP's. Don't add features that blur that line without
  flagging that it changes the guardrail's truthfulness.

## Copy and content conventions (`app/web`)

- Deterministic, not "advisory" — the marketing copy leans on the product being a linter with
  a fixed rule set, not a probabilistic tool. Keep that framing.
- Comparison pages (`/vs/*`, `/alternatives/*`) must use **live-fetched** competitor pricing
  and feature claims, dated, never numbers from training data or memory. If a competitor's
  page can't be fetched (403/blocked), the existing pages print an explicit caveat rather than
  guessing — follow that pattern.
- `/tools/*` free tools are zero-login, single-shot versions of the paid API with a "do this
  programmatically" CTA. If you add a new one, it goes through the vendored rules copy (see
  design debt above) and needs its own parity test.
- SEO metadata, sitemap (`src/app/sitemap.ts`), and robots (`src/app/robots.ts`) are generated,
  not hand-maintained lists — extend the generator, don't hardcode a new URL list alongside it.

## Testing discipline

- Both `app/api` and `app/web` test fully in-memory: `mongodb-memory-server` + `ioredis-mock`.
  No external services required to run the suite. Run `npm test` in the relevant subfolder
  before claiming anything is fixed or shipped — "should work" is not a substitute for a green
  run.
- `app/api`: 18+ tests (`vitest run`), covers the engine, health, plan limits, rate limiting,
  usage metering.
- `app/web`: 40+ tests, covers auth/keys, billing (Dodo test-mode, webhook signature +
  idempotency), the free tool, webhooks.
- Before marking a change "done": tests green in the affected package(s), `npm run build`
  exits 0 for `app/web`, and (if you touched rules) the SHA-256 parity test between
  `app/api/src/rules` and `app/web/src/lib/rules` still passes.

## Multi-agent build history — useful context, not a live requirement

This app was originally built by an autonomous orchestrator/subagent workflow, fully specified
in `WORKFLOW-proven-demand-api.md`, with role definitions in `.agents/*.md` and per-step
artifacts in `handoffs/<STEP_ID>/`. Steps: V1 (demand validation) → G1/G2/G3 (human gates) →
M1/M2 (marketing pages) → E1 (API) → E2 (dashboard + billing) → GR1 (free tool) → O1 (support
ops) → Q1 (ship-gate audit) → L1 (weekly post-launch loop).

You don't need to re-run that workflow to make changes here, but it's worth knowing:
- `handoffs/E1/openapi.yaml` is the API surface of record — regenerate via
  `npm run openapi` in `app/api`, don't hand-edit it out of sync with the routes.
- `handoffs/E1/DEPLOY.md` is the Railway runbook.
- `GTM-MARKETING-MASTER-PLAN.md` is binding for anything marketing/content-shaped — the
  one-message positioning, the UAE-first channel mix, and the named comparison targets
  (ClearTax, Comarch, Sovos) all come from there. Don't freelance a different GTM angle
  without checking it first.
- `handoffs/Q1/ship_gate_report.md` and `handoffs/O1/*` capture known issues and the support
  runbook (5-minute SLA, UTC+4 waking hours only — not 24/7, don't let copy imply otherwise).
- `CREDENTIALS-SETUP-GUIDE.md` documents what operator-side credentials (Dodo, Railway, DNS,
  GSC) are needed and where — never put real secret values in `.env.example` files or in
  chat; those files intentionally hold names only.

## Working style for this project

- This is a real, live, revenue-seeking product for a solo UAE-based founder — not a demo.
  Compliance accuracy and the guardrail matter more than speed or cleverness.
- Prefer fixing something inside the existing architecture over proposing a rebuild. The
  stack, billing provider, and hosting are locked decisions — treat requests to swap them as
  something to flag and confirm, not execute quietly.
- When adding or changing a validation rule, always: (1) name the exact official rule ID it
  enforces, (2) cite where you verified it and when, (3) add/adjust a test, (4) keep the two
  rule-engine copies in sync.
- When touching billing, guardrail copy, or anything KYC/compliance-adjacent, treat it as
  higher-stakes than normal feature work — confirm before making claims that could create
  legal or regulatory exposure for the founder.
