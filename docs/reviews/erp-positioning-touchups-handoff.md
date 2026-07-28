# ERP Positioning Touch-ups Handoff

## Original task and approved positioning

This work was a focused round of design and messaging touch-ups, not a redesign. The existing architecture, working validator, finance-oriented interface, and free-validator-first product decision were to remain intact.

The approved positioning is:

> Your ERP creates the invoice. We check whether it will pass.

einvoicecheck.ae is positioned as a preflight, testing, and troubleshooting tool for UAE e-invoices produced by ERPs, accounting systems, and integrations. It is intended for ERP vendors and implementation partners, finance teams involved in implementation and testing, developers building PINT-AE integrations, and consultants diagnosing failures. It is not positioned as a manual invoicing workflow for businesses without accounting software.

The approved hero direction was:

- Headline: "Check your UAE e-invoice before your ASP does"
- Supporting copy: upload a PINT-AE XML file to find validation, mapping, and data errors before rejection
- Primary action: "Validate an invoice"
- Uploader context: built for testing, implementation, and troubleshooting; not another invoicing system
- API bridge: validation inside an ERP or workflow, before submission

## Decisions made during implementation

- Kept the validator as the dominant first action and retained its existing behavior.
- Used one coherent "competent preflight colleague" direction: calm navy and teal, stronger hierarchy, concise diagnostic language, and restrained status/check motifs.
- Reframed the hero around ERP output and ASP submission rather than recurring manual invoice entry.
- Replaced the generic audience cards with a failure-focused section covering rejected files, broken mappings, incorrect data, ERP configuration, and unclear errors.
- Added a simple ERP export -> preflight validation -> ASP submission path to explain where the product fits.
- Made the API section the natural automated continuation of the free validator rather than a separate product pitch.
- Kept an API CTA close to validation results so long error lists do not bury the commercial next step.
- Added footer navigation only to routes already present in the application.
- Preserved explicit limitations and the preflight-only guardrail to counterbalance the concise hero promise.
- Reused existing React components and the existing CSS system; no dependency or architecture changes were introduced.

## Exact files changed

Implementation and tests:

- `app/web/src/app/globals.css`
- `app/web/src/app/page.tsx`
- `app/web/src/components/Chrome.tsx`
- `app/web/src/components/FreeVsApi.tsx`
- `app/web/src/components/HomeClient.tsx`
- `app/web/src/components/ScopePanel.tsx`
- `app/web/src/components/TrustStrip.tsx`
- `app/web/src/components/validation/ValidationSummary.tsx`
- `app/web/src/components/validation/ValidatorWorkspace.tsx`
- `app/web/test/homepage.test.tsx`
- `app/web/test/navigation.test.tsx`
- `app/web/test/validation-summary.test.tsx`
- `app/web/test/validator-workspace.test.tsx`

Review evidence added for handoff:

- `docs/reviews/erp-positioning-touchups-handoff.md`
- `docs/reviews/screenshots/erp-positioning-touchups-desktop-1440.png`
- `docs/reviews/screenshots/erp-positioning-touchups-api-desktop-1440.png`
- `docs/reviews/screenshots/erp-positioning-touchups-mobile-390.png`
- `docs/reviews/screenshots/erp-positioning-touchups-375.png`
- `docs/reviews/screenshots/erp-positioning-touchups-768.png`
- `docs/reviews/screenshots/erp-positioning-touchups-1024.png`
- `docs/reviews/screenshots/erp-positioning-touchups-1440.png`

No files under `app/api` were changed.

## Sections and copy changed

### Metadata and navigation

- Page title changed from "Free UAE E-Invoice Validator" to "UAE E-Invoice Preflight Validator".
- Description now leads with ERP-generated PINT-AE XML, mapping errors, and ASP submission.
- Primary navigation CTA changed from "Validate free" to "Validate an invoice".

### Hero and validator

- Hero headline changed to "Check your UAE e-invoice before your ASP does".
- Added "Your ERP creates the invoice. We check whether it will pass."
- Supporting copy now names PINT-AE XML and validation, mapping, and invoice-data errors.
- Validator heading changed from "Validate a file - free" to "Validate an invoice".
- Format line now says "PINT-AE XML or canonical JSON, maximum 256 KB".
- The in-app privacy cue now says validation occurs in memory and that this application does not persist submitted content, rather than making an unverified infrastructure-wide storage claim.
- Added "Built for testing, implementation and troubleshooting. Not another invoicing system."

### Trust strip and problem section

- Trust facts now distinguish PINT-AE XML from canonical JSON, retain no-signup and independence from ASPs, and scope the content-persistence statement to the application.
- Replaced the former audience-card section with "When an ERP-generated invoice fails".
- Added the ERP export -> preflight validation -> ASP submission sequence.
- Added five diagnostic problem areas: rejected files, broken XML mappings, incorrect invoice data, ERP configuration problems, and unclear validation errors.

### Example result, API bridge, and validation results

- Example-result heading now focuses on finding and fixing the cause.
- The free/API comparison now distinguishes one-off troubleshooting from automated ERP/workflow validation.
- API headline changed to "Need validation inside your ERP or workflow?"
- Primary API CTA changed to "Automate validation with the API".
- Failed validation results now include mapping/data guidance and a nearby "Use the validation API" link.

### Scope and footer

- "Not currently included" was renamed "Current limitations".
- Included and limitation groups received clearer visual treatment.
- Added Privacy, Terms, Refunds, Contact, and Documentation links to existing routes.

## Deliberately left unchanged

- Backend validation logic and every file under `app/api`.
- Validator request, file-reading, retry, reset, and result-copy behavior.
- The known stale-document Retry correctness work.
- Finance-readable error mapping work.
- Rate-limit correctness and server configuration work.
- Authentication, signup, billing, pricing, API keys, and PayPal behavior.
- Application architecture, routing model, deployment configuration, and dependencies.
- The free-validator-first page order.
- Existing preflight limitations and the non-ASP/non-filing guardrail.
- Production deployment and merge state. The Railway PR environment has deployed successfully; the production domain remains unchanged pending review and merge.

## Tests and commands run

Run from `app/web` on 2026-07-28:

- `npm test`
  - Result: 14 test files passed, 94 tests passed, exit code 0.
- `npm run build`
  - Result: Next.js 15.5.22 production build passed, type checking passed, and 25 pages were generated, exit code 0.
- `npx next start -p 3109`
  - Result: local production server started successfully for browser review.

Review checks:

- Playwright CLI screenshots at exactly 375x900, 768x900, 1024x900, and 1440x900.
- At each exact width, `document.documentElement.scrollWidth === window.innerWidth`; no horizontal overflow was detected.
- Navigation was manually opened and inspected at 375px and 768px. The primary validator action was visible in every screenshot; desktop navigation was visible at 1024px and 1440px.
- Local route checks returned HTTP 200 for `/`, `/docs`, `/pricing`, `/signup`, `/login`, `/legal/privacy`, `/legal/terms`, `/legal/refunds`, and `/contact`.
- `git diff --quiet origin/main...HEAD -- app/api` confirmed no backend API changes before this handoff was added.

## Browser sizes reviewed

- 375x900, 768x900, 1024x900, and 1440x900 in Chromium via Playwright CLI.

Each screenshot was manually inspected. There was no horizontal overflow, broken navigation, hidden validator primary action, or awkward headline/action wrapping. Mobile navigation was expanded at 375px and 768px; desktop navigation was visible at 1024px and 1440px.

## Screenshots

- `docs/reviews/screenshots/erp-positioning-touchups-desktop-1440.png`
- `docs/reviews/screenshots/erp-positioning-touchups-api-desktop-1440.png`
- `docs/reviews/screenshots/erp-positioning-touchups-mobile-390.png`
- `docs/reviews/screenshots/erp-positioning-touchups-375.png`
- `docs/reviews/screenshots/erp-positioning-touchups-768.png`
- `docs/reviews/screenshots/erp-positioning-touchups-1024.png`
- `docs/reviews/screenshots/erp-positioning-touchups-1440.png`

## Known limitations and unresolved concerns

- Railway's PR environment `web-https-einvoicecheckae-pr-8.up.railway.app` deployed successfully and reported a successful `EINVOICECHECK - WEB` external status. Production remains unchanged until review, merge, and production deployment.
- The local browser console reports a 404 for `/favicon.ico`. This predates the positioning work and remains a separate follow-up: no approved favicon asset was supplied, and inventing one would be an unnecessary visual change in this evidence-focused pass.
- This repository has no `.github/workflows` configuration. GitHub reports no Actions or check-run records for commit `9549da3`; the Railway PR deployment is the sole current CI-like check. The npm test/build commands documented here are local verification, not hosted CI.
- Codex hook audit: four trusted Agent Guard hooks are active (PreToolUse, PostToolUse, SessionStart, Stop). They are plugin hooks, not repository hooks and not codebase-recon. The cache lacks Agent Guard's required executable and its Unix `sh -c` command is incompatible with the Windows shell packaging; no hook was disabled or edited because a security-hook change would not be safe without a corrected plugin package.
- No live production validation request was sent as part of this frontend-only PR handoff.
- The hero promise "We check whether it will pass" is positioning shorthand, not a guarantee of ASP or authority acceptance. The page retains "Current limitations" and the preflight-only guardrail, including the explicit exclusion of guaranteed ASP/authority acceptance.

## Claims requiring technical verification

These claims should be treated as review points rather than accepted solely because they appear in UI copy:

- **Privacy / zero storage:** the free and batch routes validate request content in process and do not write it to the application's database or Redis rate-limit store; the explicit application logs inspected do not include request bodies. Railway, reverse-proxy, and observability retention settings are outside this repository, so absolute zero-storage wording was removed.
- **No signup:** the homepage validator calls the unauthenticated `/api/tools/validate` route. Reconfirm this behavior in production after deployment.
- **Rate limits:** the UI reads the returned `rateLimit.limit` and `rateLimit.remaining` values for successful validations, while the server limit is configurable. Confirm the production environment value and 429 response behavior; this PR deliberately does not alter the outstanding rate-limit correctness work.
- **Supported formats:** the browser accepts `.xml`, `.json`, and `.txt` files and the validator accepts canonical project JSON or UBL 2.1/PINT-AE XML text. Product copy now explicitly distinguishes canonical JSON from PINT-AE XML; it does not claim an official PINT-AE JSON format.
- **256 KB maximum:** both the browser client and free-tool route enforce the current 256 KB limit. Reconfirm the deployed route uses the same constant after deployment.
- **Same engine and error format:** repository tests compare the web and API rule trees and currently pass. This should be rechecked whenever rule files change because the two application trees can drift.
- **Automated checks before submission / at scale:** the API positioning matches the intended product workflow, but capacity, plan quotas, supported integration behavior, and operational readiness must be verified against the deployed API and current documentation.
- **Pass/rejection language:** a clean preflight result only means no blocking issue was found by the checks currently included. It does not prove complete XSD/Schematron conformity or guarantee acceptance by an ASP or authority.

## Merge boundary

Do not merge this PR until the full diff, wording, screenshots, CI results, links, and the technical claims above have been reviewed. This handoff records evidence; it does not authorize merge.
