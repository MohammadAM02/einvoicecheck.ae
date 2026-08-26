# Implementation Plan

Task: `targeted-public-ux-smoothing`
Status: `AWAITING_APPROVAL`

## Objective

Smooth the homepage, `/what-we-check`, and XML Generator UX while preserving the current visual identity, content, validation/generation behavior, and import contracts. Deliver a stable responsive Generator that uses a spreadsheet workbench at 1024px+ and a manual accordion below 1024px.

## Verified facts

- The homepage composition is owned by `HomeClient`; its spacing and looping route-story animation are controlled by the current CSS layers.
- `/what-we-check` needs a route hook because its headings currently inherit global typography.
- The Generator route is incorrectly constrained to 800px and shows a generic launch CTA despite being live.
- `GeneratorWorkspace` owns one manual form state and currently mounts XML conditionally, causing its two-column layout to reflow.
- `GeneratorImport` already provides CSV/Generator JSON import and must remain a separate existing mode.
- Baseline after `npm ci`: 26 test files / 208 tests pass; production build succeeds with 29 static pages.

## Approved design

### Shared styling strategy

- Add one task-specific stylesheet imported after `playful-geometric.css`.
- Scope every new rule beneath route/workspace hooks; do not change global `h1`, `h2`, container, animation, or form behavior for unrelated routes.
- Reuse existing design tokens and maintain the teal/navy/cream playful visual treatment.

### Homepage

- Keep all sections, content, and order.
- Reduce only the large vertical gaps/padding that interrupt scroll continuity; retain readable section separation.
- Convert the route-story animation to a one-shot sequence with final-state fill. Existing reduced-motion rules remain authoritative.
- Add a compact “Back to validator” anchor beside footer links, targeting `#validate` and using existing button/link styling.

### What We Check

- Add a route-scoped page class.
- Cap the page `h1` at 2.75rem and section `h2` headings at 1.8rem with responsive lower values.
- Do not alter body/table text, copy, table structure, disclosure behavior, section order, or CTAs.

### XML Generator

- Add an explicit Generator route flag/class and a wide container suitable for the workbench.
- Remove the generic launch continuation for the live Generator only.
- Keep the current ToolPageHeader introduction unchanged.
- Refactor only `GeneratorWorkspace` presentation around the existing state and handlers.
- Introduce accordion UI state for Document, Parties, Lines, and Totals/XML. Document starts open. Section buttons are independently controlled and expose `aria-expanded`/`aria-controls`.
- Compute section completion/summaries from existing form state and current minimal validation rules; do not change generation validity.
- Keep one semantic instance of every input. Mobile collapse uses responsive presentation; desktop forces all editor regions visible without duplicating controls or clearing accordion state.
- At 1024px+, display compact Document/Parties groups, the existing line inputs as a spreadsheet-style grid, and a sticky rail containing live totals, existing actions, validation handoff, guardrail/status context, and expandable XML preview.
- Below 1024px, display the four accordion sections in document order. Collapsed sections leave the tab order and show honest summaries.
- Preserve debounced automatic generation and current ready/building/error conditions. XML remains conditional and must not narrow the desktop editor when mounted.
- Preserve import mode as-is apart from scoped visual alignment with the wider route container.

## Files in scope

### Production

- `app/web/src/app/layout.tsx` — load the targeted stylesheet last.
- `app/web/src/app/targeted-public-ux.css` — new route-scoped homepage, scope-page, and Generator responsive styles.
- `app/web/src/components/HomeClient.tsx` — add the footer return action only.
- `app/web/src/app/what-we-check/page.tsx` — add a route typography hook only.
- `app/web/src/app/tools/[slug]/page.tsx` — add Generator-specific container/route hooks and suppress the generic launch CTA for the live Generator.
- `app/web/src/components/GeneratorWorkspace.tsx` — responsive accordion/workbench structure, derived summaries, and accessibility state around existing behavior.

### Tests

- `app/web/test/homepage.test.tsx` — footer return action and retained order.
- `app/web/test/generator-workspace.test.tsx` — accordion behavior, completion honesty, single controls, and preserved actions/state.
- `app/web/test/generator-import.test.tsx` — only if an expectation needs updating for presentation while preserving behavior; do not weaken coverage.
- `app/web/test/tool-page-copy.test.ts` — live Generator launch-copy exclusion and unshipped-tool retention.
- `app/web/test/design-tokens.test.ts` — task stylesheet import, scoped heading caps, breakpoint, sticky rail, desktop panel visibility, and one-shot/reduced-motion invariants that jsdom cannot compute.
- `specs/targeted-public-ux-smoothing/*` — gate, verification, and handoff artifacts.
- `.hermes/work/targeted-public-ux-smoothing/*` — transient approval, scope, worker brief, and review artifacts.

## Forbidden files

- `app/web/src/app/api/**`
- `app/web/src/lib/**`
- `app/web/src/components/GeneratorImport.tsx` unless an implementation blocker is documented and separately approved.
- `app/api/**`
- `packages/**`
- `.env*`, credentials, auth, billing, database, analytics contracts, deployment configuration, and production data.
- Unrelated public pages/components/styles.
- `.hermes/work/ux-smoothness/*.html` (reference only; do not ship or modify during implementation).

## Behavioral invariants

- Homepage content and order remain unchanged except for the added footer action.
- `/what-we-check` copy, content structure, table, disclosures, links, and body/table typography remain unchanged.
- Generator form payloads, totals formulas, template/category restrictions, debounce timing, generation endpoint behavior, error handling, actions, confirmation behavior, analytics properties, and session handoff remain unchanged.
- Import format/schema, one-to-50 cap, browser parsing, bounded concurrency, partial success, retries, ZIP generation, downloads, and Validator handoff remain unchanged.
- No duplicate responsive controls, IDs, labels, handlers, analytics events, or generation calls.

## Security invariants

- Do not read, expose, or modify secrets or credentials.
- Do not add persistence or network calls.
- Preserve invoice-content in-memory handling and existing session handoff boundaries.
- Preserve visible non-accreditation, no-transmission, and review-before-use guardrail language.

## Tasks

1. Add/extend acceptance-level tests for the footer return action, Generator accordion semantics and summary honesty, single-control rendering, route-specific launch-copy behavior, and scoped responsive CSS invariants. Confirm tests fail for the intended missing UX.
2. Add the task-specific stylesheet import and implement the scoped homepage and `/what-we-check` adjustments, including one-shot motion and the footer return action.
3. Add Generator-specific route width/hooks and suppress the generic launch continuation for the live Generator while retaining it for unshipped tools.
4. Restructure `GeneratorWorkspace` presentation around the existing form state: accessible mobile accordion, derived summaries, desktop spreadsheet grid, sticky totals/actions rail, and expandable conditional XML output. Preserve all existing handlers and import mode.
5. Run focused tests during each change, then the full suite and production build. Perform manual responsive/keyboard verification at 390px, 768px, 1024px, and 1440px, including populated-form breakpoint crossing.
6. Independently inspect the final diff against allowed scope and record verification/handoff artifacts. Do not deploy or publish.

## Test and verification commands

From `app/web`:

- `npm test -- homepage.test.tsx generator-workspace.test.tsx generator-import.test.tsx tool-page-copy.test.ts design-tokens.test.ts`
- `npm test`
- `npm run build`

From repository root:

- `python .hermes/gates/validate-artifacts.py targeted-public-ux-smoothing`
- `python .hermes/gates/verify-scope.py --allow .hermes/work/targeted-public-ux-smoothing/allow-scope.txt --base e04af97b64e14cdc011b545c6d32d34f53214c1e`
- `git diff --check`
- `git status --short`

Manual built-tree verification:

- Homepage at 390px and 1440px: content/order retained, tighter rhythm, route story settles, footer action returns to `#validate`.
- `/what-we-check` at 390px and 1440px: heading hierarchy reduced, all existing content/table/FAQ retained.
- Generator at 390px and 768px: manual accordion, summaries, keyboard operation, no horizontal page overflow.
- Generator at 1024px and 1440px: spreadsheet workbench, sticky rail, expandable XML, stable editor width.
- Populate the Generator, cross the 1024px boundary in both directions, and verify every value remains unchanged.
- Exercise manual sample generation, copy/download/Validator handoff, and CSV/JSON import entry mode.

## Risks and mitigations

- Risk: duplicating responsive markup creates duplicate IDs, handlers, or requests. Mitigation: one DOM/control set; CSS and accordion state change presentation only.
- Risk: collapsed mobile content stays keyboard-focusable. Mitigation: use a collapsed-panel mechanism that removes descendants from layout/tab order below 1024px and test keyboard behavior.
- Risk: mobile accordion state hides content after resizing to desktop. Mitigation: desktop CSS forces editor panels visible regardless of mobile accordion state.
- Risk: spreadsheet density harms readability. Mitigation: retain labels/fieldsets, 44px touch targets below 1024px, and manually verify 1024px minimum desktop layout.
- Risk: sticky rail clips on short viewports. Mitigation: use bounded sticky positioning and normal document flow fallback; manually verify representative heights.
- Risk: final CSS override affects unrelated routes. Mitigation: scope every selector beneath explicit homepage/scope/Generator hooks and test stylesheet invariants.
- Risk: loop removal leaves animated elements invisible or mid-route. Mitigation: define final fill state and manually verify both normal and reduced-motion rendering.

## Rollback

Revert the six production files in scope and remove `targeted-public-ux.css`. No data, schema, backend, or dependency rollback is required.

## Assumptions

- User approval on 2026-08-26 authorizes specification of the consolidated hybrid mock, not production implementation.
- Implementation begins only after explicit approval of the final `spec.md` and `plan.md` hashes.
- GitHub Issue creation requires a separate explicit approval after the specification is approved.
- Deployment, commit, push, and release remain unauthorized.
