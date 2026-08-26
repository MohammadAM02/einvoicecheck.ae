# Tasks

Task: `targeted-public-ux-smoothing`

- [ ] T-001: Add acceptance-level regression tests for the approved UX behavior.
  - Files: `app/web/test/homepage.test.tsx`, `app/web/test/generator-workspace.test.tsx`, `app/web/test/tool-page-copy.test.ts`, `app/web/test/design-tokens.test.ts`; `generator-import.test.tsx` only if required without weakening coverage.
  - Verification: focused test command fails only for missing approved behavior, then passes after implementation.

- [ ] T-002: Add the scoped UX stylesheet and implement homepage/scope-page smoothing.
  - Depends on: T-001.
  - Files: `app/web/src/app/layout.tsx`, `app/web/src/app/targeted-public-ux.css`, `app/web/src/components/HomeClient.tsx`, `app/web/src/app/what-we-check/page.tsx`.
  - Verification: homepage and scoped typography tests pass; manual 390/1440px review confirms retained content/order, one-shot motion, footer action, and reduced heading hierarchy.

- [ ] T-003: Add Generator route hooks, wide container, and live-tool CTA correction.
  - Depends on: T-001, T-002 (shared stylesheet exists).
  - Files: `app/web/src/app/tools/[slug]/page.tsx`, `app/web/src/app/targeted-public-ux.css`.
  - Verification: tool route copy tests prove launch messaging is absent only for the live Generator; built route uses the dedicated container.

- [ ] T-004: Implement the shared-state responsive Generator workspace.
  - Depends on: T-001, T-003.
  - Files: `app/web/src/components/GeneratorWorkspace.tsx`, `app/web/src/app/targeted-public-ux.css`, `app/web/test/generator-workspace.test.tsx`.
  - Verification: focused Generator tests pass; manual checks at 390/768/1024/1440px confirm accordion/workbench behavior, stable breakpoint reflow, sticky rail, conditional expandable XML, and no duplicate controls.

- [ ] T-005: Verify preserved import behavior and complete full frontend verification.
  - Depends on: T-002, T-003, T-004.
  - Files: tests and verification artifacts only; no production changes unless a verified regression is fixed inside approved scope.
  - Verification: Generator import tests, full `npm test`, `npm run build`, `git diff --check`, artifact validation, and scope verification all pass; exact results recorded.

- [ ] T-006: Perform independent diff review and write handoff.
  - Depends on: T-005.
  - Files: `specs/targeted-public-ux-smoothing/verification.md`, `specs/targeted-public-ux-smoothing/handoff.md`, `.hermes/work/targeted-public-ux-smoothing/*`.
  - Verification: every acceptance ID maps to evidence; unverified visual limitations are stated; no deployment/push claim is made.

## Dependency notes

- The tasks are intentionally sequential because the scoped stylesheet and Generator route/workspace changes share files.
- No task is marked `[P]`; parallel workers would create avoidable merge conflicts in `targeted-public-ux.css` and the shared test files.
- GitHub Issue decomposition occurs only after the hashed specification/plan are explicitly approved and the user separately approves GitHub writes.
