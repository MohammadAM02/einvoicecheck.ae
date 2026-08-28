# Acceptance Scenarios

Task: `targeted-public-ux-smoothing`

| ID | Given | When | Then | Verification |
|---|---|---|---|---|
| A-001 | A visitor opens the homepage | They scroll through the page | Every current homepage section appears in the current order, with tighter section spacing and no removed content | Homepage component test + manual 390/1440px review |
| A-002 | A visitor views the ERP-to-preflight-to-ASP story without reduced motion | The explanatory sequence starts | It runs once and settles in a readable final state rather than looping indefinitely | Focused CSS/source test + manual review |
| A-003 | A visitor requests reduced motion | The homepage loads | Decorative motion is effectively disabled by the existing reduced-motion safeguard | Existing/focused CSS test |
| A-004 | A visitor reaches the homepage footer | They inspect footer actions | A small “Back to validator” action is present beside the footer links and targets `/#validate` or `#validate` without a different destination | Homepage component test |
| A-005 | A visitor opens `/what-we-check` | They scan the page | The route-scoped `h1` does not exceed 2.75rem and section `h2` headings do not exceed 1.8rem; unrelated route headings are unchanged | Focused scoped-style test + manual 390/1440px review |
| A-006 | `/what-we-check` is rendered | The typography adjustment is applied | Existing lead/body text, behavior table, boundaries, transparency content, FAQ, and section order remain present | Page/component or source regression test |
| A-007 | A user opens the XML Generator at 1440px | Manual mode is active | A wide workbench shows compact Document and Parties groups, a spreadsheet-style line grid, and a sticky totals/actions rail | Responsive CSS assertion + manual 1440px review |
| A-008 | A user opens the XML Generator at exactly 1024px | Manual mode is active | The desktop spreadsheet workbench is used | Responsive CSS assertion + manual 1024px review |
| A-009 | A user opens the XML Generator below 1024px | Manual mode is active | Document, Parties, Lines, and Totals/XML are exposed as keyboard-operable accordion sections; Document starts open | Generator workspace test + manual 390/768px review |
| A-010 | A mobile/tablet user has completed a section | They collapse it | Its summary reports the relevant current values and a completion indicator | Generator workspace test |
| A-011 | A mobile/tablet section is incomplete | It is collapsed | It is not marked complete and its summary does not claim readiness | Generator workspace test |
| A-012 | A user has entered manual Generator data | The viewport crosses 1024px in either direction | The same controls reflow without duplicate field instances and all entered data remains unchanged | Generator workspace test for single controls + manual resize review |
| A-013 | The manual Generator is initially incomplete | The page renders | Totals remain available, XML preview is absent, and automatic generation is not triggered before existing minimal validity rules pass | Existing Generator workspace tests |
| A-014 | The manual Generator becomes valid | Debounced generation enters building/ready state | XML appears inside the appropriate expandable output region without narrowing the desktop line editor | Existing generation test + new DOM/CSS assertion + manual review |
| A-015 | Generated XML is ready | The user uses Download, Copy, or Validate | Existing download, clipboard, and Validator handoff behavior remains unchanged | Existing Generator workspace tests |
| A-016 | A user edits line items | They add/remove lines or change quantity, price, or VAT category | Existing supported category restrictions and live totals remain correct | Existing Generator workspace tests |
| A-017 | A user selects “Import invoice data” | They import CSV or Generator JSON | Existing one-to-50 invoice parse, preview, generation, partial-success, retry, download/ZIP, open-in-form, and Validator handoff workflows remain available | Existing Generator import and invoice-import tests |
| A-018 | A visitor opens the live XML Generator | They reach the content below the workspace | The page does not show “Get it when it lands” or “Sign up for launch access” | Tool route copy test |
| A-019 | A visitor opens an unshipped non-validator tool | They reach its continuation | Existing launch messaging remains present | Tool route copy test |
| A-020 | A keyboard user operates the mobile accordion | They tab and activate section headers | Each header exposes correct `aria-expanded`/`aria-controls`, collapsed controls leave tab order, and visible focus remains | Generator workspace test + manual keyboard review |
| A-021 | The frontend is tested and built | Verification commands run | All tests pass and the production build succeeds without new dependency | `npm test` + `npm run build` |

## Failure and security scenarios

- Responsive layout changes must never clear or persist invoice data beyond existing behavior.
- No duplicate responsive controls may cause conflicting labels, duplicate IDs, double analytics events, or duplicate generation requests.
- The task must not change API payloads, endpoint selection, debounce timing, validation criteria, category rules, import limits, bounded concurrency, session handoff keys, or privacy behavior.
- The task must not read or modify `.env`, credentials, auth, billing, database, API/backend, or deployment files.
- Existing guardrail and non-accreditation language remains visible.
- Existing reduced-motion, focus, and minimum-target safeguards must not be weakened.
