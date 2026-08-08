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
| F-03 | Reverse-charge (AE) + non-zero VAT passes | P1 | unresolved | No new live evidence recorded here. |
| F-04 | Invalid dates like 2026-02-30 pass format check | P2 | unresolved | No new live evidence recorded here. |
| F-05 | Valid UBL BaseQuantity price falsely rejected | P2 | unresolved | Engine behavior still requires separate verification. |
| F-06 | Generator fields lack programmatic labels | P2 | unresolved | Frontend audit branch is intended to add ids, associated labels and fieldset/legend semantics; do not mark fixed until verification passes. |
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | fixed-local | `/contact` and `/legal/*` are noindexed and removed from sitemap on current main. Draft/support/operator placeholders remain pending founder inputs and live deployment verification. |
| F-08 / CL-002 | Scope contradiction: docs vs Google indexed result | P1 | inspected | Repository copy was tightened in `4b20348`; live page and search re-index evidence are still required. |
| F-09 | Homepage missing canonical tag | P2 | unresolved | Frontend audit branch is intended to restore the canonical/schema change; verification pending. |
| F-10 | Results panel wastes desktop space (452px on 1363px viewport) | P3 | unresolved | Frontend audit branch is intended to restore focused desktop results mode; verification pending. |
| F-11 | Generator wastes desktop width (single column) | P3 | unresolved | Generator currently has a two-column desktop layout; visual verification is still separate from this state record. |
| F-12 | Rate limit quota shown after submit, not before | P3 | unresolved | No change in this audit pass. |
| F-13 | "API" and "Documentation" nav links both go to /docs | P3 | unresolved | Frontend audit branch is intended to replace them with one `API Docs` link; verification pending. |
| F-14 | Existing XML Repairer still named Converter in API and backend contracts | P1 | 🔄 IN PROGRESS | Backend/API naming is outside the frontend audit pass. |
| F-15 | Batch validator charges one free-tool quota unit for up to 50 upstream validations | P2 | open | Backend/rate-limit issue; outside the frontend audit pass. |
| F-16 | `/v1/validate` stops accepting canonical JSON without a compatibility window | P2 | open | API contract issue; outside the frontend audit pass. |

## Resolved

| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | Malformed XML → semantic errors | 2026-08-07 21:09 | `f9bce80` (was `5af5169` pre-rebase — ghost SHA) | Live API + free tool confirmed: 1 ENG-PARSE-01 with parser detail. |

## Repository monitor

- **Last scanned main commit:** `44dd1158a4e287c3100d8d01db913f149c54804d` — `fix(web): soften generator legend copy`
- **Scanned:** 2026-08-08
- `4b20348` tightened public claims, noindexed draft contact/legal pages, and removed those pages from the sitemap.
- `44dd115` accidentally deleted this canonical state file while softening generator legend copy; this audit branch restores it from clean history without conflict markers.
- F-01 remains live-verified only against the recorded `f9bce80` deployment evidence. No later deployment/live status is inferred.
- Exact official XSD/Schematron artifact/version parity and InvoiceTypeCode provenance remain AMG verification items.
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

## Smoke run 2026-08-07T18:01:30Z

- **1 passed, 3 regressions**
- REGRESSION: wrong UBL namespace — expected rule `KNOWN_GAP_F-02`, got: ENG-TRN-03/BT-48
- REGRESSION: reverse-charge AE + non-zero VAT — expected rule `KNOWN_GAP_F-03`, got:
- REGRESSION: invalid date 2026-02-30 — expected rule `KNOWN_GAP_F-04`, got:
