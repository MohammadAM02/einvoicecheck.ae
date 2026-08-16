# Research

Task: `ui-playful-geometric-reskin`
Repository/branch/commit: `https://...` worktree `ui-implem-fileconv`, base `8e75c483db1f6400e2ff10243324293e58c86ab1`

## Verified facts

- The repository is a Git worktree with the Hermes project kit, `AGENTS.md`, `.hermes.md`, `.hermes/gates/`, and `.hermes/templates/`.
- The live frontend is `app/web`, a Next.js 15.5.22 application using React 19, TypeScript, Vitest, Tailwind/PostCSS, and no UI styling dependency beyond the existing stack.
- `app/web/src/app/layout.tsx` imports `globals.css`, `visual-compression.css`, `aesthetic-polish.css`, `home-validator-experience.css`, and `account.css`; all routes rendered through `Chrome` receive these global styles.
- `Chrome.tsx` owns shared navigation and root shell markup. `HomeClient.tsx` owns the homepage narrative and mounts `ValidatorWorkspace`.
- Existing design tokens already preserve the requested cream background: `--bg: #f7f8f5`, `--bg-card: #ffffff`, and `--bg-elevated: #f0f3ef`.
- The official spike at `spikes/005-playful-geometric-validator-reskin/index.html` is standalone static HTML. Its README states that it replaces only a hero decorative box and keeps the lower validator, copy, navigation, workflow, route, and scope content from its source spike.
- The spike’s visual language includes teal/navy/cream palette retention, rounded pop treatment, geometric accents, sticker framing, tilted panels, hard shadows, dashed dropzones, pill buttons, and reduced-motion handling.
- The live app already contains the same product concepts and component classes needed for a CSS-first reskin: `.navbar`, `.btn`, `.card`, `.validator-workspace`, `.validator-result`, `.validation-issue`, `.pricing-card`, `.faq-item`, `.upload-zone`, `.invoice-drop-zone`, `.mobile-menu`, `.site-footer`, and related layout classes.
- Existing tests cover homepage semantics, navigation, design tokens, validator behavior, generator behavior, mobile nav, accessibility, and 206 tests total.

## Entry points and relevant files

- `app/web/src/app/layout.tsx` — global stylesheet import order.
- `app/web/src/app/globals.css` — shared tokens and base selectors.
- `app/web/src/app/visual-compression.css` — current shared layout and homepage polish.
- `app/web/src/app/aesthetic-polish.css` — current shared micro-interactions and grain overlay.
- `app/web/src/app/home-validator-experience.css` — homepage/validator visual layer.
- `app/web/src/app/account.css` — dashboard/account styles.
- `app/web/src/components/Chrome.tsx` — shared nav and shell.
- `app/web/src/components/HomeClient.tsx` — homepage composition.
- `app/web/src/components/validation/ValidatorWorkspace.tsx` and `app/web/src/components/validation/*` — validator UI behavior and markup.
- `app/web/test/design-tokens.test.ts`, `navigation.test.tsx`, `homepage.test.tsx`, `validator-workspace.test.tsx` — relevant regression coverage.
- `spikes/005-playful-geometric-validator-reskin/index.html` and `README.md` — visual reference only; not production-importable.

## Existing tests and baseline

- `npm ci` in `app/web`: exit 0; installed 224 packages and audited 226 packages. npm reported 4 high severity vulnerabilities already present in the dependency tree; dependency remediation is out of scope.
- `npm test -- --runInBand`: exit 1 because Vitest 4 rejects the Jest-only `--runInBand` option. This was a command mistake, not a product failure.
- `npm test`: exit 0; 26 test files and 206 tests passed.
- `npm run build`: exit 0; Next.js compiled, type-checked, linted, generated 29 static pages, and completed production optimization.

## Configuration and deployment assumptions

- Local frontend commands run from `app/web`.
- `npm run dev` is the expected local server command; `npm run start` serves a completed production build.
- The user requested a local server only; deployment authorization is false.

## Security-sensitive paths

- Auth, billing, API route, database, and webhook code exist under `app/web/src/app/api` and supporting libraries. The visual change must not modify them.
- Do not read or modify `.env` or credential files.
- Existing privacy/guardrail copy must remain available.

## Contradictions

- The spike README describes a static hero-only replacement, while the user explicitly requested applying the spike to the whole frontend. Resolution: use the spike as a visual system reference and implement the smallest CSS-first shared layer across the live frontend; do not copy its standalone markup or duplicate its validator behavior.
- Existing CSS contains older dark/ambient selectors for selected sections, while the approved direction is a cream-first global background. Resolution: retain intentional dark problem/diagnostic sections, but keep page chrome and general surfaces cream-first.

## Unknowns

- Visual approval at every route and viewport requires human browser review; automated tests can verify source/style invariants but not aesthetics.
- No screenshot regression tool is configured in the repository.

## Commands and exact results

- `git status --short --branch`: clean on `ui-implem-fileconv` before implementation.
- `npm ci`: exit 0; 224 packages added; npm reported 4 high severity vulnerabilities.
- `npm test`: exit 0; 26 files / 206 tests passed.
- `npm run build`: exit 0; production build completed with 29 generated static pages.
