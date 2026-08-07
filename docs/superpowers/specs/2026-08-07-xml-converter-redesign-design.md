# XML Converter Redesign — Design Spec

**Date:** 2026-08-07
**Status:** Approved for implementation
**Branch base:** `origin/main` (deployed lineage — NOT local `main`, which has diverged)

---

## 1. Context & Ground Truth

The user reported the XML converter page (`/tools/xml-converter`) is "too confusing." Initial local inspection concluded the tool was dead (unlinked in local `main`), but that was **wrong for production**:

| | Local `main` (aa2a7a4) | `origin/main` = LIVE (b375cb0) |
|---|---|---|
| Converter in `TOOL_SLUGS` | ❌ Unlinked | ✅ Live |
| API `POST /v1/convert` | ❌ Deleted | ✅ Exists (`routes/convert.js` + `rules/convert/`) |
| PINT-AE assets | v1.0.3 compliance dir (untracked) | ✅ v1.0.4 (`pint-ae-resources/`) + XSD gate |
| Extra | compliance manifest | layer badges, validator tier labels |

**Critical deployment note:** local `main` and `origin/main` diverged (`origin/main` was force-pushed `e93cfc9…b375cb0`). Deploying local `main` would remove the converter and break `/v1/convert`. **All redesign work must be based on `origin/main`.** The divergence itself is a separate repo-hygiene issue, tracked in §9.

### Live converter behavior (verified)
- `GET /tools/xml-converter` → 200, renders `ConverterWorkspace` under the `xml-converter` slug.
- `POST /v1/convert` → exists, 401 without key, authenticated + rate-limited + metered, mirroring `/v1/validate` security posture.
- Engine behavior: format-only repair with refusal guardrails (`CONVERTED` / `NOOP` / `REFUSED` / `ERROR`; reasons `UNREPAIRABLE_FORMAT`, `DATA_SEMANTIC`, `DATA_CHANGED`). Never alters data values. Produces audit trail + SHA-256 hashes.

## 2. Goals

1. Make the converter page feel like **one job**: paste broken XML → get fixed XML.
2. Route validation to the existing validator page (handoff, not an embedded wizard).
3. Use **official PINT-AE 1.0.4 example XMLs** for "Try a sample" (deployed API already bundles them; web currently uses a hand-rolled sample).
4. Preserve the security posture: no payload persistence, server-side key, IP rate limiting.
5. **Rename the tool** from "XML Converter" → **"XML Repairer"** (display name, URL slug, and internal component names — full authority granted by owner).

## 3. Non-Goals

- No changes to the API engine (`/v1/convert` contract stays as-is).
- No changes to the validator page's engine or layout beyond the pre-fill handoff hook.
- No new backend endpoints.
- No rebranding or site-wide visual overhaul.

## 4. Flow

```
/tools/xml-converter                     /tools/uae-e-invoice-validator
  [ one input zone: paste / drop /       (existing page, unchanged engine)
    upload / sample ]                          ▲
  [ Repair (single mode) ]                     │ sessionStorage handoff
  └► verdict + download/copy                   │ (Option 1, approved)
     + "Validate repaired invoice →" ──────────┘
```

- The converter does **one job**: repair format → return a file.
- Validation is a handoff: repaired XML is written to `sessionStorage`, the validator reads it on mount, pre-fills the textarea, and clears the key.

## 5. Component Changes (web)

### 5.1 `app/web/src/components/ConverterWorkspace.tsx` — rewrite
- **Remove the mode toggle** (`full` / `format` radio). Engine always runs the safe full behavior (format repair + refusal on data errors). The `mode` parameter is dropped from the client; the route keeps accepting it for API compat but the page never sends it.
- **Single input zone**: one drop-anywhere area that handles paste, drag-drop, and file upload; plus a "Try a sample" link. Replaces the separate upload button + drag handlers + paste textarea as distinct affordances.
- **Result view, verdict first**:
  - `CONVERTED` → "Repaired — N fixes" (green)
  - `NOOP` → "No changes needed" (neutral)
  - `REFUSED` → "No changes made" + plain reason (e.g. "The invoice has data errors (TRN, amounts, VAT) that a converter must not fix." / "The XML is not well-formed and the converter refuses to guess.")
  - `ERROR` → "Internal error" + retry
  - Remove the "Refused" label — reads as an external rejection.
- **Plain-language change summary** replacing the raw audit table as the primary detail: "Fixed namespace URIs, prefix casing, missing declaration" (derived from `audit[].action` + rule names).
- **Download repaired XML** button (Blob + `<a download>`), **Copy** button (clipboard API). Shown for `CONVERTED` / `NOOP`.
- **"Validate repaired invoice →"** primary CTA (shown on `CONVERTED` / `NOOP`): writes `{ source: 'xml-converter', xml: <output> }` to `sessionStorage`, then `router.push('/tools/uae-e-invoice-validator')`.
- **"Technical details" accordion** (collapsed by default): audit trail table, SHA-256 hashes, engine version. Compliance evidence on demand.

### 5.2 `app/web/src/lib/converter-client.ts`
- Keep `convertXml` and `readXmlFile` (route contract unchanged).
- Drop the `mode` argument from the client call (page always sends format-repair).
- Add `downloadXml(filename, content)` + `copyXml(content)` helpers (or keep in component; whichever is cleaner — prefer lib for testability).

### 5.3 `app/web/src/components/validation/ValidatorWorkspace.tsx` — handoff hook
- On mount, read `sessionStorage.getItem('einvoicecheck:converter-handoff')`.
- If present and shape-valid `{ source: 'xml-converter', xml: string }`: `setDocumentText(xml)`, auto-run `validate(xml, 'repaired.xml')`, clear the key. Do NOT auto-run on the homepage context (`context === 'tool'` only).
- Safe against missing/stale/malformed values — silently ignored, no errors surfaced.

### 5.4 `app/web/src/app/tools/[slug]/page.tsx`
- Update the `xml-converter` blurb/description only if needed to match the new UX wording (verdict-first copy). Keep SEO title/keyword.

## 6. Samples — Official PINT-AE 1.0.4

- Vendor 2–3 **small** official example XMLs into the web app as static assets, copied from `app/api/pint-ae-resources/trn-invoice/example/` and `trn-creditnote/example/` on `origin/main`.
- Candidates (small, representative): `Standard tax invoice.xml`, `Summary tax invoice.xml`, `Standard tax credit Note.xml` (credit note).
- Replace the hand-rolled `SAMPLE_XML` constant. "Try a sample" loads one of these (pick order: standard invoice, then others).
- Source files are Apache-2.0-licensed OpenPeppol examples already vendored in the API; copying to web assets is consistent with existing vendoring practice. Record source path in a comment.
- Verify each sample is **valid** (passes `NOOP`) so the demo shows a clean "no changes needed" state. A deliberately-broken sample for the "Repaired — N fixes" state is out of v1 (an optional follow-up); the repair state is still covered by component tests with synthetic fixtures.

## 7. Rename — "XML Converter" → "XML Repairer"

Owner approved: display name, URL slug, and internal component names all change. **No redirect** from the old slug (clean break, old links 404 — accepted trade-off).

### 7.1 Rename surface (deployed lineage, origin/main)

| File | Current | New |
|---|---|---|
| `app/web/src/app/tools/[slug]/page.tsx` | TOOLS key `'xml-converter'`, h1 `'XML Converter'`, SEO title `'Free UBL XML converter — …'`, `targetKeyword: 'UBL XML converter'`, blurb, context copy, render condition `slug === 'xml-converter'` | TOOLS key `'xml-repairer'`, h1 `'XML Repairer'`, SEO title `'Free UBL XML repairer — fix format defects before validation'`, `targetKeyword: 'UBL XML repairer'`, blurb/context copy reworded to repair-first |
| `app/web/src/lib/site.ts` | `TOOL_SLUGS` contains `'xml-converter'` | `'xml-repairer'` |
| `app/web/src/components/Chrome.tsx` | nav `{ href: '/tools/xml-converter', label: 'XML Converter' }` | `{ href: '/tools/xml-repairer', label: 'XML Repairer' }` |
| `app/web/src/components/ConverterWorkspace.tsx` | component + class names | rename to `RepairerWorkspace` (impl: `git mv`, update imports) |
| `app/web/src/lib/converter-client.ts` | file + `convertXml`/`readXmlFile` + `ConverterClientError` | rename file to `repairer-client.ts`, update symbol names + imports (keep `convertXml` call to `/api/tools/convert` — the web proxy route path is unchanged) |
| `app/web/src/app/api/tools/convert/route.ts` | `TOOL = 'uae-e-invoice-converter'` (rate-limit namespace), error strings "converter…" | `TOOL = 'uae-e-invoice-repairer'`, error strings "repairer…". **Route path `/api/tools/convert` stays** (internal contract; renaming breaks the client + Redis namespace continuity). |
| Analytics events | `converter_input_selected`, `converter_error`, `converter_submitted`, `converter_result` | rename to `repairer_*` (tracked in `ConverterWorkspace`/`RepairerWorkspace`) |
| `app/web/src/app/sitemap.ts` | derives from `TOOL_SLUGS` | auto-follows — no manual change |

### 7.2 Explicitly NOT renamed (contract stability)

- **API path `POST /v1/convert`** — paid API contract; renaming breaks consumers. The endpoint's internal name stays "convert".
- **Web proxy route `/api/tools/convert`** — internal but referenced by the client; kept for continuity (see above).
- **API test files** (`app/api/test/convert*.test.js`, fixtures) — unchanged; they test the contract, not the web tool name.
- **Redis `plan:limits:*` and tool rate-limit namespace** — only the tool namespace `uae-e-invoice-converter` becomes `uae-e-invoice-repairer`; the `plan:limits:*` contract is untouched.
- **sessionStorage handoff key** — see §5.3; named `einvoicecheck:converter-handoff` and kept (not user-visible; changing it adds churn for zero gain).

### 7.3 SEO note

Old slug `/tools/xml-converter` 404s after deploy (no redirect, per owner decision). New slug `/tools/xml-repairer` is statically generated via `generateStaticParams` from `TOOL_SLUGS`, so it appears in the sitemap automatically. The `targetKeyword` change from "UBL XML converter" → "UBL XML repairer" is a deliberate SEO pivot; the old keyword's equity is not carried over (accepted as part of the clean break).

## 8. Files Touched

| File | Change |
|---|---|
| `app/web/src/components/ConverterWorkspace.tsx` → `RepairerWorkspace.tsx` | Rename + rewrite per §5.1 |
| `app/web/src/lib/converter-client.ts` → `repairer-client.ts` | Rename; drop `mode`, add download/copy helpers |
| `app/web/src/components/validation/ValidatorWorkspace.tsx` | sessionStorage handoff hook (§5.3) |
| `app/web/src/app/tools/[slug]/page.tsx` | Slug/name/copy changes per §7.1 |
| `app/web/src/lib/site.ts` | `TOOL_SLUGS` `'xml-converter'` → `'xml-repairer'` |
| `app/web/src/components/Chrome.tsx` | Nav label + href per §7.1 |
| `app/web/src/app/api/tools/convert/route.ts` | Tool namespace + error strings per §7.1 (path unchanged) |
| `app/web/src/lib/validation-samples.ts` | (unused by converter; no change) |
| New: web sample assets (2–3 XML files) | Under `app/web/src/lib/samples/` or `public/` (impl choice) |
| `app/api/src/rules/xml.js` + `app/web/src/lib/rules/xml.js` | Engine fix §9.2 — parse line-level AllowanceCharge (BOTH trees) |
| `app/api/src/rules/checks/vatCategory.js` + web copy | Engine fix §9.3 — AE rate not enforced (BOTH trees) |
| `app/api/src/rules/checks/taxBreakdown.js` + web copy | Engine fix §9.3 — AE skips tax arithmetic (BOTH trees) |
| `app/api/scripts/generate-codelists.mjs` | Engine fix §9.3 — AE rate source of truth; re-derive both codelists.js |
| New: `app/web/test/engine-parity.test.ts` | Parity guard §9.4 (currently missing despite validation.ts claim) |
| `app/api/test/*` | Engine fix tests §9.5 |
| `app/web/test/*` | Extend per §10 |

## 8. Security & Privacy

The redesign touches user-supplied invoices (business/personal data) and the existing server-side API-key plumbing. No new attack surface is introduced — the changes are UX-only — but the guarantees are restated so they are explicit and audited:

1. **No payload persistence.** The converter route stores nothing about the submitted invoice (existing behavior, unchanged). The sessionStorage handoff lives only in the user's own tab and is cleared after the validator reads it; it never leaves the browser and never touches a server.
2. **Server-side enforcement.** The browser tool calls the web proxy route (`/api/tools/convert`), which holds `EINVOICECHECK_API_KEY` server-side only. The key is never shipped to the client bundle (existing behavior, unchanged).
3. **Abuse control.** The tool endpoint keeps the existing IP rate limit (salted SHA-256 IP hash, fixed window in shared Redis). No per-user auth added — free tool stays zero-login.
4. **Client-side safety.** Download uses a Blob URL created in the browser (no server round-trip of repaired XML); copy uses the async Clipboard API. No secrets in the bundle.
5. **Data privacy.** Repaired XML is only ever in: (a) the user's browser memory, (b) the sessionStorage handoff (same-tab, auto-cleared), (c) transit to the existing `/api/tools/convert` → `/v1/convert` path that already persists nothing. The existing privacy/legal pages cover the payload-retention story.
6. **Pre-launch audit checklist.**
   - [ ] Verify no `EINVOICECHECK_API_KEY` reference ships in client-side bundles (`NEXT_PUBLIC_` prefix check).
   - [ ] Confirm sessionStorage key is cleared after validator read and on converter reset.
   - [ ] Confirm the download Blob URL is revoked after use (memory hygiene).
   - [ ] Re-run the API/web test suites and a manual E2E (CONVERTED + REFUSED cases) against the deployed API.
   - [ ] Confirm the official tax-invoice samples now pass both `/v1/convert` and `/v1/validate` (engine fixes §9).

## 9. Engine Fixes — False Positives on Official Tax-Invoice Samples

Owner approved: both engine fixes ship with this redesign (the samples feature depends on them — two of the three candidate official samples currently REFUSE).

### 9.1 Reproduced failures (official PINT-AE 1.0.4 samples, deployed engine)

| Sample | Result | Blocked rules |
|---|---|---|
| `Standard tax invoice.xml` | REFUSED (DATA_SEMANTIC) | ENG-LINE-05 — line net 10486.00 ≠ qty×price 9800.00 |
| `Summary tax invoice.xml` | REFUSED (DATA_SEMANTIC) | ENG-VAT-04, ENG-TAX-09 — AE category at rate 5, tax 0.00 |
| `Standard invoice Mandatory fields.xml` | NOOP | — |
| `Commercial invoice.xml` | NOOP | — |

XSD gate and Schematron both pass on the official samples — the false positives are purely in the semantic engine, which the repairer mirrors (classify → REFUSE on any error).

### 9.2 Bug 1 — Line-level AllowanceCharge never parsed

**Root cause:** `app/api/src/rules/xml.js` `parseUblInvoice()` hardcodes `allowance: 0, charge: 0` per invoice line and never reads `cac:InvoiceLine/cac:AllowanceCharge`. `ENG-LINE-05` (lineArithmetic.js) *correctly* computes `qty×price − allowance + charge`, so any line with a discount or charge false-fails. The official "Standard tax invoice" line 1: qty 2000, base 9800, discount 294 (3%), charge 980 (10%) → 9800 − 294 + 980 = **10486** ✓.

**Fix:** in `parseUblInvoice()`, parse `ln.AllowanceCharge` (repeatable, per UBL):
- `ChargeIndicator=false` → sum into `allowance`
- `ChargeIndicator=true` → sum into `charge`
- Use `Amount` (not `BaseAmount` × `MultiplierFactorNumeric` — Amount is authoritative; fall back to computed if absent).

### 9.3 Bug 2 — AE (reverse-charge) category rate expectation

**Root cause:** `scripts/generate-codelists.mjs` line 23 hardcodes `expectedRates = { …, AE: 0, … }`, and the generated `codelists.js` carries `"AE": { name: "VAT Reverse Charge", expectedRate: 0 }`. `vatCategory.js` then enforces `rate === 0` for AE (ENG-VAT-04), and `taxBreakdown.js` enforces `tax = taxable × rate` (ENG-TAX-09). The official PINT-AE sample carries **AE + 5% + tax 0** — a legitimate reverse-charge representation (notional rate 5%, seller VAT amount 0, buyer self-assesses). The vendored jurisdiction Schematron only requires the AE breakdown to exist (`aligned-ibrp-ae-01-ae`) — it does not pin the rate to 0. The engine invented a rule stricter than the official profile.

**Fix (engine-side, matching the official profile):**
- **`vatCategory.js`**: for category `AE`, do not require `rate === 0`. Accept `rate` as a notional value (5 or 0); the binding invariant is that the *seller's tax amount is 0* (buyer self-assesses), which ENG-TAX-09's fix below handles. Missing rate stays OK (already allowed for expectedRate 0 — preserve that).
- **`taxBreakdown.js`**: for category `AE`, skip the `tax = taxable × rate` arithmetic (ENG-TAX-09) — the seller's tax is 0 by definition. Keep `ENG-TAX-08` (taxable reconciles to line nets) — that still applies.
- **`generate-codelists.mjs`**: either drop `AE` from the rate-enforced set (treat as "no enforced rate") or set its `expectedRate` to `null` to mean "not enforced". Keep the generator as the source of truth, re-derive both `codelists.js` copies.

### 9.4 Dual-copy sync — critical implementation constraint

The engine exists **twice**: `app/api/src/rules/**` (canonical) and `app/web/src/lib/rules/**` (vendored byte-for-byte copy for the web Docker build). **Every engine fix must land in BOTH trees.**

The `validation.ts` header claims a parity test (`test/tool-engine-parity.test.ts` — "hashes both trees and fails the build if they ever drift") **does not exist in `app/web/test/`**. Nothing currently prevents drift. Add the parity test as part of this work:
- New: `app/web/test/engine-parity.test.ts` — walks `app/api/src/rules/` and `app/web/src/lib/rules/`, hashes the shared files (checks/, codelists.js, engine.js, error.js, money.js, normalize.js, registry.js, structure.js, xml.js), fails on any difference.
- Run it in CI/`npm test` on both services.

### 9.5 Engine fix tests

- `app/api/test/convert.test.js` (or a new `app/api/test/engine-official-samples.test.js`): assert `convert()` on `Standard tax invoice.xml` → **CONVERTED/NOOP (not REFUSED)**, and `Summary tax invoice.xml` → **CONVERTED/NOOP (not REFUSED)**.
- `app/api/test/validate.test.js`: assert `POST /v1/validate` on both official samples returns `valid: true` (no false ENG-* errors).
- Line allowance/charge unit test: a synthetic line with allowance + charge must pass ENG-LINE-05.
- AE category unit tests: `AE + 5% + tax 0` passes; `AE + tax > 0` still fails (seller must not charge VAT on reverse charge).
- Parity test (§9.4) passes after both trees are updated.

## 10. Testing (page)

- **New**: `ConverterWorkspace` component tests — renders single-mode (no toggle), sample loads, verdict renders per status, download/copy present on CONVERTED/NOOP, "Validate repaired invoice →" writes sessionStorage + navigates.
- **Extend**: `ValidatorWorkspace` handoff test — pre-fills + auto-validates from sessionStorage, ignores malformed/stale values, clears key after read.
- **Extend**: `tool-page-copy` test for new converter copy.
- **Regression**: existing `tools-validate`, `validation-ui`, `billing`, `auth-keys`, `webhooks` suites must stay green.
- **Manual E2E**: on the deployed API, run a real `CONVERTED` and a `REFUSED` document through the page; confirm handoff pre-fills the validator.

## 11. Out of Scope / Follow-ups

- **Repo divergence** (local `main` vs `origin/main`): reconcile after this feature lands. Decide whether local `main` should be reset to `origin/main` or the compliance-manifest work (untracked `src/compliance/pint-ae-1.0.3/`) is merged in intentionally.
- **Old slug `/tools/xml-converter`** — intentionally left to 404 (no redirect, per owner decision; see §7.3).
- **Monthly quota enforcement, `/usage` rate limit, UsageEvent TTL** — existing open items in `docs/PRODUCTION_STATUS.md`; untouched by this feature.
- **Other PINT-AE rule gaps** (e.g. IBR-073 date format, IBR-CO-11 prepaid ≤ payable from PRODUCTION_STATUS.md) — separate workstreams, not part of the false-positive fixes in §9.
