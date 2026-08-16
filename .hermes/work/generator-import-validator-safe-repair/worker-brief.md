# Worker Brief — Generator Import + Validator Safe Repair

You are the implementing agent for the einvoicecheck.ae monorepo. You work **only** inside this worktree:

```
C:/Users/AMG/code/https-einvoicecheck.ae/.worktrees/fileconverter
```

Branch: `fileconverter` (currently clean at `1b1933c`). The main checkout at `C:/Users/AMG/code/https-einvoicecheck.ae` and all other worktrees are **off limits** — do not run git, npm, or file operations there.

## Read first (mandatory, in order)

1. `.hermes.md` — the project contract (do not implement unapproved work, do not push/deploy, never claim success without fresh command output).
2. `AGENTS.md` — agent rules.
3. `.hermes/critic-loop.md` — shared findings. **F-17** (Generator template type codes `388`/`386` vs PINT AE Billing `380`/`480`) is **explicitly OUT OF SCOPE** — do not change any Generator template type code, business rule, or PINT-AE Billing rule. **F-14** (Repairer still named Converter in API/backend) is the finding this work's Part B legitimately addresses. Do not touch the status of any other finding.
4. `specs/generator-import-validator-safe-repair/design-lock.md` — locked product decisions.
5. `specs/generator-import-validator-safe-repair/implementation-spec.md` — the full specification you must implement: Part A (Generator import) and Part B (fold safe repair into Validator, retire Repairer + `/v1/convert`).

This task was approved by the founder. Implementation approval is granted **only** for the scope in the spec. Anything outside it (new repair APIs, PDF/XLSX/OCR ingestion, field dropping, weakening validation, persistence, deployment) is forbidden and must NOT be built.

## Your job

Implement the entire spec. The "Expected code areas" section names the near areas; "Acceptance summary" (13 items) defines done; "Verification expectations" defines what you must run; "Agent freedom" defines what you may choose. Stay inside those areas and avoid unrelated refactors.

## Hard invariants (non-negotiable)

1. `validateXmlDocument()` is the sole final-XML authority for Generator output, Validator, batch, and every safe-repair candidate. Canonical JSON preflight stays separate.
2. No new public repair API. `/v1/convert` is removed. Repair output is only ever returned after an explicit UI action. `/v2/validate` evolves additively so existing clients still understand the base result. One request = one validation unit even when a candidate is evaluated internally.
3. Only TWO automatic repairs: (a) encoding declaration normalization `ISO-8859-1` → `utf-8` only when the received string is cleanly decoded with no `U+FFFD`; (b) adding a missing exact `cbc`/`cac` declaration when all the spec's conditions hold. Never: delete forbidden characters, overwrite an existing wrong namespace URI, normalize prefix casing, or repair structure/semantics. No URI typo allowlist.
4. Fingerprint: parse original XML into the canonical invoice model **before any mutation**, compare against the candidate, abort on any business-value difference. The fingerprint baseline must be taken from the untouched original (this closes the pre-parse sanitizer gap).
5. Strict mode is default and only returns repaired XML that passes the complete pipeline. Format-only is an explicit Advanced option, clearly labeled, never claims validity, and shows a prominent "Format repaired — invoice still has blocking issues" warning with full findings.
6. Imports: fixed CSV (one published template, one row per line, rows grouped by invoiceNumber, conflicting repeated fields fail) and Generator JSON (`{template,data}` object or 1–50 array). Parse in the browser. Unknown populated fields fail the import — never silently drop or reinterpret. Blank-only unknown columns are allowed. 1–50 invoices; reject 0 or >50 before generation.
7. Source files stay in browser memory only — never upload or persist the CSV/JSON. Product copy must be accurate: source file stays local, normalized invoice data IS sent to the backend Generator. No secrets, no invoice payload logging.
8. Batch generation reuses the existing single-invoice `/v1/generate` path per invoice (sequential or modest bounded concurrency, never unbounded `Promise.all`). Partial success preserved; retrying failed invoices must not regenerate successful ones unless the user asks. Failed invoices open prefilled in the manual Generator form. Successful XML downloads individually and as a ZIP of separate files with filesystem-safe, collision-resistant names. Never combine invoices into one XML.
9. Imports use the same templates, calculations, escaping, and backend validation as manual invoices. The browser never computes authoritative XML or totals.
10. Generators: pick ONE maintained browser-compatible CSV parser and ONE ZIP library, record the bundle/security rationale in the spec's spirit, update the lockfile. No broader import framework.
11. Security by design: secrets only via environment, never hardcoded. Server-side validation remains. No weakening of the fail-closed gate.
12. Retirement: remove Repairer from navigation, tool lists, dashboard links, sitemap, active copy, and free-tool proxy; permanently redirect `/tools/xml-repairer` → main Validator; remove `POST /v1/convert` (route, OpenAPI tag, quota expectations, docs). Move `downloadXml`/`copyXml` helpers from `repairer-client.ts` to a neutral browser utility before deleting the Repairer client. Historical design docs may remain.

## Dependencies

- No `node_modules` are installed in this worktree. Install from the committed lockfiles: `npm ci` in `app/api` and `app/web` (there is no root package-lock.json — skip root).
- Node v22 and npm are on PATH. Use `C:/...`-style paths for native tools.

## Baseline discipline

After `npm ci`, run the baseline suites **before** making changes and record exact results (the spec records that the planning baseline could not run — your baseline run is the first evidence). If a baseline suite fails for environment reasons (e.g. Mongo memory server needs `mongod`), record the exact failure and continue; do not silently claim a pass. If a pre-existing failure blocks the spec's acceptance items, record it explicitly rather than fixing unrelated code.

## Commits

Commit at logical milestones on `fileconverter` with conventional messages — at minimum: one commit when Part A is green, one when Part B is green, one for retirement/docs/nav cleanup. **Do not push. Do not deploy.** Leave the tree clean at the end.

## Verification (must actually run; record exact output in your report)

Minimum required, all from fresh runs at the end:

- `app/api`: `npm test` (vitest run)
- `app/web`: `npm test` (vitest run)
- `app/web`: `npm run build` (next build)
- `git diff --check`

Focused checks required by the spec (add tests where listed):

- CSV: quoting, commas, newlines, BOM, duplicate headers, conflicting invoice rows, empty and >50 imports.
- JSON: object/array contracts, unknown populated fields.
- Partial success, retry-failed-only, manual-form prefill, filename collisions, ZIP contents.
- Forbidden-character diagnosis without mutation; clean and corrupted encoding cases.
- Exact missing `cbc`/`cac` repair boundaries; valid mixed-case namespace aliases untouched; wrong existing namespace URI diagnosis without replacement; fingerprint adversarial mutation fails.
- Strict vs Format-only UI behavior; full XSD and Schematron candidate results.
- `/v1/convert` removal and `/tools/xml-repairer` redirect; no repairer references in active navigation, dashboard, sitemap, or current product copy.

If any suite cannot run in this environment, record the exact failure — never claim success without fresh command output.

## Fixed final report format

End with a section titled `## FINAL REPORT` containing:

1. Commit SHAs created on `fileconverter` (git log --oneline -10).
2. Changed/new/deleted files (git status and git diff --stat).
3. Commands run with exact results: each test/build command, exit code, and pass/fail counts.
4. CSV/ZIP dependency choices and rationale.
5. Deviations from the spec (if any) and why.
6. Limitations or environment failures encountered.
7. Any uncommitted changes left behind.
