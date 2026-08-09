# EInvoiceCheck Visual Component System

This document is the implementation registry for the Product Experience System. Experience rules live in `docs/product-experience-spec.md`; this file defines the reusable UI primitives that carry those rules.

## Boundary

Create a shared primitive only when it prevents behavioural or visual drift across surfaces. Do not extract one-off layout for architectural neatness. Do not create a second primitive that differs only cosmetically.

## Canonical primitives

### ToolPageHeader

Purpose: establish tool identity and context before interaction.

Contains:

- optional eyebrow/status;
- one page-level heading;
- concise task description;
- optional context/provenance message.

Rules:

- never duplicate the route page heading;
- do not embed marketing CTAs;
- descriptions state capability without strengthening claims.

### WorkflowStepper

Purpose: show a short, real workflow.

Rules:

- semantic ordered list;
- each step has `current`, `complete`, or `upcoming` state;
- current step uses `aria-current="step"`;
- labels reflect observable states, not aspirational copy;
- two to five steps; longer processes need another pattern.

### NextActionPanel

Purpose: answer “what now?” after a meaningful state change.

Rules:

- labelled region;
- one primary action;
- optional short explanation and secondary action;
- uses the same status/action hierarchy across Generator, Repairer, and Validator;
- no inline one-off styling.

### FindingCard

Purpose: turn validation evidence into an actionable unit.

Order:

1. severity and human title;
2. explanation;
3. smallest practical fix;
4. location when available;
5. technical disclosure with rule/source/evidence.

### ValidationSummary

Purpose: coordinate the result page.

Order:

1. result heading and count;
2. next action/guidance;
3. detected type/profile and quota;
4. layer filters and findings;
5. report actions;
6. API automation prompt.

### StatusBadge

Purpose: communicate passed, failed, warning, skipped, partial, or error state.

Rules:

- text is mandatory;
- icon is optional;
- color supports meaning but never carries it alone;
- use shared semantic tokens.

### TechnicalDetails

Purpose: progressively disclose rule IDs, paths, raw evidence, versions, or hashes.

Rules:

- use native `details`/`summary` where practical;
- closed by default for public/finance surfaces;
- technical content is selectable and copyable;
- code areas scroll internally.

### ToolWorkspace

Purpose: provide consistent width, spacing, and state regions.

Rules:

- avoid cards around cards;
- public mode prioritizes onboarding;
- advanced split-pane mode is a deliberate variant, not an automatic desktop transformation;
- the same component owns empty, loading, error, and result placement.

### StickyActions

Purpose: keep the next action reachable in long workflows.

Rules:

- use only when normal flow hides a frequent primary action;
- never obscure fields or mobile browser controls;
- collapse to normal flow when viewport height or width makes stickiness harmful.

### EmptyState

Purpose: start a task without a dead screen.

Contains:

- what input is accepted;
- one primary action;
- optional sample;
- privacy/size note only when useful.

### CodeBlock

Purpose: present payloads, responses, commands, diffs, and identifiers.

Rules:

- label language/context;
- copy action when useful;
- contained horizontal scrolling;
- never force page-level overflow;
- wrapping is allowed for explanatory logs, not when it destroys payload meaning.

## Shared class contract

- `.tool-page-header`
- `.tool-page-header__eyebrow`
- `.tool-page-header__description`
- `.workflow-stepper`
- `.workflow-stepper__step`
- `.workflow-stepper__marker`
- `.workflow-stepper__label`
- `.next-action-panel`
- `.next-action-panel__body`
- `.next-action-panel__actions`
- `.validation-result-origin`

Existing feature-specific classes remain valid where their behaviour is unique. Generator and Repairer must not maintain duplicate stepper or next-panel CSS after adopting the shared primitives.

## Responsive contract

### 375 px

- single-column tools;
- full-width primary actions;
- Generator line controls stack;
- Repairer diff columns stack;
- no page-level overflow.

### 768 px

- preserve comfortable tablet reading order;
- avoid forcing desktop split panes merely because two columns technically fit.

### 1024 px

- enable useful split layouts where content remains readable;
- navigation and tool actions must not collide.

### 1440 px

- constrain reading width;
- use additional space for persistent context, not oversized empty margins or stretched prose.

## Adding a primitive

Before adding one:

1. Identify at least two real consumers.
2. Name the behavioural inconsistency it removes.
3. Check this registry for an existing primitive or variant.
4. Add accessibility and responsive rules.
5. Add a focused behavioural test.

If those conditions are not met, keep the implementation local. `CardVariantFinal_v3` is not a design system; it is surrender with a filename.
