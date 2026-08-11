# Critic Loop — Shared Agent State

> Shared state between ChatGPT and Hermes. Read this file before making changes or claiming a fix.
> **This file (`.hermes/critic-loop.md`) is the ONLY critic-loop state.** The old root `critic-loop.md` was removed 2026-08-08; do not recreate it.

## Operating rules

1. Read this file before work.
2. Separate reported claims from independently verified facts.
3. Never mark a problem fixed from local tests alone.
4. A production fix needs:
   - commit SHA;
   - deployed commit or Railway deployment reference;
   - live reproduction;
   - test result recorded here.
5. One issue gets one owner and one next action.
6. If evidence conflicts, status becomes `blocked` until conflict is resolved.
7. Keep this file short. Put detailed reasoning in separate docs or code comments.
8. The repository monitor section records the last scanned main SHA. This is bookkeeping only, not deployment or live-verification evidence.
9. Commits that only change `critic-loop.md` are state-sync commits and must not trigger another state update.

## Status meanings

- `reported`: someone made a claim; not independently checked.
- `inspected`: code or evidence reviewed.
- `fixed-local`: local implementation/tests pass.
- `deployed`: deployment reference recorded.
- `live-verified`: production test confirms expected result.
- `blocked`: evidence conflicts or required access is missing.
- `open`: confirmed issue with no fix yet.

---

## Open findings

| # | Finding | Severity | Status | Hermes note |
|---|---|---|---|---|
| F-01 / CL-001 | Malformed XML returns semantic errors instead of parse error | P0 | ✅ RESOLVED / live-verified | Deployed `f9bce80` 2026-08-07 21:09 UTC+4 (Railway). Live API + free tool: `<Invoice>...</Invoicee>` → 1 ENG-PARSE-01, 0 semantic. New layered path in `a2dafd9` + tests in `3b22f0e` preserve the format gate in code; later batches are not live-verified, so production evidence remains tied to `f9bce80`. |
| F-02 | Wrong UBL namespace URIs pass validation | P1 | inspected | `0bdd555` centralizes Invoice/CreditNote XSD; `a2dafd9` adds layered validation; `6e6b1c0` adds `/v2/validate` and a wrong-namespace regression test expecting Structure/XSD failure. Deployment and live verification still required. |
| F-03 | Reverse-charge (AE) + non-zero VAT passes | P1 | unresolved | `388b72d` documents that the deterministic engine treats `AE` specially and the summary generator writes a notional 5% value; it calls for a v1.0.4 scenario matrix. Documentation evidence only; no fix, deployment, or live verification. |
| F-04 | Invalid dates like 2026-02-30 pass format check | P2 | unresolved | `388b72d` confirms the date adapter still relies on `Date.parse()`, which may normalize impossible dates. Documentation evidence only; no implementation or regression-test fix. |
| F-05 | Valid UBL BaseQuantity price falsely rejected | P2 | unresolved | `388b72d` records that line arithmetic still uses the normalized `quantity × unitPrice` model and keeps BaseQuantity semantics open. Documentation evidence only; representative PINT AE fixtures remain required. |
| F-06 | Generator fields lack programmatic labels | P2 | inspected | `2a77a7a` / merge `7d7cad5` add unique ids, associated labels, fieldset/legend groups, hidden line-item labels, and component tests. `8f3f822` also replaces duplicated visual steppers with semantic ordered lists, `aria-current="step"`, and focused primitive tests. Repository evidence only; test execution, deployment, and live accessibility verification remain required. |
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | fixed-local | `/contact` and `/legal/*` are noindexed and removed from sitemap on current main. Draft/support/operator placeholders remain pending founder inputs and live deployment verification. |
| F-08 / CL-002 | Scope contradiction: docs vs Google indexed result | P1 | inspected | `4b20348` tightened claims; `52c69da` adds a caveated What We Check page; `2ed4553`, `5d8de34`, `864fedd`, and `7abf2b4` wire navigation, homepage scope, sitemap, and tests. `388b72d` adds a repository-truth coverage baseline and safe/unsafe claim list. Deployment, live-page, and search re-index evidence remain required. |
| F-09 | Homepage missing canonical tag | P2 | inspected | `2a77a7a` / merge `7d7cad5` route homepage metadata through `pageMetadata({ path: '/' })` and add conservative website/organization/software schema. Deployment and live source verification remain required. |
| F-10 | Results panel wastes desktop space (452px on 1363px viewport) | P3 | inspected | `2a77a7a` / merge `7d7cad5` add desktop focused-results CSS: hide intro and expand result container to 920px. `8f3f822` adds mobile containment. `2913e65` moves validation into a dedicated station with a 1240px page/canvas and contained rule/code overflow. Repository evidence only; tests were not recorded as executed, and deployment plus live 375/768/1024/1440px visual verification remain required. |
| F-11 | Generator wastes desktop width (single column) | P3 | unresolved | Generator currently has a two-column desktop layout; visual verification is still separate from this state record. |
| F-12 | Rate limit quota shown after submit, not before | P3 | unresolved | No change in this audit pass. |
| F-13 | "API" and "Documentation" nav links both go to /docs | P3 | inspected | `2a77a7a` / merge `7d7cad5` replace both links with one `API Docs` entry and add a navigation regression test. Deployment and live navigation verification remain required. |
| F-14 | Existing XML Repairer still named Converter in API and backend contracts | P1 | 🔄 IN PROGRESS | Backend/API naming is outside the frontend audit pass. |
| F-15 | Batch validator charges one free-tool quota unit for up to 50 upstream validations | P2 | open | Backend/rate-limit issue; outside the frontend audit pass. |
| F-16 / CL-003 | API/Pricing contract contradiction: `/v1/validate` described as the new API | P0 | blocked | PR #20 merge `9a560cb5` closes the live browser copy/sample contradiction and production confirms the XML-only UI plus valid/broken XML samples. `36b6d8b` preserves the current contract in the signed-in Quickstart: XML uses `/v2/validate`, canonical JSON uses `/v1/preflight`, and beginner samples omit legacy `/v1/validate`. The only remaining gate is the authenticated endpoint matrix, which could not run without a production API key. |
| F-17 | Generator Invoice templates use type codes rejected by current PINT AE Billing rules and skip full Schematron validation | P1 | reported | `388b72d` reports `standard-tax-invoice` emits `388` and `summary-tax-invoice` emits `386`, while the vendored/current Billing v1.0.4 subset is `380`/`480`. `36b6d8b` also uses `388` in signed-in XML response and canonical-JSON Quickstart examples, expanding the unverified type-code claim beyond Generator. Code correction, full-pipeline tests, deployment, and live verification are absent. |
| F-18 | Mobile account drawer leaves hidden controls keyboard-focusable; Quickstart arrow keys change tabs without moving focus | P2 | open | In `36b6d8b`, the closed drawer is moved off-screen only by CSS transform and remains mounted without `inert`/`aria-hidden`; tab arrow handlers update selection but do not focus the newly selected tab. Escape restoration is tested, but closed-drawer tab order and roving-tab focus are not. Repository evidence only; deployment and live keyboard verification required. |
| F-19 | Homepage promises a practical fix for every validator finding although the engine may omit suggestions | P1 | open | `2913e65` says EInvoiceCheck shows “the smallest practical fix” and presents every result as Rule / Location / Meaning / Fix. The same commit’s design spec says not every engine finding includes a suggested fix. This is a repository-confirmed trust/capability mismatch; copy correction, test execution, deployment, and live verification are absent. |

## Resolved

| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | Malformed XML → semantic errors | 2026-08-07 21:09 | `f9bce80` (was `5af5169` pre-rebase — ghost SHA) | Live API + free tool confirmed: 1 ENG-PARSE-01 with parser detail. |

## Repository monitor

- **Last scanned main commit:** `2913e65ab17b681b82b053a6cf8684a0e3207cfa` — `feat(web): make homepage sell and validator feel like a product (#22)`
- **Scanned:** 2026-08-11
- PR #19 repository contract is recorded as: Browser Validator → XML only; `POST /v2/validate` → new XML; `POST /v1/preflight` → new canonical JSON; `POST /v1/validate` → legacy JSON/XML compatibility.
- PR #20 deploys that browser contract: XML-only copy, file acceptance and paste flow; a passing UBL/PINT-AE XML sample; and a broken XML sample with two expected semantic TRN findings.
- `8f3f822` adds shared tool headers, semantic workflow steppers, next-action panels, Generator/Repairer-to-Validator provenance, responsive overflow containment, and focused component tests.
- F-06 gains accessibility evidence for ordered workflow progress and `aria-current="step"`; status remains `inspected` pending test execution, deployment, and live accessibility verification.
- F-10 gains mobile containment evidence for long validator headings and repairer audit tables. The tracked desktop-width behavior is not live-verified.
- `36b6d8b` adds the signed-in workspace, current API Quickstart, recent usage read model, API-key controls, billing-plan UI, responsive shell, and focused component tests.
- F-16 gains repository evidence that signed-in guidance uses `/v2/validate` for XML and `/v1/preflight` for canonical JSON; authenticated production semantics remain unverified.
- F-17 expands: signed-in examples also present InvoiceTypeCode `388`; this remains unverified against the tracked PINT AE Billing rule concern.
- F-18 added: hidden mobile-drawer controls remain keyboard-focusable, and arrow-key tab selection does not move focus.
- `2913e65` reroutes homepage XML into a dedicated Validator Station through a single-use in-memory handoff, widens the work surface, preserves the XML-only browser and current API endpoint contract, and adds focused tests that the repository plan explicitly records as not executed.
- F-10 gains repository evidence for the wider validator/result surface; deployed responsive behavior remains unverified.
- F-19 added: homepage copy promises every finding includes a practical fix, contradicting the same commit’s design note that suggestions are not universal.
- No validation route, authentication backend, payment backend, legal, or SEO semantics changed in the reviewed diff. No deployment or live verification inferred.
- The monitor may write only this state file. It must not modify product code or claim deployment/live verification without evidence.

## Commit gate

Before `git commit`, Hermes MUST:
1. Read this file.
2. If any unresolved P0/P1 finding touches the files being changed, address or explicitly preserve its status.
3. Never convert repository implementation evidence into deployment/live evidence.

## Deploy gate

Before `git push`, Hermes MUST:
1. Run the available test/type/build suites.
2. If verification cannot run in the current environment, record that explicitly instead of claiming success.
3. After deploy, verify production separately and update this file only with evidence.

## Smoke run 2026-08-09T16:30:33Z

- **STATUS: BLOCKED / PARTIALLY LIVE-VERIFIED** — PR #20 merge `9a560cb5b5dfe04bbdb1453ea2980b2fa29960b1` is deployed; Railway reports both WEB and API production services successful.
- **PR #20 verification:** PASS — 126/126 non-Mongo web tests, focused browser-contract tests, production build, and `git diff --check`. Three unchanged MongoMemoryServer suites remained unavailable in the sandbox because `mongod` exited 100.
- **API health:** PASS — `GET https://api.einvoicecheck.ae/health` returned HTTP 200 with Mongo and Redis up.
- **Route reachability:** PASS only at the auth boundary — unauthenticated requests covering raw XML at `/v2/validate`, canonical JSON and XML at `/v1/preflight`, and all four legacy `/v1/validate` forms returned the expected HTTP 401. Authenticated payload semantics remain unverified because no production API key was available.
- **Browser Validator:** PASS — live copy is XML-only; the valid sample returned `Preflight passed`, 0 blocking issues, 0 warnings, invoice type 380, and 0 findings in format/structure/semantic. The broken sample returned `Preflight failed`, 2 blocking issues, 0 warnings, and exactly 2 semantic TRN findings.
- **Docs and pricing:** PASS — live `/docs` and `/pricing` present `/v2/validate` for raw XML, `/v1/preflight` for canonical JSON, and `/v1/validate` as legacy JSON/XML compatibility. No stale “`/v1/validate` = new API” wording was found.
- **Conclusion:** The browser contradiction from the prior smoke is closed in production. Keep CL-003 blocked until an authenticated production API matrix confirms accept/reject semantics for all three endpoints.

## Smoke run 2026-08-09T15:59:09.692Z

- **STATUS: BLOCKED / NOT LIVE-VERIFIED** — PR #19 merge `36b1c942acf536bec314a4df0939b4793d512453` is deployed in the API, but the complete production gate did not pass.
- **API health:** PASS — `GET https://api.einvoicecheck.ae/health` returned HTTP 200 with Mongo and Redis up.
- **Route reachability:** PASS only at the auth boundary — unauthenticated POSTs to `/v2/validate`, `/v1/preflight`, and `/v1/validate` all returned the expected HTTP 401. The authenticated contract matrix was not run because no production API key was available in the test context.
- **Browser Validator:** PARTIAL PASS — live XML submission completed end-to-end and returned layered results (format, structure, semantic). The live browser UI still advertises `PINT-AE XML or canonical JSON`; its “Try valid sample” is JSON and now returns the XML-only error. This contradicts the intended public story.
- **Docs:** PASS on the live page — `/docs` shows `/v2/validate`, `/v1/preflight`, and legacy `/v1/validate` wording.
- **Pricing:** PASS on the live page — plan bullets show `/v2/validate` XML, `/v1/preflight` canonical JSON, and legacy `/v1/validate` compatibility.
- **Stale new-API wording:** Not found on the current live `/docs` or `/pricing` pages. The browser/home validator copy remains stale on the XML-only boundary.
- **Conclusion:** Do not mark CL-003 live-verified or close the loop. The repository contract is resolved by merge SHA `36b1c942`; production remains blocked pending browser copy/sample correction, deployment, and an authenticated API matrix.

## Smoke run 2026-08-07T18:01:30Z

- **1 passed, 3 regressions**
- REGRESSION: wrong UBL namespace — expected rule `KNOWN_GAP_F-02`, got: ENG-TRN-03/BT-48
- REGRESSION: reverse-charge AE + non-zero VAT — expected rule `KNOWN_GAP_F-03`, got:
- REGRESSION: invalid date 2026-02-30 — expected rule `KNOWN_GAP_F-04`, got:
