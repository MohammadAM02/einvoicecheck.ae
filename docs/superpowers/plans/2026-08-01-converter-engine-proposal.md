# Converter Engine Proposal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Schematron/PINT AE validation and a guardrailed Invalid→Valid converter to einvoicecheck.ae — format-only repair with audit trail, refusal on data-semantic errors, never fabricating compliance.

**Architecture:** The converter is a pipeline inside the existing validation engine: sanitize → well-formedness gate → data-semantic classifier → (refuse | format repair) → verify → data-integrity fingerprint → audit + SHA-256 hashes. Repairers are tagged `FMT-*`, auditable, structure-only. The classifier mirrors the existing ENG-* rules. Exposed as an opt-in `?convert=format` flag on the existing `/validate` route; a shared `@einvoicecheck/rules` package ends the api↔web rule duplication.

**Tech Stack:** Node.js, Fastify 5 (existing API), fast-xml-parser (existing), PINT AE Schematron ruleset (XSD + Sch), vitest (existing test runner).

## Global Constraints

- Converter must NEVER invent or alter invoice data (TRNs, amounts, dates, identities, codes). Any repairer that touches data is a defect.
- Any data-semantic error → REFUSE with no output. No partial/fabricated documents, ever.
- Every change carries an audit entry: rule ID, path, old → new, reason. Input/output SHA-256 hashes.
- Original input is never mutated; output is a draft for the issuer to review.
- Customer-facing text follows ASD-STE100 (existing standard): what happened → why → what to do.
- Keep "Preflight passed/failed" language. Never "Would be accepted", never FTA/ASP approval claims.
- Follow existing engine patterns (`app/api/src/rules/*`, `web/src/lib/rules/*`) — do not restructure.
- Security: rate limits, fail-closed Redis, no payload persistence (existing posture unchanged).
- Confirm UAE legal specifics with a UAE tax advisor before any external claim; internal implementation is unaffected.

---

## Task 1: Extract shared rules package

**Files:**
- Create: `packages/rules/package.json`, `packages/rules/src/index.js`, `packages/rules/src/checks/*.js`, `packages/rules/src/engine.js`, `packages/rules/src/error.js`, `packages/rules/src/money.js`, `packages/rules/src/normalize.js`, `packages/rules/src/xml.js`, `packages/rules/src/codelists.js`, `packages/rules/src/registry.js`
- Move from: `app/api/src/rules/*` (existing 8 files + checks)
- Test: `packages/rules/test/engine.test.js`

**Interfaces:**
- Produces: `validateInvoice(body, contentType) -> { valid, invoiceType, schemaVersion, errors }` (identical signature to today's `app/api/src/rules/engine.js`); `RULES` registry; `err(path, rule, message, fix)`.

- [ ] **Step 1: Copy existing rule files verbatim** into `packages/rules/` preserving structure.
- [ ] **Step 2: Write the migration test** asserting `validateInvoice` output is byte-identical to the pre-migration engine on the existing fixtures (`app/api/test/helpers/fixtures.js`).
- [ ] **Step 3: Repoint `app/api` and `app/web` imports** to the package (workspace or file reference; `file:` dependency acceptable at this stage).
- [ ] **Step 4: Run existing suites** — `cd app/api && npx vitest run` and `cd app/web && npx vitest run` — all pass.
- [ ] **Step 5: Commit** — `feat(rules): extract shared @einvoicecheck/rules package`.

## Task 2: Schematron layer

**Files:**
- Add: `app/api/src/rules/schematron.js`
- Add: `app/api/src/schematron/` (PINT AE XSD + .sch files, vendored with license header)
- Modify: `app/api/src/rules/registry.js`
- Test: `app/api/test/schematron.test.js`

**Interfaces:**
- Consumes: `RULES` from Task 1.
- Produces: `validateSchematron(xml) -> { schemaErrors: [{ rule, path, message }] }`; registered as a rule running before semantic checks; closes gap rows IBR-073 (date format) and IBR-CO-11 (prepaid ≤ payable) from PRODUCTION_STATUS.md §4.

- [ ] **Step 1: Write failing test** for IBR-073 (invalid date `2026/08/01` → error) and IBR-CO-11 (prepaid > payable → error).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** `validateSchematron` using the vendored PINT AE Schematron rules (or a maintained Node Schematron runner; pick by feasibility spike), mapping rule IDs to ENG-*/IBR-*.
- [ ] **Step 4: Run tests to verify pass.**
- [ ] **Step 5: Commit** — `feat(validation): Schematron layer with IBR-073 + IBR-CO-11`.

## Task 3: Converter pipeline (core)

**Files:**
- Add: `app/api/src/rules/convert/repairers.js`, `app/api/src/rules/convert/audit.js`, `app/api/src/rules/convert/classifier.js`, `app/api/src/rules/convert/index.js`
- Modify: `app/api/src/rules/engine.js` (wire `convert` export)
- Test: `app/api/test/convert.test.js`

**Interfaces:**
- Consumes: `validateInvoice` (Task 1), `validateSchematron` (Task 2).
- Produces: `convert(xml, { mode: 'format'|'full' }) -> { status: 'CONVERTED'|'NOOP'|'REFUSED'|'ERROR', reason?, blocked[], dataIssues[], audit[], inputHash, outputHash?, output?, engineVersion }` — port of the validated spike (`spikes/001-converter-format-only/convert.js`), DOM-based repairers per spike verdict.

- [ ] **Step 1: Port spike repairers + classifier as unit-testable modules** (unwrap `#text` via `textOf`; `numOf` null → `ENG-NUM-01` blocking — the silent-skip fix from the spike).
- [ ] **Step 2: Write failing tests** — format-only sample converts with 4 audit entries; data-semantic sample refuses with 4 blocked rules; mixed refuses with no output; unrepairable refuses.
- [ ] **Step 3: Implement** pipeline: sanitize → parse gate → classify → refuse|repair → verify → fingerprint guard → audit.
- [ ] **Step 4: Adversarial test** — inject a rogue repairer mutating an amount; assert `status=ERROR, reason=DATA_CHANGED`.
- [ ] **Step 5: Run tests to verify pass.**
- [ ] **Step 6: Commit** — `feat(convert): format-only converter with audit trail and refusal guardrails`.

## Task 4: Wire into API + web validator

**Files:**
- Modify: `app/api/src/routes/validate.js` (accept `?convert=format`), `app/web/src/lib/validation-client.ts` (pass flag), `app/web/src/app/api/tools/validate/route.ts`
- Modify: `app/web/src/components/validation/ValidatorWorkspace.tsx` (opt-in toggle + audit panel)
- Modify: `docs/PRODUCTION_STATUS.md` §4 gap table + ScopePanel copy (`app/web/src/components/ScopePanel.tsx`)
- Test: `app/api/test/validate.test.js`, `app/web/test/validator-workspace.test.tsx`

**Interfaces:**
- Consumes: `convert(xml, { mode })` from Task 3.
- Produces: `POST /validate?convert=format` response including `converted`, `audit`, `hashes` alongside the existing result; UI "Convert draft" action with audit panel; ScopePanel updated: Schematron moves from "not included" to "included; still not a filing service, not the FTA, no guarantee".

- [ ] **Step 1: Write failing API test** for `?convert=format` response shape.
- [ ] **Step 2: Implement route flag + client plumbing.**
- [ ] **Step 3: Write failing UI test** for audit panel rendering.
- [ ] **Step 4: Implement ValidatorWorkspace toggle + audit panel (compliance-desk styling).**
- [ ] **Step 5: Update ScopePanel + PRODUCTION_STATUS.**
- [ ] **Step 6: Full suites + production build (`cd app/web && npm run build`).**
- [ ] **Step 7: Commit** — `feat(api): converter behind ?convert=format + audit panel`.

## Task 5: Review cadence + docs

**Files:**
- Add: `docs/reviews/converter-guardrail-review.md` (quarterly adversarial checklist)
- Modify: vault decision note link + `spikes/001-converter-format-only/README.md` (mark shipped)

- [ ] **Step 1: Write the quarterly guardrail review checklist** — rotate repairers through fault injection; confirm zero data-touching paths; confirm refuse semantics; confirm STE text.
- [ ] **Step 2: Commit** — `docs: converter guardrail review cadence`.

---

## Self-Review

- **Spec coverage:** Schematron (Task 2), converter format-only + guardrails (Task 3), refusal semantics (Task 3 step 2), audit trail + hashes (Task 3), draft-not-certification language (Task 4 ScopePanel), legal-risk framing (this proposal doc + vault decision `2026-08-01-einvoicecheck-converter-format-only-guardrails`), spike evidence (README). Covered.
- **Placeholder scan:** No TBD/TODO; all steps carry concrete code/test actions referencing the validated spike.
- **Type consistency:** `convert(xml, {mode})` signature matches the spike; `validateInvoice` signature preserved; `validateSchematron` output shape used consistently.

## Legal-risk summary (for external claims)

Validation is not enforcement: the FTA/ASP keeps rejection/penalty/audit authority; running the same rules does not make einvoicecheck a regulator. Real liability exposure comes from fabricating compliance (auto-writing data), overclaiming acceptance (FTA-approved/guaranteed language), and acting as a filing/transmission service (accreditation). Issuer remains responsible for invoice accuracy (Tax Procedures Decree-Law No. 28/2022; VAT Decree-Law No. 8/2017). Four guardrails make the converter safe: (1) format-only repair, (2) refuse on data-semantic errors, (3) audit trail + hashes, (4) draft-not-certification language. Confirm specifics with a UAE tax advisor before external publication.
