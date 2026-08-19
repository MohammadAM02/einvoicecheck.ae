# Intent

Task: `ui-playful-geometric-reskin`

## User goal
Apply `spikes/005-playful-geometric-validator-reskin` to the live Next.js frontend so the site uses its playful geometric visual language across the shared frontend surfaces, while keeping the original off-white/cream background and existing product behavior.

## Scope interpretation
“Whole frontend” means all browser-rendered pages that use `app/web/src/app/layout.tsx` and its global styles. This includes navigation, marketing pages, validator/generator workspaces, forms, cards, result panels, tables, pricing, auth, dashboard, and legal/content pages. It does not include API route behavior or backend services.

## Non-goals
- No changes to validation, generation, auth, billing, API, data handling, or routing behavior.
- No production deployment, push, migration, or secret changes.
- No new runtime dependency.
- No dark/neon background replacement; retain `--bg: #f7f8f5` as the primary page background.
