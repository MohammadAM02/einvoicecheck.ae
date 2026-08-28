# Intent

Task: `targeted-public-ux-smoothing`

## User goal

Make the three named public pages feel smoother and more efficient without replacing the approved playful geometric visual identity:

- `/`
- `/what-we-check`
- `/tools/xml-generator`

The UX pass should help users reach and complete the core tool task faster while making the experience feel more polished.

## Why this matters

The current pages are visually appealing, but their interaction rhythm is uneven. The homepage uses generous spacing and continuously looping explanatory motion; the scope page's headings overpower its content; and the Generator is constrained to a narrow layout that stacks too much content and reflows abruptly when its XML preview appears.

## Non-goals

- No redesign of public pages outside the three named routes.
- No visual-identity replacement or site-wide reskin.
- No validator, generator, import, API, auth, billing, analytics, persistence, or data-contract changes.
- No new spreadsheet-row paste behavior or import format.
- No production deployment, migration, or secret change.

## Constraints

- Preserve the homepage's current sections and order.
- Preserve all `/what-we-check` content, table structure, and order; resize headings only.
- Preserve the Generator introduction copy and all existing manual/import capabilities.
- Use one shared Generator form state and one set of controls across responsive layouts.
- Use the mobile/tablet accordion below 1024px and the desktop spreadsheet workbench at 1024px and above.
- Preserve responsive data when the viewport crosses the breakpoint.
- Respect existing accessibility semantics and reduced-motion behavior.

## Open questions

None. The design direction was approved for specification on 2026-08-26.

## Documentation status

> **Recorded 2026-08-28 20:43 AST:** the specification is approved; implementation is deliberately deferred. Publishing this documentation for review does not authorize production implementation, deployment, migration, or secret changes.
