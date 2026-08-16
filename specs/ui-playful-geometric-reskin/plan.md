# Implementation Plan

Task: `ui-playful-geometric-reskin`

## Objective

Apply the official playful geometric spike as a shared CSS-first visual layer across the Next.js frontend, preserving the cream background and all current behavior.

## Verified facts

- All frontend routes share `app/web/src/app/layout.tsx` and its imported CSS.
- The spike is standalone static HTML and must be treated as a visual reference, not imported as runtime markup.
- Existing class names already cover the major shared surfaces.
- Baseline is green: 206 tests pass and `next build` succeeds.

## Approved design

- Add one stylesheet loaded after the current frontend layers so it can override presentation without rewriting components.
- Use existing tokens and preserve `--bg: #f7f8f5` as the page background.
- Use teal/navy outlines, rounded but slightly irregular radii, hard navy/teal shadows, subtle cream dot/geometry accents, pill controls, sticker labels, and restrained transforms on non-flow-critical surfaces.
- Keep intentional dark diagnostic/problem sections, but ensure general page chrome and content surfaces remain cream-first.
- Preserve focus outlines, minimum control heights, responsive breakpoints, and reduced-motion safeguards.

## Files in scope

- `app/web/src/app/layout.tsx` — import the new shared visual stylesheet last.
- `app/web/src/app/playful-geometric.css` — new shared visual layer.
- `app/web/test/design-tokens.test.ts` — assert stylesheet loading and core invariants.
- `specs/ui-playful-geometric-reskin/*` — gate and handoff artifacts.
- `.hermes/work/ui-playful-geometric-reskin/*` — transient gate state/briefs/reports.

## Forbidden files

- `app/web/src/app/api/**`
- `app/web/src/lib/**`
- `app/api/**`
- `packages/**`
- `.env*`, auth/credential files, deployment configuration, and production data.
- `spikes/**` (reference only; do not modify).

## Behavioral invariants

- No component event handler, API call, route, copy, validation logic, auth logic, billing logic, or data handling changes.
- Existing class names and DOM semantics remain valid.
- Any new class hook must be presentation-only.

## Security invariants

- No secrets or credentials are read, added, or embedded.
- Privacy/guardrail language remains visible.
- No new network calls or dependencies.

## Tasks

1. Add the shared playful-geometric stylesheet and load it after existing CSS.
2. Style shared shell/navigation, typography, buttons, cards, form controls, validator/result surfaces, content sections, pricing, FAQ, tables, and mobile menu using the spike language while preserving cream background and intentional dark sections.
3. Add focused source assertions for stylesheet loading, cream background, key visual selectors, and reduced-motion coverage.
4. Run the full frontend test suite and production build; inspect diff for scope.

## Test and verification commands

- `cd app/web && npm test`
- `cd app/web && npm run build`
- `python .hermes/gates/validate-artifacts.py ui-playful-geometric-reskin`
- `python .hermes/gates/verify-scope.py --allow .hermes/work/ui-playful-geometric-reskin/allow-scope.txt --base <base-commit>`
- Manual local browser review at desktop and 375px widths.

## Risks and mitigations

- Risk: global overrides distort specialized pages. Mitigation: target existing shared classes, preserve layout/display rules, and review representative homepage, tool, pricing, auth, and dashboard routes.
- Risk: decorative transforms cause mobile overflow. Mitigation: constrain transforms to panels, use existing responsive breakpoints, and manually check 375px.
- Risk: accessibility contrast/focus regressions. Mitigation: retain semantic tokens/focus rules and run existing axe-backed tests.

## Rollback

Remove the new stylesheet import and delete `app/web/src/app/playful-geometric.css`; no behavior or data rollback is needed.

## Assumptions

- The user’s instruction to apply the named spike authorizes this visual scope once the artifact hashes are explicitly approved.
- Local server means the frontend dev server on a free local port; no deployment authorization is implied.
