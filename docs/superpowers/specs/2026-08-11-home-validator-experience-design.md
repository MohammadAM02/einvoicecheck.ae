# Homepage + Validator Station Experience Design

## Goal

Make the public homepage sell the product with energy and clarity while preserving immediate hands-on proof, then move real validation work into a dedicated Validator Station that feels like a serious product surface rather than a result card embedded in marketing copy.

## Product truth preserved

- Browser validation remains XML-only.
- The browser validator remains a preflight surface, not an ASP, filing service, archive, tax adviser, or guarantee of downstream acceptance.
- Submitted browser-validator invoice content is processed in memory and is not persisted by the application.
- API contract remains unchanged: `/v2/validate` for new XML integrations, `/v1/preflight` for canonical JSON data preflight, `/v1/validate` for legacy compatibility.
- No validation, authentication, billing, quota, API-route, or compliance semantics change in this work.

## Experience architecture

### Homepage = desire + understanding

Keep the validator input in the hero so visitors can try the product immediately. Do not render final validation results in the homepage. Once a valid XML input is chosen, pasted, or sampled, hold the XML in an in-memory client handoff and navigate to `/tools/uae-e-invoice-validator`.

Rewrite the homepage around a stronger narrative:

1. Your ERP can create the invoice. That does not mean the file is ready.
2. Small data, mapping, XML, and totals defects become rejection and troubleshooting work later.
3. EInvoiceCheck sits before the ASP and makes those defects visible while they are still easy to fix.
4. Show this visually as an animated ERP → Preflight → ASP route with a document that pauses at a failed field and continues after correction.
5. Show one realistic diagnostic example rather than generic feature-card copy.
6. Introduce API automation only after the user understands the single-invoice value.

The page should feel precise and alive: stronger typographic rhythm, asymmetrical compositions, technical annotations, compact visual callouts, purposeful line/icon motion, and fewer repetitive card stacks.

### Validator Station = work + evidence

Elevate the existing `/tools/uae-e-invoice-validator` surface into the primary working page for browser validation.

The station has:

- a `Validator Station` header plus current file/origin context when available;
- a short, confident working message instead of SEO/article-style lead copy above the tool;
- a wide working canvas instead of the current 800px article container;
- the existing layered validation result as the technical source of truth;
- visible Format / Structure / Semantic layer filters and counts;
- result-first hierarchy: status, blocking issues/warnings, findings, practical guidance, then supporting context;
- the existing correct-and-revalidate / validate-another-file path, with batch validation kept secondary;
- API conversion copy below the work surface, never competing with the current result.

## Handoff behavior

The homepage handoff must preserve the browser validator's non-persistence claim. It therefore uses a module-scoped in-memory handoff, not `localStorage` or `sessionStorage`. Existing Generator/Repairer handoffs keep their established session-storage mechanism; this redesign does not alter those product flows.

For homepage input:

1. Read/accept the XML exactly as today.
2. Hold `{ source: 'homepage', fileName?, xml }` only in client module memory.
3. Navigate to `/tools/uae-e-invoice-validator`.
4. Tool-context `ValidatorWorkspace` consumes and clears the in-memory handoff before checking the existing Generator/Repairer session handoff.
5. It immediately validates the same XML and displays the dedicated result surface.

No homepage invoice content is written to browser storage, application storage, or analytics.

## Copy direction

The tone is technically literate, commercially alive, and concise. Use concrete failure language—source data, mapping, XML structure, code lists, totals, field-level guidance—without implying official acceptance or complete conformity.

Key homepage lines:

- H1: `Your ERP can create the invoice. That doesn't mean the file is ready.`
- Supporting line: `Catch the broken field, mapping or total before it becomes an ASP rejection loop.`
- Product line: `Drop in PINT-AE XML. EInvoiceCheck shows what failed, where it failed, and the smallest practical fix.`
- Flow headline: `Find the fault while it is still yours to fix.`
- Diagnostic headline: `Don't get an “invalid invoice.” Get the reason.`
- API headline: `When one clean invoice becomes a thousand.`

The concrete homepage example includes a correction because that example has one. Product-wide copy must not imply that every engine finding always includes a suggested fix.

## Motion language

Motion demonstrates state; it does not decorate.

- document pulse travels ERP → EInvoiceCheck → ASP;
- the preflight node pauses/highlights an error state before resolving;
- connector lines draw/fill on entry;
- diagnostic callouts reveal with short vertical motion;
- hover/focus movement stays within a few pixels;
- all non-essential animation is disabled by `prefers-reduced-motion`.

## Accessibility and responsive behavior

- Keep semantic headings, lists, buttons, details, labels, and keyboard-operable drop zone.
- Do not make animation required to understand information.
- Dedicated station must not create horizontal page overflow at 375, 768, 1024, or 1440px.
- Long rule IDs, XML paths, and code snippets must wrap or scroll inside their own containers.
- Focus behavior for errors/retry stays intact.

## Verification

- Focused component tests for homepage copy/order and homepage → station handoff.
- Existing validator behavior tests remain green for tool context.
- Production build/typecheck where available.
- Final diff review for accidental API/validation/auth/billing changes and stale public copy.
- Deployed browser QA at 375, 768, 1024, and 1440px before claiming the redesign production-ready.
