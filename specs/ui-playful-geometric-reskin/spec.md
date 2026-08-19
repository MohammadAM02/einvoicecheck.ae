# Specification

Task: `ui-playful-geometric-reskin`

## Problem

The live frontend has a restrained cream compliance-desk system, while the approved spike demonstrates a more memorable playful geometric treatment. The visual language needs to be applied consistently across the real frontend without copying a static prototype or changing product behavior.

## Requirements

- R-001: Apply the spike’s teal/navy/cream playful geometric visual language to all shared frontend surfaces rendered through the root layout.
- R-002: Preserve the primary off-white/cream page background and existing semantic color roles; do not replace the page with a dark or neon theme.
- R-003: Add rounded pop treatment, geometric accents, sticker-like labels where appropriate, tilted/irregular panel treatment, and hard-shadow depth to shared navigation, buttons, cards, forms, validator workspaces/results, pricing, FAQ, tables, and content panels.
- R-004: Keep existing JSX behavior, routes, copy, form state, validation flow, auth flow, and API interactions unchanged unless a minimal class hook is strictly necessary for styling.
- R-005: Keep responsive layouts usable at mobile widths and preserve minimum interactive target sizing and visible focus states.
- R-006: Respect `prefers-reduced-motion: reduce`; decorative motion must be disabled or reduced.
- R-007: Add a focused regression test for stylesheet loading and the core visual invariants, without weakening existing tests.

## Non-functional requirements

- CSS-first implementation; reuse the existing stylesheet stack and tokens.
- No new dependency.
- Keep the change scoped to frontend presentation files and related tests/spec artifacts.
- Preserve existing accessibility semantics and privacy/guardrail copy.

## Out of scope

- API/backend logic, route handlers, database, auth, billing, analytics, validation, generation, or data retention behavior.
- Production deployment, push, migration, or secret changes.
- Copying the standalone spike HTML/JavaScript into the Next app.

## Clarifications

- “Whole frontend” is defined as all browser-rendered pages using the shared root layout and global styles, not the API/backend.
- The primary page background remains `#f7f8f5` / `var(--bg)`.
