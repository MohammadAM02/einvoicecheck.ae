# Specification

Task: `targeted-public-ux-smoothing`

## Problem Statement

The approved playful geometric UI is visually distinctive, but three high-traffic public pages feel uneven in use. The homepage has excessive vertical pauses and continuously looping explanatory motion; `/what-we-check` uses headings that are too large relative to its reference content; and the XML Generator wastes vertical space, narrows abruptly when XML appears, and ends with launch copy that contradicts the live tool.

## Solution

Apply a targeted UX smoothing pass to only the homepage, `/what-we-check`, and the XML Generator. Preserve the existing visual identity, page content, route behavior, validation/generation contracts, and import capabilities. Tighten homepage rhythm and calm perpetual motion, resize only scope-page headings, and reorganize the Generator into a responsive shared-state workspace: spreadsheet-style at 1024px and wider, manually controlled accordion below 1024px.

## User Stories

1. As a homepage visitor, I want the existing story to flow with less empty space, so that I can understand the product without the page feeling drawn out.
2. As a motion-sensitive or task-focused visitor, I want explanatory motion to settle rather than loop forever, so that the page feels calm and readable.
3. As a visitor who reaches the homepage footer, I want a small “Back to validator” action, so that I can return to the primary tool without manually scrolling.
4. As a scope-page reader, I want headings proportionate to the reference content, so that I can scan the validation scope without oversized typography dominating the page.
5. As a scope-page reader, I want the current content and table preserved, so that typography changes do not hide or restructure important boundaries.
6. As a desktop Generator user, I want invoice lines in a dense spreadsheet-style editor, so that I can enter and compare line values efficiently.
7. As a desktop Generator user, I want compact Document and Parties information near the line editor, so that I can retain invoice context without excessive scrolling.
8. As a desktop Generator user, I want totals and available actions in a sticky rail, so that I do not lose them while editing lines.
9. As a desktop Generator user, I want generated XML in an expandable preview, so that XML remains available without permanently consuming workspace height.
10. As a mobile or tablet Generator user, I want manually controlled sections, so that I can choose which part of the form occupies the limited screen.
11. As a mobile or tablet Generator user, I want completed collapsed sections to show concise summaries, so that I can review progress without reopening every section.
12. As a user who resizes or rotates the viewport, I want entered data to remain intact, so that responsive reflow never discards work.
13. As an import user, I want the existing CSV/Generator JSON workflow preserved, so that the UX pass does not remove batch generation capabilities.
14. As a user, I want existing download, copy, reset, sample-fill, and Validator handoff actions preserved, so that layout changes do not reduce functionality.
15. As a user of the live XML Generator, I do not want to see “Get it when it lands,” so that the page does not contradict the tool I am already using.
16. As a keyboard or assistive-technology user, I want accordion controls, form labels, focus order, and status announcements to remain accessible, so that the responsive redesign is operable without a pointer.

## Requirements

- R-001: Limit production changes to the homepage, `/what-we-check`, `/tools/xml-generator`, and shared styles/components strictly necessary to support those routes.
- R-002: Preserve the homepage's existing sections, content, and order.
- R-003: Tighten homepage vertical rhythm without making interactive targets smaller than existing accessibility safeguards.
- R-004: Change the ERP-to-preflight-to-ASP explanatory animation from perpetual looping to a restrained sequence that runs once and settles in its informative final state; continue honoring `prefers-reduced-motion`.
- R-005: Add a small link/button labeled “Back to validator” beside the homepage footer links, targeting the existing `#validate` anchor without a route reload.
- R-006: Add route-scoped typography for `/what-we-check`: cap the page `h1` at 2.75rem and section `h2` headings at 1.8rem while retaining responsive minimums, current body/table text, content, table, section order, and disclosures.
- R-007: Preserve the XML Generator introduction copy unchanged.
- R-008: Give the XML Generator a generator-specific wide container rather than the generic 800px non-validator container.
- R-009: At viewport widths of 1024px and wider, present the manual Generator as a spreadsheet workbench: compact Document and Parties groups, a dominant line-item grid, and a sticky summary/actions rail.
- R-010: Below 1024px, present Document, Parties, Lines, and Totals/XML as independently controllable accordion sections. Document is open by default; users manually open and close sections.
- R-011: Collapsed mobile/tablet sections show concise summaries derived only from current client-side form/totals state. Completion means: Document has template, invoice number, and issue date; Parties has both names and valid 15-digit TRNs; Lines has at least one line and every existing line satisfies the current minimal line checks. Incomplete sections must not be represented as complete.
- R-012: Use one shared form state and one semantic set of inputs across both responsive presentations. Do not render duplicate desktop/mobile controls, and do not clear or rewrite data when crossing the 1024px breakpoint.
- R-013: The desktop summary/actions rail remains visible while the line editor scrolls where viewport height permits. It shows existing live totals and existing applicable actions; it must not add a new manual Generate action or change debounced automatic XML generation.
- R-014: Keep the XML preview unmounted until the current building/ready conditions are met. When present, expose it through an expandable desktop rail section and the mobile Totals/XML section without narrowing or reflowing the primary desktop editor.
- R-015: Preserve existing Generator actions and behavior: add/remove line, automatic generation, download XML, copy XML, reset with confirmation, sample fill, and Validator handoff.
- R-016: Preserve the separate “Import invoice data” mode and its existing CSV/Generator JSON file selection, drag/drop, one-to-50 invoice cap, preview, partial-success, retry, ZIP/download, open-in-form, and Validator handoff behavior.
- R-017: Do not add direct spreadsheet-row clipboard paste, a new import format, or a new generation state machine.
- R-018: Do not render the generic “Get it when it lands” / “Sign up for launch access” continuation on the live XML Generator route; preserve it for genuinely unshipped non-validator tools.
- R-019: Preserve existing guardrail, privacy, “independent preflight,” and “not transmitted” language.

## Implementation Decisions

- Use scoped page/workspace classes rather than changing global heading or container behavior for unrelated routes.
- Keep `GeneratorWorkspace` as the owner of form and generated-output state. Responsive presentation is derived from CSS and accordion UI state, not separate desktop/mobile form instances.
- Accordion collapse is presentation-only below 1024px. At desktop width all editor groups remain visible regardless of which mobile sections were last collapsed.
- Preserve semantic `fieldset`/`legend` groupings and explicit labels. Spreadsheet styling must not replace labeled controls with non-semantic editable cells.
- Use buttons with `aria-expanded` and `aria-controls` for accordion headers. Collapsed content must leave the keyboard tab order.
- Keep the existing entry-mode switch between manual and import workflows.
- Reorder presentation surfaces only within the manual Generator; do not change request payloads, debounce timing, totals formulas, category restrictions, session handoff keys, or analytics payloads.
- Keep the Generator's current playful teal/navy/cream styling and hard-shadow treatment while reducing layout-induced movement.

## Testing Decisions

- Prefer the existing highest public seams: homepage component rendering, Generator workspace interaction, Generator import interaction, and tool-route copy behavior.
- Extend homepage tests to assert the footer return action and retained content/order.
- Extend Generator workspace tests to assert accessible accordion controls, manual expand/collapse, honest completion summaries, preserved actions, and a single semantic instance of each control.
- Keep and rerun Generator import tests to prove the separate CSV/JSON workflow remains available and unchanged.
- Extend route-level tests to prove the XML Generator receives its dedicated layout hook and does not render the launch CTA, while other unshipped tools retain it.
- Add focused source/CSS assertions only for behavior that jsdom cannot calculate reliably: the 1024px layout boundary, desktop sticky rail, desktop visibility override for collapsed mobile panels, route-scoped heading caps, and one-shot/reduced motion.
- Manually verify the built application at 390px, 768px, 1024px, and 1440px, including viewport crossing with populated form data.
- Run the full frontend test suite and production build; do not weaken existing tests.

## Non-functional requirements

- No new runtime or development dependency.
- No horizontal page overflow at representative mobile, tablet, and desktop widths.
- Existing 44px interactive target and visible-focus safeguards remain effective.
- No new network request, storage location, or invoice-data persistence.
- Responsive reflow must not trigger avoidable cumulative layout shift when XML becomes ready.
- Styling remains scoped so unrelated routes retain their current typography and layout.

## Out of Scope

- Site-wide public-route redesign.
- Reordering or removing homepage sections.
- Rewriting `/what-we-check` content, converting it to cards/accordions, or changing body/table text size.
- Changing Generator introduction copy.
- Spreadsheet keyboard shortcuts beyond native control behavior.
- Multi-row clipboard paste.
- New CSV/JSON schemas or import formats.
- API, backend, generator contract, validation, auth, billing, analytics contract, database, or deployment changes.
- GitHub Issue creation until separate explicit approval.

## Clarifications

- “PC” means viewport width at or above 1024px; narrower desktop windows use the mobile/tablet accordion.
- “Paste capabilities” refers to the existing Validator XML paste; this task does not move that behavior into the Generator line grid.
- “Smooth” means less unnecessary distance, no perpetual explanatory motion, stable responsive reflow, and actions kept near the editing context—not adding decorative animation.
- The transient HTML concepts are visual references only and must not be shipped or imported into the Next.js application.
