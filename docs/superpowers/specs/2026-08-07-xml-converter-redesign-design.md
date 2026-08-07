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
| `app/web/test/*` | Extend per §9 |

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

## 9. Testing

- **New**: `ConverterWorkspace` component tests — renders single-mode (no toggle), sample loads, verdict renders per status, download/copy present on CONVERTED/NOOP, "Validate repaired invoice →" writes sessionStorage + navigates.
- **Extend**: `ValidatorWorkspace` handoff test — pre-fills + auto-validates from sessionStorage, ignores malformed/stale values, clears key after read.
- **Extend**: `tool-page-copy` test for new converter copy.
- **Regression**: existing `tools-validate`, `validation-ui`, `billing`, `auth-keys`, `webhooks` suites must stay green.
- **Manual E2E**: on the deployed API, run a real `CONVERTED` and a `REFUSED` document through the page; confirm handoff pre-fills the validator.

## 9. Out of Scope / Follow-ups

- **Repo divergence** (local `main` vs `origin/main`): reconcile after this feature lands. Decide whether local `main` should be reset to `origin/main` or the compliance-manifest work (untracked `src/compliance/pint-ae-1.0.3/`) is merged in intentionally.
- **Old slug `/tools/xml-converter`** — intentionally left to 404 (no redirect, per owner decision; see §7.3).
- Monthly quota enforcement, `/usage` rate limit, UsageEvent TTL — existing open items in `docs/PRODUCTION_STATUS.md`; untouched by this feature.
