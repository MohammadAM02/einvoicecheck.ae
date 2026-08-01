# Spike 001 — Converter: format-only repair + audit-trail guardrails

**Date:** 2026-08-01 · **Engine:** `spike-001` (Node 22, fast-xml-parser 5.10.1 from `app/api/node_modules`)

Decision context: [[2026-08-01-einvoicecheck-converter-format-only-guardrails]] (vault).
Question: can a converter fix *format* without ever touching *data*, audit every
change, and **refuse** when the invoice has data-semantic errors?

## Decomposition

| # | Spike | Validates (Given/When/Then) | Risk |
|---|-------|----------------------------|------|
| 001 | format-only-repair | Given an XML invoice with only structural defects, when repaired, then output re-parses AND no data value changed | Medium |
| 002 | audit-trail | Given a repaired document, when converted, then every change has rule/path/old/new/reason + input/output hashes | Low |
| 003 | refuse-guardrail | Given an invoice with data-semantic errors, when converter runs, then it refuses with a blocked list; no fabricated output | High |

## Approach

Pipeline: **sanitize → well-formedness gate → data-semantic classifier → refuse |
repair → re-validate → data-integrity fingerprint → output + audit**.

- **Repairers** (each tagged, auditable, structure-only): `FMT-CHARS-01`
  (illegal XML chars), `FMT-PREFIX-01` (prefix case), `FMT-NS-01` (namespace URI),
  `FMT-NS-02` (missing namespace declaration), `FMT-DECL-01` (encoding decl).
- **Classifier** mirrors the repo engine: `ENG-REQ-*` (required values),
  `ENG-TRN-01/03` (15-digit TRNs), `ENG-LINE-01`, `ENG-TAX-09`, `ENG-TOT-15`,
  plus `ENG-NUM-01` (non-numeric amount = blocking, never skipped).
- **Refuse semantics:** any data-semantic hit → `REFUSED / DATA_SEMANTIC`, no
  output, dry-run report of what *would* have been fixed. Unparsable/unrepairable
  structure → `REFUSED / UNREPAIRABLE_FORMAT` (never guess structure).
- **Data-integrity guard:** pre/post repair fingerprints of all data values
  (IDs, dates, TRNs, line nets, tax, totals) must match, else `ERROR / DATA_CHANGED`.

## Results

Run: `node convert.js --all`

| sample | status | changed | audit | blocked | notes |
|--------|--------|---------|-------|---------|-------|
| 00-valid.xml | NOOP | no | 0 | 0 | valid doc passes through untouched |
| 01-format-only.xml | CONVERTED | yes | 4 | 0 | control char removed, 63 `Cbc:`→`cbc:` renames, cbc URI `CommonBasicComponents`→`-2`, encoding decl → utf-8. **All data intact** (fingerprint guard) |
| 02-data-semantic.xml | REFUSED | — | 0 | **4** | TRN `123` (ENG-TRN-01), line net 150 vs qty×price 200 (ENG-LINE-01), VAT 7 vs 5 (ENG-TAX-09), inclusive 105 vs 150+7 (ENG-TOT-15) |
| 03-mixed.xml | REFUSED | — | 0 | **1** | format defects present (bad URI, `Cbc:`), but data TRN fails → **no partial output**, format not repaired |
| 04-unrepairable.xml | REFUSED | — | 0 | 0 | unclosed root → `UNREPAIRABLE_FORMAT`, converter does not guess structure |
| 05-missing-ns.xml | CONVERTED | yes | 1 | 0 | missing `xmlns:cac` declaration added (FMT-NS-02), data untouched |

Full audit for 01 (rule, action, target, old→new, reason) + SHA-256 input/output
hashes are produced by the prototype; see `convert.js`.

## Finding during the spike (silent-skip bug)

First run of 02 blocked only 1 issue instead of 4. Cause: fast-xml-parser with
`parseTagValue: false` returns attributed elements as objects
(`{ '#text': '150.00', '@_currencyID': 'AED' }`), so `parseFloat()` returned NaN
and the arithmetic/VAT/totals checks **silently skipped** — exactly the
false-confidence hole the repo's `ENG-NUM-01` guard (PRODUCTION_STATUS Fault #1)
exists to prevent. Fixed: classifier unwraps `#text` (`textOf`) and treats
missing/non-numeric amounts as blocking (`numOf` → null → `ENG-NUM-01`).

## Verdict: VALIDATED (with production caveats)

### What worked
- Format-only repair converts a structurally broken invoice and **never changes
  a data value** (proved by pre/post fingerprint on every conversion).
- Audit trail is complete: rule ID, target, old → new, reason + input/output
  hashes. Deterministic on the same input.
- Refuse-guardrail holds: data errors block output entirely; mixed documents get
  **no partial repair**; unrepairable structure is refused, never guessed.

### What didn't / production caveats
- **Regex repairers are context-limited.** Audit `target`s are best-effort paths,
  and multi-occurrence renames batch into one entry (63 prefix renames → 1 row).
  Production needs DOM/XSLT-based repairers for per-node XPath-level audit rows.
- **Encoding re-declaration** (ISO-8859-1 → utf-8) is only safe when content is
  ASCII-clean; production needs byte-level encoding detection before re-declaring.
- **Classifier must stay in lockstep with the engine** (same rule IDs, same
  numeric handling). Drift → false refuse or false convert. This is the same
  api↔web rule duplication risk already tracked in PRODUCTION_STATUS §6.

### Recommendation for the real build
Same pipeline shape, three upgrades: (1) repairers over an XML DOM (e.g.
`@xmldom/xmldom` or XSLT) with per-node audit entries; (2) classifier extracted
from the actual engine rules (shared `@einvoicecheck/rules` package — also fixes
the api↔web duplication); (3) refuse semantics, fingerprint guard, and
STE error text exactly as prototyped. Converter stays format-only, always.

**Build as: `app/api/src/rules/convert/` (repairers) + `app/api/src/rules/audit.js`
(audit model), wired behind the existing `/validate` route as an opt-in
`?convert=format` flag.**

## Interactive demo

Two HTML pages run the REAL `convert()` pipeline through a zero-dep Node server:

- `demo/format-only.html` — format repair layer: sample/paste XML → repaired
  draft + audit trail + hashes. Data issues shown as warnings, never fixed.
- `demo/full-converter.html` — full guardrailed pipeline: CONVERTED / NOOP /
  REFUSED (DATA_SEMANTIC or UNREPAIRABLE_FORMAT) / ERROR states, blocked-rule
  table, audit trail, SHA-256 hashes.

```bash
node demo/server.js          # http://localhost:7357
```

`convert()` now accepts `{ mode: 'format' | 'full' }` (default `full`); format
mode repairs but reports data issues as `dataIssues` instead of refusing. CLI
unchanged. Server routes: `GET /format-only.html`, `/full-converter.html`,
`/samples/<file>`, `POST /api/convert {"xml","mode"}` (256 KB cap).
