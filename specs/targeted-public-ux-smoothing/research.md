# Research

Task: `targeted-public-ux-smoothing`
Research snapshot recorded: `2026-08-26`
Repository/branch/commit at snapshot: `C:/Users/AMG/code/https-einvoicecheck.ae`, `main`, `e04af97b64e14cdc011b545c6d32d34f53214c1e`

## Verified facts

- The live public routes were inspected directly in the Hermes preview at `https://einvoicecheck.ae/`, `https://einvoicecheck.ae/what-we-check`, and `https://einvoicecheck.ae/tools/xml-generator`.
- The homepage renders the promise and Validator first, followed by the trust strip, animated ERP-to-preflight-to-ASP story, example finding, API promotion, scope panel, FAQ, and footer.
- The homepage route story uses multiple 4.8-second infinite animations (`routeFill`, `documentTravel`, `preflightPulse`, and `diagnosticReveal`). Existing reduced-motion CSS disables them for users who request reduced motion, but other users see perpetual motion.
- Homepage vertical rhythm is spread across `visual-compression.css`, `home-validator-experience.css`, and the final `playful-geometric.css` override layer. The dark problem section currently has a responsive top margin up to 104px and block padding up to 96px.
- `HomeClient` owns the homepage section order and footer. The current footer contains legal/product navigation but no return link to `#validate`.
- `/what-we-check` uses global `h1`/`h2` sizing (`h1` up to 3.5rem and `h2` up to 2.2rem) and has no route-specific typography hook. Its page content, behavior table, boundaries, transparency copy, and FAQ are structurally sound and were explicitly retained by the user.
- The XML Generator route uses the generic non-validator container with inline `maxWidth: 800`. The Generator layout changes to two equal columns at 900px, even though the containing route remains limited to 800px.
- The XML preview is conditionally mounted only while building or ready. Its arrival changes `.generator-layout` from a single occupied column to two occupied columns, causing the manual form to narrow and reflow.
- The manual Generator vertically stacks Document, Parties, Lines, Totals, Actions, validation handoff, and guardrail content. Document and Parties fields are individually stacked within padded cards.
- `GeneratorWorkspace` owns manual form state, line editing, live totals, debounced automatic XML generation, download, copy, reset, sample fill, Validator handoff, and entry-mode selection.
- `GeneratorImport` is an existing separate entry mode. It imports one to 50 invoices from CSV or Generator JSON via drag/drop or file picker, previews parse results, generates with bounded concurrency, supports partial success/retry, downloads XML/ZIP output, opens failures in the manual form, and hands successful XML to the Validator.
- Generator-level spreadsheet-row clipboard paste is not implemented. Product-level paste does exist in the Validator, and generated XML can be copied from the Generator.
- The generic non-validator continuation renders “Get it when it lands” and “Sign up for launch access” below the already-live XML Generator. This is contradictory and should be excluded for that slug.
- The root layout loads the existing global visual layers in this order: `globals.css`, `visual-compression.css`, `aesthetic-polish.css`, `home-validator-experience.css`, `account.css`, then `playful-geometric.css`.
- The approved visual concepts are stored transiently at `.hermes/work/ux-smoothness/generator-layout-options.html` and `.hermes/work/ux-smoothness/generator-hybrid.html`; they are references, not production files.

## Entry points and relevant files

- `app/web/src/app/page.tsx` — homepage route wrapper.
- `app/web/src/components/HomeClient.tsx` — homepage composition and footer.
- `app/web/src/app/what-we-check/page.tsx` — scope page content and markup.
- `app/web/src/app/tools/[slug]/page.tsx` — tool route container width, Generator mount, contextual copy, and generic launch CTA.
- `app/web/src/components/GeneratorWorkspace.tsx` — responsive manual workspace behavior and state.
- `app/web/src/components/GeneratorImport.tsx` — existing CSV/JSON import mode that must be preserved.
- `app/web/src/components/ProductExperience.tsx` — ToolPageHeader, WorkflowStepper, and NextActionPanel.
- `app/web/src/app/globals.css` — current Generator layout and shared typography.
- `app/web/src/app/visual-compression.css` — homepage spacing and section rhythm.
- `app/web/src/app/home-validator-experience.css` — homepage route animation and story composition.
- `app/web/src/app/playful-geometric.css` — final visual override layer.
- `app/web/test/homepage.test.tsx` — homepage content/order behavior.
- `app/web/test/generator-workspace.test.tsx` — manual Generator behavior.
- `app/web/test/generator-import.test.tsx` and `invoice-import.test.ts` — import behavior/contracts.
- `app/web/test/tool-page-copy.test.ts` — route-level copy assertions.
- `app/web/test/navigation.test.tsx`, `design-tokens.test.ts`, and `product-experience.test.tsx` — responsive, focus, reduced-motion, and shared experience prior art.

## Existing tests and baseline

- Initial `npm test`: exit 1 because this worktree's installed modules were stale and lacked lockfile-declared `papaparse`; 24 suites/178 tests otherwise passed.
- Initial `npm run build`: exit 1 because installed modules lacked lockfile-declared `papaparse` and `jszip`.
- `npm ci`: exit 0; installed 224 packages from the existing lockfile. npm reported four high-severity dependency vulnerabilities; dependency remediation is outside this UX task.
- Fresh `npm test`: exit 0; 26 test files and 208 tests passed.
- Fresh `npm run build`: exit 0; Next.js compiled, type-checked, generated 29 static pages, and completed optimization.
- No visual-regression or Playwright setup is present. Responsive appearance requires manual browser verification in addition to component/source tests.

## Configuration and deployment assumptions

- Frontend commands run from `app/web`.
- The implementation remains inside the existing Next.js/React/CSS stack with no new runtime dependency.
- Local browser verification does not authorize deployment.

## Security-sensitive paths

- The scoped work must not modify API routes, backend services, auth, billing, validation/generation contracts, persistence, `.env` files, or credentials.
- Existing invoice-content privacy behavior, import limits, bounded concurrency, guardrail language, and session handoff behavior remain invariant.

## Contradictions

- The user recalled import and paste capabilities. Repository evidence resolves this as: Generator CSV/JSON file import exists; generated XML copy exists; Validator XML paste exists; direct spreadsheet-row paste into the manual Generator does not exist. Resolution: preserve all existing capabilities and add no new paste/import feature.
- The initial Option 4 mock included illustrative “Paste rows” and “Import CSV” toolbar text. Resolution: the approved hybrid mock replaces this with the real separate “Import invoice data” mode and does not make the illustrative toolbar part of scope.
- The current Generator auto-generates XML after valid input; visual mock wording could be read as a manual Generate action. Resolution: preserve debounced automatic generation and existing actions. Do not introduce a new generation state machine.

## Unknowns

- Final aesthetic quality and exact perceived scroll smoothness require human review on the merged implementation at representative viewport widths.
- The repository has no automated screenshot-diff facility, so visual measurements beyond DOM behavior and scoped CSS must be verified manually.

## Commands and exact results

- `git rev-parse HEAD`: `e04af97b64e14cdc011b545c6d32d34f53214c1e`.
- `git branch --show-current`: `main`.
- `npm ci && npm test && npm run build`: exit 0 after dependency restoration; 26 files/208 tests passed; production build generated 29 static pages.
