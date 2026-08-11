# Homepage + Validator Station Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development task-by-task. Do not claim completion from code inspection alone.

**Goal:** Turn the homepage into a conversion-first product story while routing real browser validation into a dedicated, visually substantial Validator Station.

**Architecture:** Reuse the existing `ValidatorWorkspace`. Homepage context becomes an input-and-handoff surface; tool context remains the actual validation surface. Homepage XML crosses the client-side route transition through a module-scoped **in-memory** handoff so the browser-validator non-persistence claim remains true. Existing XML Generator/Repairer handoffs keep their established session-storage path. The current `/tools/uae-e-invoice-validator` route is upgraded in place rather than introducing a competing validator URL.

**Tech Stack:** Next.js 15, React, TypeScript, Vitest, Testing Library, existing CSS design system.

## Global constraints

- Browser Validator remains XML-only.
- `/v2/validate`, `/v1/preflight`, and `/v1/validate` contracts do not change.
- No validation-rule, auth, billing, quota, or backend changes.
- No claims of accreditation, guaranteed acceptance, complete compliance, or complete official XSD/Schematron parity.
- Homepage browser-validator invoice content remains absent from application/browser persistence and analytics.
- Motion must be disabled/reduced under `prefers-reduced-motion`.

---

### Task 1: Lock homepage-to-station behavior in tests

**Files:**
- `app/web/test/validator-workspace.test.tsx`
- `app/web/test/validator-handoff.test.tsx`
- `app/web/test/homepage.test.tsx`

- [x] Add tests that homepage upload/paste/sample preserves the exact XML and optional filename, places it only in the in-memory handoff, navigates to `/tools/uae-e-invoice-validator`, and does **not** call `validateInvoiceDocument` on the homepage.
- [x] Assert the homepage flow does not write invoice content to `sessionStorage`.
- [x] Add tool-context test that consumes the in-memory homepage handoff, immediately validates the exact XML, and renders homepage origin + filename.
- [x] Preserve existing Generator/Repairer session-storage handoff tests.
- [x] Add homepage copy/order assertions for the new commercial narrative.
- [ ] Execute focused tests in a runnable environment and capture the output.

Target command:

```bash
cd app/web
npm test -- validator-workspace.test.tsx validator-handoff.test.tsx homepage.test.tsx
```

### Task 2: Implement homepage handoff without changing validator semantics

**Files:**
- Add: `app/web/src/lib/validator-handoff.ts`
- Modify: `app/web/src/components/validation/ValidatorWorkspace.tsx`

- [x] Add a single-consume, module-scoped homepage handoff store.
- [x] Extend result origin handling with `homepage`.
- [x] Route homepage upload/drop/paste/sample through the in-memory handoff.
- [x] Keep actual validation in tool context only.
- [x] Preserve local oversize/file-read errors on the homepage before handoff.
- [x] Keep converter handoff key and Generator/Repairer behavior unchanged.
- [ ] Execute focused validator tests and capture the output.

### Task 3: Rewrite the homepage as a product story

**Files:**
- `app/web/src/components/HomeClient.tsx`
- `app/web/src/components/FreeVsApi.tsx`

- [x] Replace the flat hero copy with:
  - `Your ERP can create the invoice. That doesn't mean the file is ready.`
  - `Catch the broken field, mapping or total before it becomes an ASP rejection loop.`
  - `Drop in PINT-AE XML. EInvoiceCheck shows what failed, where it failed, and the smallest practical fix.`
- [x] Keep the live validator input in the first viewport.
- [x] Replace the generic three-card failure section with a semantic ERP → EInvoiceCheck → ASP route and concrete buyer-TRN diagnostic interruption.
- [x] Rewrite the result example around Rule / Location / Meaning / Fix.
- [x] Rewrite API continuation to `When one clean invoice becomes a thousand.` without changing pricing or endpoint claims.
- [x] Keep scope, trust, FAQ, and footer content.
- [ ] Execute homepage tests and accessibility checks.

### Task 4: Upgrade the standalone validator into the Validator Station

**Files:**
- `app/web/src/app/tools/[slug]/page.tsx`
- `app/web/src/components/InvoiceValidator.tsx`
- `app/web/src/components/validation/ValidatorWorkspace.tsx`
- `app/web/test/tool-page-copy.test.ts`

- [x] Add station hierarchy and remove the old article-style paragraph from the validator path.
- [x] Use `Validator Station`, `One invoice in. The exact failure path out.`, and concise working copy.
- [x] Expand the validator into a wide work canvas while retaining the existing result model and `ValidationSummary`.
- [x] Keep batch validation available but visually secondary.
- [x] Keep accurate XML/JSON/legacy API continuation beneath the work surface.
- [ ] Execute focused station/workspace tests.

### Task 5: Add visual hierarchy and purposeful motion

**Files:**
- Add: `app/web/src/app/home-validator-experience.css`
- Modify: `app/web/src/app/layout.tsx`

- [x] Strengthen hero typography and visual rhythm without introducing unrelated brand tokens.
- [x] Add responsive ERP/preflight/ASP nodes, connector lines, a document marker, and diagnostic callout.
- [x] Add restrained motion that demonstrates state rather than decorating the page.
- [x] Add reduced-motion behavior.
- [x] Style the Validator Station around a 1240px working surface with contained code/rule overflow.
- [x] Add mobile/tablet collapse rules for the route and station.
- [ ] Verify rendered behavior at 375, 768, 1024, and 1440px.

### Task 6: Full verification and PR hygiene

- [x] Inspect `.hermes/critic-loop.md`; preserve unrelated findings and do not manufacture a state update from branch-only evidence.
- [x] Inspect the branch diff and confirm no API/backend/auth/billing files are changed.
- [x] Open draft PR #22 against current `main`.
- [ ] Run the relevant web test suite.
- [ ] Run repository-standard typecheck/build.
- [ ] Perform deployed/preview browser QA at 375, 768, 1024, and 1440px.
- [ ] Re-run final diff/stale-copy/secret scan after automated verification.

Current environment limitation: direct GitHub cloning is blocked by DNS/network policy, and the available uploaded repository snapshot cannot install missing npm dependencies offline. Automated test/build success must therefore remain **unclaimed** until CI, Railway preview, or another runnable environment supplies evidence.
