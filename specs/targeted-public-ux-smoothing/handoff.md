# Handoff

Task: `targeted-public-ux-smoothing`

## Delivered

Implemented the approved targeted UX smoothing pass for the homepage, `/what-we-check`, and `/tools/xml-generator`.

- Homepage spacing is tightened within scoped selectors; the ERP-to-preflight-to-ASP story uses one-shot animation with a final readable state and preserves reduced-motion handling.
- Homepage footer includes `Back to validator` targeting `#validate`.
- `/what-we-check` has route-scoped heading caps; existing copy, table, disclosures and order remain intact.
- XML Generator has a dedicated wide route container, no contradictory launch continuation, and a shared-state responsive workspace: accordion presentation below 1024px and spreadsheet-style/sticky-rail presentation at 1024px+.
- Existing generation, totals, import, reset, sample-fill, download, copy and Validator handoff behavior remains covered by tests.

## Changed files

- `app/web/src/app/layout.tsx`
- `app/web/src/app/targeted-public-ux.css`
- `app/web/src/app/what-we-check/page.tsx`
- `app/web/src/app/tools/[slug]/page.tsx`
- `app/web/src/components/HomeClient.tsx`
- `app/web/src/components/GeneratorWorkspace.tsx`
- `app/web/test/design-tokens.test.ts`
- `app/web/test/generator-workspace.test.tsx`
- `app/web/test/homepage.test.tsx`
- `app/web/test/tool-page-copy.test.ts`
- `specs/targeted-public-ux-smoothing/verification.md`
- `specs/targeted-public-ux-smoothing/handoff.md`

## Release boundary

The work remains uncommitted and undeployed. Deployment, GitHub writes, production-data changes and secret changes were not authorized or performed.

Viewport-specific visual and keyboard review remains outstanding because the external browser harness was blocked by the local Chrome remote-debugging permission. The local in-app preview smoke checks completed as documented in `verification.md`.
