# EInvoiceCheck Product Experience System

Status: canonical product-experience reference
Scope: public product, browser tools, account surfaces, and API experience
Evidence boundary: this document governs experience. Validation claims remain governed by `docs/validation-coverage.md`, repository tests, and verified runtime artifacts.

## 1. Product experience objective

EInvoiceCheck should feel like one calm, procedural preflight system. It absorbs regulatory and XML complexity, gives the user an understandable result first, and always exposes the next useful action.

The universal loop is:

**Prepare → Validate → Understand → Fix → Revalidate → Continue**

Tool-specific language makes that loop concrete:

- Generator: **Create → Validate → Export**
- Validator: **Validate → Understand → Fix → Revalidate**
- Repairer: **Repair → Review → Revalidate**
- API: **Send → Inspect → Correct → Retry → Automate**

“Continue” is deliberately broad. Depending on the user, the next destination may be an ERP, implementation workflow, accredited service provider, download, or API integration.

EInvoiceCheck sits between invoice creation and official exchange:

**ERP/accounting system → EInvoiceCheck preflight → accredited service provider**

It is not an ERP, ASP, payment system, filing layer, accreditation, or guarantee of downstream acceptance.

## 2. User types

### ERP or integration developer

- Task: validate generated payloads and automate retries.
- Needs: deterministic responses, endpoint clarity, code examples, request context, rule identifiers, and raw evidence.
- Fear: implementing against contradictory or unstable contracts.
- Depth: high by default, with a friendly summary still available.

### ERP consultant or implementer

- Task: diagnose customer mappings and explain corrections to finance and engineering teams.
- Needs: plain-language findings, copyable evidence, affected locations, and an efficient browser-to-API path.
- Fear: losing time translating raw XML failures into an actionable fix.
- Depth: mixed.

### Finance or operations user

- Task: check an invoice, understand what is wrong, and return a precise correction request.
- Needs: calm severity, human explanations, minimal jargon, preserved input, and one next action.
- Fear: technical theatre that implies legal failure without explaining a correction.
- Depth: low initially; technical evidence on demand.

### First-time evaluator

- Task: understand what the product does, where it fits, and whether it supports the required workflow.
- Needs: ecosystem explanation, scope boundaries, a sample path, and consistent terminology.
- Fear: misleading compliance claims or another generic invoicing product.
- Depth: low until intent is established.

## 3. End-to-end journeys

### Validate an invoice

1. Upload, paste, or load a clearly labelled sample.
2. Preserve the input while checks run.
3. Show progress without fake precision.
4. Lead with outcome, counts, and the correction path.
5. Group findings by operational severity and layer.
6. Reveal rule IDs, paths, line numbers, and raw evidence on demand.
7. Let the user copy the report, fix the source, and revalidate without rebuilding context.

### Generate an invoice

1. Choose a supported template.
2. Fill document, party, and line information.
3. See calculated totals and current build state.
4. Generate XML without claiming downstream validity.
5. Carry the XML directly into Validator.
6. Export only after review; validation remains a distinct step.

### Repair an invoice

1. Upload or paste XML.
2. Explain that only supported format defects may change.
3. Show progress and refusal states honestly.
4. Review before/after output and audit evidence.
5. Carry repaired output directly into Validator.
6. Revalidate using the same engine and result grammar.

### Understand a failure

1. Human result.
2. Smallest practical correction.
3. Operational state and scope.
4. Findings grouped and filterable.
5. Technical detail only when requested.

### API integration

1. Select the verified endpoint and request shape.
2. Send a representative request.
3. Inspect a friendly view or raw response.
4. Correct mapping or data.
5. Retry with request context preserved.
6. Automate after the contract and quota are understood.

### Understand product scope

1. Explain ERP → EInvoiceCheck → ASP.
2. Link claims to What We Check.
3. State supported, partial, skipped, and unsupported coverage plainly.
4. Link directly into the relevant tool without forcing a marketing detour.

### Browser validation to API

The API conversion prompt appears after the user has received value. It must describe automation of the same validation capability, not a second product identity.

## 4. Global interaction principles

### Repair over diagnosis

Every failure should move the user toward a correction. A result without a practical next action is incomplete.

### Progressive disclosure

Show the understandable answer first. Rule IDs, paths, versions, raw payloads, and evidence sit behind deliberate disclosure unless the surface is explicitly developer-dense.

### Persistent context

Keep source and result together where useful. Preserve the document, filename, handoff origin, filters, and retry state.

### One obvious next action

Every major state answers:

- Where am I?
- What happened?
- What do I do next?

Secondary actions remain available but do not compete visually.

### No repeated work

Do not make users repeat work the product already knows.

- Preserve input between retries.
- Carry Generator XML into Validator.
- Carry Repairer output back into Validator.
- Retain document/template context where appropriate.
- Copy exact errors and paths in one action.
- Preserve finding filters while users work.
- Do not request information available from the previous step.
- When safely possible, link a finding to the corresponding editable field.

### Calm compliance UX

Use precise status and severity. Avoid alarmist “NON-COMPLIANT” theatre. “Preflight failed” is operational; it does not pretend to be a legal verdict.

### State feedback

- Empty: explain accepted input and the first action.
- Ready: identify the selected source and primary action.
- Loading: preserve context, disable duplicate submission, announce status.
- Success: state what passed and the limits of that result.
- Failure: state what failed, what remains available, and how to retry.
- Partial/skipped: make incomplete coverage visually distinct from passed.
- Network/timeout: keep input and offer retry.

### Error handling

Errors use plain language, retain user work, separate input problems from service failures, and never silently discard a handoff.

### Mobile behaviour

At narrow widths, reading order beats desktop density. Actions become full width when needed, split panes stack, technical content scrolls within its own container, and no page creates horizontal overflow.

## 5. Information architecture

Top-level product navigation remains conceptually close to:

- Validate
- XML Generator
- XML Repairer
- What We Check
- API Docs
- Pricing
- Sign in/account

Validator is the hub. Generator and Repairer feed it. What We Check supplies evidence and boundaries. API Docs automate the same engine. Pricing describes access, never a conflicting contract.

Do not add top-level navigation merely to house future ideas.

## 6. Shared UX patterns

- `ToolPageHeader`: identifies the tool, purpose, and current context.
- `WorkflowStepper`: semantic ordered progress with current/completed states.
- `NextActionPanel`: labelled region containing one primary next action.
- `FindingCard`: human title, severity, explanation, fix, and technical disclosure.
- `ValidationSummary`: outcome, correction path, operational status, findings, then automation prompt.
- `StatusBadge`: common status vocabulary; never color-only.
- `TechnicalDetails`: native disclosure with copyable paths and evidence.
- `ToolWorkspace`: consistent width, spacing, and state regions.
- `StickyActions`: only when a long workflow would otherwise hide the next action.
- `EmptyState`: task-oriented, specific, and free of invented claims.
- `InputResultSplitPane`: optional advanced pattern; simple public onboarding remains intact.
- Handoff action: serializes source plus payload, moves to the hub, and restores provenance.
- Copy/download/report actions: use stable labels and immediate feedback.
- Quota/usage: visible near submission or result, never used as scare copy.

The canonical UI primitive registry lives in `docs/visual-component-system.md`.

## 7. Result hierarchy

The page-level order is:

1. Human result.
2. What to do next.
3. Operational status and scope.
4. Findings.
5. Technical depth.
6. API automation prompt.

Every useful finding answers, in this order:

1. Severity.
2. Plain-language problem.
3. Smallest practical correction.
4. Affected location.
5. Rule/source.
6. Technical evidence.
7. Retry path.

Status language:

- Passed: no blocking issue found by the checks that ran.
- Failed: one or more blocking findings.
- Warning: needs review but did not independently block the preflight.
- Skipped: a layer did not run.
- Partial: the result is incomplete for this document/profile.
- Error: the check could not complete.

## 8. Visual system

Do not reset the brand. Standardize it.

- Page widths: public reading surfaces use a readable measure; tool workspaces may widen for split layouts.
- Spacing: use the existing token scale and consistent section rhythm.
- Cards: reserve elevated containers for meaningful groups or states.
- Typography: headings explain task/state; code font is for payloads, identifiers, and technical evidence.
- Status: semantic color plus text/icon; never color alone.
- Borders/radii: existing restrained tokens; avoid nested card soup.
- Code: scrollable, selectable, high-contrast, and bounded.
- Breakpoints: explicitly verify 375, 768, 1024, and 1440 pixels.
- Motion: status feedback only; respect reduced motion; no decorative choreography.
- Density: simple by default, denser only on developer surfaces or after disclosure.

## 9. Cross-product continuity

- Generator → Validator: carry generated XML and label the result provenance as generated.
- Validator → Repairer: only offer when a safe, supported input contract exists; do not imply semantic findings are auto-repairable.
- Repairer → Validator: carry output and label provenance as repaired.
- Repairer → review → revalidate: diff and audit remain available before handoff.
- What We Check → tools: link each supported capability to the relevant action.
- API Docs → browser: use verified examples that can be tried in the browser where practical.
- Browser → API: place automation after a useful result.
- Future console: reuse the same status, finding, and technical-detail grammar.

## 10. API experience foundation

Canonical developer flow: **Send → Inspect → Correct → Retry → Automate**.

A future explorer may include:

- verified endpoint selector;
- request editor;
- response/results panel;
- friendly/raw view;
- copy as curl, Node, or Python;
- request ID, latency, API key context, and quota;
- version and deprecation visibility.

Do not invent endpoints, schemas, response fields, or version guarantees. Resolve the current Pricing/API Docs contradiction as a separate product-truth change after this UX system lands.

## 11. Accessibility

Accessibility is part of every pattern:

- semantic headings and landmarks;
- explicit form labels and grouped controls;
- keyboard-operable uploads and disclosures;
- visible focus;
- status and alert announcements;
- focus movement only when state meaningfully changes;
- status not conveyed by color alone;
- adequate target sizes and contrast;
- reduced-motion support;
- long identifiers wrap or scroll without hiding content.

## 12. Mobile rules

- Navigation opens above page content, traps no user, closes predictably, and restores the trigger state.
- Tool headers and steppers preserve reading order.
- Generator fields and line items stack without crushed controls.
- Validator findings keep the problem and fix before technical detail.
- Repairer before/after panes stack vertically with explicit labels.
- Tables use contained scrolling or mobile cards; the page itself must not overflow.
- Primary action remains visually dominant in idle, loading, error, result, and handoff states.
- Verify at 375, 768, 1024, and 1440 pixels on every material tool change.

## 13. Non-goals

This system is not:

- a backend or validation-engine rewrite;
- a branding reset;
- a compliance-claim expansion;
- a new dashboard;
- a full Developer Console;
- a chatbot authority;
- a feature explosion;
- permission to change API or billing contracts by inference.

## 14. Decision test

The same content model follows every surface:

**input/source → supported check or transformation → human result → correction/next action → revalidation/automation**

If a component, page, or message does not help that sequence, it probably does not belong.
