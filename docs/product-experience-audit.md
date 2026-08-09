# Current Product Experience Audit

Audit baseline: `b118ba568566c381775f8d098fe89238f7c64794`
System reference: `docs/product-experience-spec.md`
Scope: major public routes and browser tool components. Validation semantics were inspected only to avoid UX misrepresentation; they are not changed by this pass.

## Executive finding

The product has strong individual tool workflows but inconsistent product grammar around them. Generator and Repairer already hand off real XML to Validator. The mobile navigation fix and What We Check page are valuable foundations. The remaining high-leverage work is to standardize headers, progress, result hierarchy, next actions, and handoff provenance without redesigning the site.

## Strongest existing pieces

- Validator is already the practical hub.
- Generator and Repairer use a real session-storage handoff rather than decorative links.
- Validator preserves input across timeout/network retry states.
- Findings lead with readable content and hide technical paths/rules in a disclosure.
- Generator fields have programmatic labels and semantic groups.
- Repairer provides before/after evidence and refuses unsafe semantic changes.
- What We Check states scope conservatively and links back into the product.
- Mobile navigation stacking has a regression test.
- Brand, typography, color, and public visual tone are already coherent.

## Cross-product fragmentation

- Generator and Repairer duplicate visually similar steppers and next-action panels with different markup and class names.
- Tool page headings live outside workspaces while workspace progress begins abruptly, weakening context continuity.
- Validator consumes handoffs but loses their source after validation and labels all handed-off XML `repaired.xml`.
- The result page currently pitches the API before findings and shows profile metadata before the correction path.
- “Build/Validate” and “Repair format/Validate” are useful local verbs but are not connected to a documented universal loop.
- Cross-tool handoff state is transport-only; provenance is not carried into the human result.

## Priority gaps

### P0 — task-breaking or misleading

#### P0-1: Pricing and API Docs contradict the `v1` contract

Pricing describes canonical JSON/envelope/XML on `/v1/validate`. Current route tests reject the canonical JSON shape there and direct clients to `/v1/preflight`. A developer can implement the wrong integration based on which page they read.

Decision: confirmed product-truth defect. Fix immediately after this UX branch. Do not include it here because it requires explicit endpoint-contract reconciliation.

### P1 — major usability inconsistency

#### P1-1: Handoff provenance is lost

Generator and Repairer outputs arrive in Validator, but the result does not state where the document came from. Generator XML is incorrectly labelled `repaired.xml`.

#### P1-2: Result hierarchy conflicts with the system

API conversion appears before findings, while detected type/profile metadata appears before the practical correction path. Reorder to human result → next action → operational status → findings → technical depth → automation.

#### P1-3: Duplicate workflow primitives drift

Generator and Repairer implement separate steppers and next panels for the same job. Extract shared presentational primitives; do not touch their state machines.

#### P1-4: Tool context is inconsistent

Use one reusable tool-header pattern where a workspace needs its own context. Avoid duplicate H1s when the route already owns the page heading.

#### P1-5: Responsive tool states need preview proof

The code contains mobile rules, but changed-branch proof is required for Generator rows, Repairer diffs, long findings, and page overflow at 375/768/1024/1440.

### P2 — polish and convenience

- Preserve result filters through future correction workflows.
- Add one-click finding path/rule copy where evidence supports it.
- Consider advanced Validator split-pane mode for repeat users without replacing simple onboarding.
- Improve What We Check deep links into specific tool states.
- Make quota visible before submission when account/API behaviour is reconciled.
- Add a verified browser-example bridge from API Docs.

## Screen audit

### Homepage / Validator

Aligns: dominant task, calm copy, accessible input, retry preservation, focused result mode.
Fragmented: origin context disappears; result action hierarchy needs reordering.
Mobile risk: long findings, full-width actions, navigation overlay, and hidden overflow.

### XML Generator

Aligns: guided form groups, calculated totals, preview, direct Validator handoff.
Fragmented: bespoke stepper/next panel; build language is not anchored to the product loop.
Mobile risk: line inputs, totals, preview code, and action wrapping.

### XML Repairer

Aligns: narrow repair scope, progress, refusals, diff, audit evidence, direct revalidation.
Fragmented: duplicate progress/action patterns and generic completion container.
Mobile risk: before/after diff and tables.

### What We Check

Aligns: source-of-truth role, conservative boundaries, ecosystem explanation.
Gap: deeper links into relevant tool actions can reduce dead ends.

### API Docs

Aligns: part of global navigation and positioned as automation of validation.
P0: public contract contradicts Pricing/current tests.
Gap: future request/response explorer should reuse Validator result grammar.

### Pricing

Aligns: plan comparison and route to API access.
P0: endpoint/request-shape wording conflicts with the implementation contract.

### Auth/account

Aligns: task-focused surfaces.
Gap: quota, key, and endpoint context should use the same status and action hierarchy as browser results.

## Implementation scope for this branch

- Add canonical experience and component-system documents.
- Add shared `ToolPageHeader`, `WorkflowStepper`, and `NextActionPanel` primitives.
- Replace Generator/Repairer duplicate presentation with those primitives.
- Preserve and display Validator handoff provenance.
- Correct Generator handoff filename.
- Reorder Validator result content so the correction path and findings precede API conversion.
- Add focused tests.

## Explicitly deferred

- API/Pricing contract correction.
- Validator → Repairer automatic routing.
- Developer Console.
- Chatbot/explainer.
- Advanced split-pane Validator.
- Backend or validation semantics.
- Generator invoice-type-code correction tracked separately in `.hermes/critic-loop.md`.
