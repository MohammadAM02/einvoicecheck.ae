# Research

Task: `p1-hardening-1-5`

## Repository facts

- Repository: `C:/Users/AMG/code/https-einvoicecheck.ae`.
- Approved RPI base commit: `b115cbea148d9ee614f950b0d4ed8e4d58ab7d6b`.
- Runtime stack: Node.js, Fastify API, Next.js web, MongoDB, Redis, Vitest.
- Project rules: `.hermes.md`, `AGENTS.md`, `.hermes/constitution.md`.
- Shared critic ledger: `.hermes/critic-loop.md`.

## Observed validation findings

- `app/api/src/rules/generate/templates.js` emits `388` for standard-tax-invoice and `386` for summary-tax-invoice.
- `app/api/src/rules/generate/generate.js` applies the generation XSD gate but not the complete `validateXmlDocument()` pipeline.
- Current PINT-AE Billing Schematron permits Invoice codes `380` and `480` for the reviewed profiles.
- Local adversarial execution found generated `388` and `386` outputs can fail the full validation pipeline.
- `app/api/src/rules/checks/vatCategory.js` and `taxBreakdown.js` skip normal tax arithmetic for category `AE`.
- A local probe with `AE`, taxable amount 100, rate 5, and tax amount 5 returned `valid: true`; current XML Schematron requires the relevant AE seller tax amount to be zero.

## Observed metering findings

- `app/api/src/config/plans.js` defines `monthlyQuota`.
- `app/api/src/plugins/security.js` enforces the per-minute limit but does not enforce `monthlyQuota`.
- Validation, conversion, and generation append `UsageEvent` rows after work.
- `app/web/src/lib/usage.ts` computes remaining/overage for display only and currently uses a rolling-window calculation.
- `app/web/src/app/api/tools/validate/batch/route.ts` checks the free-tool IP limiter once and then calls `validateDocument()` once per accepted document, up to 50.
- `app/api/src/routes/usage.js` authenticates without the shared limiter and performs five Mongo operations, including an all-time aggregate.

## Baseline evidence

Executed on base commit after installing the RPI kit:

- `cd app/api && npm test -- --run` → exit 0; 16 files, 143 tests passed.
- `cd app/web && npm test -- --run` → exit 0; 20 files, 140 tests passed.
- `cd app/web && npm run build` → exit 0; Next.js production build completed.
- `git diff --check` → exit 0.

## Decisions

- Monthly quota period: UTC calendar month. This is the smallest deterministic contract and avoids coupling enforcement to PayPal state.
- Quota accounting unit: one successful or invalid billable API operation, consistent with the existing `UsageEvent` metering model; internal/server errors do not consume monthly quota.
- Batch free-tool accounting: one free-tool unit per accepted invoice, reserved before upstream processing; reject the whole batch when all units cannot be reserved.
- Legacy external endpoints remain compatible unless an acceptance test explicitly requires a response addition.

## Contradictions

- Generator documentation/UX implies PINT-AE output, but its current gate proves only XSD conformance.
- Monthly quotas are displayed as a contract but are not enforced.
- Batch comments/UI describe per-invoice consumption while implementation meters per request.

## Unknowns

- Production Redis/Mongo capacity and deployed environment values are not available locally.
- No production API key is available for authenticated live verification.
- No deployment is authorized; live behavior remains outside this task.
