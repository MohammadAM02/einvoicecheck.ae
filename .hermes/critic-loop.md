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
| F-01 / CL-001 | Malformed XML returns semantic errors instead of parse error | P0 | ✅ RESOLVED / live-verified | Deployed `f9bce80` 2026-08-07 21:09 UTC+4 (Railway). Live API + free tool: `<Invoice>...</Invoicee>` → 1 ENG-PARSE-01, 0 semantic. Regression tests locked: API + web + packages. |
| F-02 | Wrong UBL namespace URIs pass validation | P1 | 🔄 IN PROGRESS | Strict XSD gate design+plan: `docs/superpowers/specs/2026-08-07-strict-ubl-xsd-validation-design.md`, `docs/superpowers/plans/2026-08-07-strict-ubl-xsd-validation.md`. |
| F-03 | Reverse-charge (AE) + non-zero VAT passes | P1 | unresolved | No cross-check between taxCategory code and taxAmount. |
| F-04 | Invalid dates like 2026-02-30 pass format check | P2 | unresolved | ibr-073 checks format pattern, not calendar validity. |
| F-05 | Valid UBL BaseQuantity price falsely rejected | P2 | unresolved | Engine's price extraction assumes simple PriceAmount shape. |
| F-06 | Generator fields lack programmatic labels | P2 | unresolved | CL-003. id + `<label for>` missing; `<fieldset>`/`<legend>` missing. |
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | unresolved | /contact, /legal/* say draft + unprovisioned; pricing says PayPal. |
| F-08 / CL-002 | Scope contradiction: docs vs Google indexed result | P1 | unresolved | Live docs say "XSD not included"; Google result says "official Schematron gate runs first." Strict XSD work resolves the capability side; docs wording must be re-checked after deploy. |
| F-09 | Homepage missing canonical tag | P2 | unresolved | CL-003. |
| F-10 | Results panel wastes desktop space (452px on 1363px viewport) | P3 | unresolved | CL-003. |
| F-11 | Generator wastes desktop width (single column) | P3 | unresolved | CL-003. |
| F-12 | Rate limit quota shown after submit, not before | P3 | unresolved | |
| F-13 | "API" and "Documentation" nav links both go to /docs | P3 | unresolved | CL-003. |
| F-14 | Existing XML Repairer still named Converter in API and backend contracts | P1 | 🔄 IN PROGRESS | Hard-rename design approved: `docs/superpowers/specs/2026-08-07-xml-repairer-hard-rename-design.md`. Implementation pending plan. |

## Resolved

| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | Malformed XML → semantic errors | 2026-08-07 21:09 | f9bce80 (was 5af5169 pre-rebase — ghost SHA) | Live API + free tool confirmed: 1 ENG-PARSE-01 with parser detail. |

## Repository monitor

- **Last scanned main commit:** `3014209906d9f279d1a72c447f75762451aec8ad` — `chore: consolidate critic-loop to single .hermes state file`
- **Scanned:** 2026-08-08
- Commits `1ffaaef`, `5af5cfc`, and `0408568` add approved design/implementation plans only. F-14 and F-02 remain in progress; no product implementation was claimed.
- Commit `3014209` consolidated state here, corrected the deployed parser-fix SHA to `f9bce80`, and recorded live API + free-tool reproduction. No product code changed in this commit.
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
