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
| F-01 / CL-001 | Malformed XML returns semantic errors instead of parse error | P0 | ✅ RESOLVED / live-verified | Deployed `f9bce80` 2026-08-07 21:09 UTC+4 (Railway). Live API + free tool: `<Invoice>...</Invoicee>` → 1 ENG-PARSE-01, 0 semantic. New layered path in `a2dafd9` + tests in `3b22f0e` preserve the format gate in code; this batch is not deployed/live-verified, so production evidence remains tied to `f9bce80`. |
| F-02 | Wrong UBL namespace URIs pass validation | P1 | inspected | `0bdd555` centralizes Invoice/CreditNote XSD; `a2dafd9` adds layered validation; `6e6b1c0` adds `/v2/validate` and a wrong-namespace regression test expecting Structure/XSD failure. Implementation inspected; test execution, deployment, and live verification still required. |
| F-03 | Reverse-charge (AE) + non-zero VAT passes | P1 | unresolved | No cross-check between taxCategory code and taxAmount. |
| F-04 | Invalid dates like 2026-02-30 pass format check | P2 | unresolved | ibr-073 checks format pattern, not calendar validity. |
| F-05 | Valid UBL BaseQuantity price falsely rejected | P2 | unresolved | Engine's price extraction assumes simple PriceAmount shape. |
| F-06 | Generator fields lack programmatic labels | P2 | unresolved | CL-003. id + `<label for>` missing; `<fieldset>`/`<legend>` missing. |
<<<<<<< HEAD
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | unresolved | /contact, /legal/* say draft + unprovisioned; pricing says PayPal. |
| F-08 / CL-002 | Scope contradiction: docs vs Google indexed result | P1 | inspected | `6e6b1c0`, `345451a`, `8106742`, and `05fee5f` align API, free tool, result UI, and docs around layered XML validation. Repository wording is aligned; deployment, live page check, and Google re-index evidence are still missing. |
=======
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | fixed-local | /contact and /legal/* are now noindexed and removed from sitemap; draft/support placeholders remain pending operator inputs and live deployment verification. |
| F-08 / CL-002 | Scope contradiction: docs vs Google indexed result | P1 | unresolved | Live docs say "XSD not included"; Google result says "official Schematron gate runs first." Strict XSD work resolves the capability side; docs wording must be re-checked after deploy. |
>>>>>>> 5dc5f02 (fix(web): tighten public claims and draft indexing)
| F-09 | Homepage missing canonical tag | P2 | unresolved | CL-003. |
| F-10 | Results panel wastes desktop space (452px on 1363px viewport) | P3 | unresolved | CL-003. |
| F-11 | Generator wastes desktop width (single column) | P3 | unresolved | CL-003. |
| F-12 | Rate limit quota shown after submit, not before | P3 | unresolved | |
| F-13 | "API" and "Documentation" nav links both go to /docs | P3 | unresolved | CL-003. |
| F-14 | Existing XML Repairer still named Converter in API and backend contracts | P1 | 🔄 IN PROGRESS | Hard-rename design approved: `docs/superpowers/specs/2026-08-07-xml-repairer-hard-rename-design.md`. Implementation pending plan. |
| F-15 | Batch validator charges one free-tool quota unit for up to 50 upstream validations | P2 | open | `345451a` checks `checkToolRateLimit` once before a loop of up to 50 documents, although its contract says each invoice consumes one unit. This permits quota amplification and can exhaust the shared upstream API key. |
| F-16 | `/v1/validate` stops accepting canonical JSON without a compatibility window | P2 | open | `6e6b1c0` moves JSON to `/v1/preflight` and makes existing `/v1/validate` JSON calls return 400. This is a breaking v1 contract change; add compatibility/deprecation or a documented migration gate before deployment. |

## Resolved

| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | Malformed XML → semantic errors | 2026-08-07 21:09 | f9bce80 (was 5af5169 pre-rebase — ghost SHA) | Live API + free tool confirmed: 1 ENG-PARSE-01 with parser detail. |

## Repository monitor

- **Last scanned main commit:** `7664e881ea43dc040febc20687a6c6e99ef79fa9` — `fix(web): align validation fixtures with layered XML result`
- **Scanned:** 2026-08-08
- Commits `0bdd555`, `a2dafd9`, `6e6b1c0`, and `b4426ae` add the centralized Invoice/CreditNote XSD authority, layered XML core, strict v2/legacy v1/preflight contracts, response schemas, and regression tests.
- Commits `345451a`, `8106742`, `3b22f0e`, `05fee5f`, and `7664e88` proxy the free tool to v2, render/test layered results, align docs, add repairer result navigation, and update fixtures.
- F-02 and F-08 have repository implementation evidence only. No deployment or live-test evidence was present, so neither is live-verified.
- New risks: F-15 batch quota amplification; F-16 breaking JSON callers of `/v1/validate`.
- Commits `b86556c` and `0726dcc` are design/cleanup evidence; no additional finding change.
- The next scan must inspect commits after this SHA, ignore state-only critic-loop commits, and advance this baseline only when a product/code or material evidence commit has been evaluated.
- The monitor may write only this state file. It must not modify product code or claim deployment/live verification without evidence.

## Commit gate

Before `git commit`, Hermes MUST:
1. Read this file
2. If any unresolved P0/P1 finding touches the files being changed → address it
3. After fix, update status and mark resolved

## Deploy gate

Before `git push`, Hermes MUST:
1. Run both suites
2. If any resolved finding lacks live verification → flag it
3. After deploy, verify on live and update

## Smoke run 2026-08-07T18:01:30Z

- **1 passed, 3 regressions**
- REGRESSION: wrong UBL namespace — expected rule 'KNOWN_GAP_F-02', got: ENG-TRN-03/BT-48
- REGRESSION: reverse-charge AE + non-zero VAT — expected rule 'KNOWN_GAP_F-03', got:
- REGRESSION: invalid date 2026-02-30 — expected rule 'KNOWN_GAP_F-04', got:
