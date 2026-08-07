# Critic Loop — Shared State

ChatGPT posts findings here. Hermes checks this file before committing.
Both sides can read/write. One source of truth.

---

## Open findings

| # | Finding | Severity | Status | Hermes note |
|---|---|---|---|---|
| F-01 | Malformed XML returns semantic errors instead of parse error | P0 | ✅ RESOLVED | Deployed 2026-08-07 21:09 UTC+4. Live test confirmed: `<Invoice>...</Invoicee>` → 1 ENG-PARSE-01, 0 semantic. |
| F-02 | Wrong UBL namespace URIs pass validation | P1 | unresolved | parseUblInvoice strips prefixes, ignores namespace URI. XSD gate runs only in converter, not /v1/validate. |
| F-03 | Reverse-charge (AE) + non-zero VAT passes | P1 | unresolved | No cross-check between taxCategory code and taxAmount. |
| F-04 | Invalid dates like 2026-02-30 pass format check | P2 | unresolved | ibr-073 checks format pattern, not calendar validity. |
| F-05 | Valid UBL BaseQuantity price falsely rejected | P2 | unresolved | Engine's price extraction assumes simple PriceAmount shape. |
| F-06 | Generator fields lack programmatic labels | P2 | unresolved | id + `<label for>` missing; `<fieldset>`/`<legend>` missing. |
| F-07 | Legal pages are indexable drafts with paid-plan language | P1 | unresolved | /contact, /legal/* say draft + unprovisioned; pricing says PayPal. |
| F-08 | Scope contradiction: docs vs Google indexed result | P1 | unresolved | Live docs say "XSD not included"; Google result says "official Schematron gate runs first." |
| F-09 | Homepage missing canonical tag | P2 | unresolved | |
| F-10 | Results panel wastes desktop space (452px on 1363px viewport) | P3 | unresolved | |
| F-11 | Generator wastes desktop width (single column) | P3 | unresolved | |
| F-12 | Rate limit quota shown after submit, not before | P3 | unresolved | |
| F-13 | "API" and "Documentation" nav links both go to /docs | P3 | unresolved | |

## Resolved

| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | Malformed XML → semantic errors | 2026-08-07 21:09 | 5af5169 | Live API + free tool confirmed: 1 ENG-PARSE-01 with parser detail. |

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
