# UAE Compliance Desk UI Design

**Date:** 2026-07-27<br>
**Product:** einvoicecheck.ae<br>
**Status:** Approved direction; written specification awaiting final review

## Objective

Make the free validator the primary acquisition experience. A visitor should be able to upload an invoice, understand the result, and see the value of automated validation before being asked to create an account or buy API access.

The redesign must increase trust with finance users without weakening the technical credibility required by ERP vendors and integrators.

## Business decision

The homepage's primary conversion is **Validate a file free**. It requires no signup.

API signup is the secondary conversion. It appears in navigation and after a visitor receives a validation result, where the product can credibly offer automation: "Run this check on every invoice."

The free validator and paid API use the same validation engine. The interface must not imply that the free result is simplified or that the API provides additional compliance coverage.

## Product positioning

einvoicecheck.ae is an independent UAE e-invoice semantic preflight tool. It helps users find invoice data, VAT, code-list, and arithmetic issues before files reach an accredited service provider.

It is not:

- an FTA-accredited service provider;
- a filing or invoice-transmission service;
- statutory archival;
- a registration lookup service;
- a guarantee of legal compliance or ASP acceptance; or
- complete official XSD and Schematron conformity validation in its current version.

The interface will use **Preflight passed** and **Preflight failed**. It will not use the absolute phrase **Would be rejected**.

## Design direction: UAE Compliance Desk

The visual language should resemble a calm, professional finance control rather than a developer landing page or an official government portal.

### Palette and typography

- Warm white or very light grey page background.
- Deep navy for text, navigation, and high-trust surfaces.
- Restrained emerald or teal for primary actions and successful results.
- Amber for warnings and red only for blocking errors.
- Clear sans-serif typography with strong numeric and tabular legibility.
- Monospace type only for XML, JSON, paths, rule IDs, and API examples.
- Thin borders, moderate corner radii, generous whitespace, and minimal shadow.

### Explicitly remove

- Neon glows and decorative background grids.
- Octagonal or clipped buttons.
- Repeated vanity statistics.
- Generic enterprise illustrations and AI imagery.
- UAE government or FTA branding, seals, flags used as endorsements, or language that could imply official affiliation.

## Homepage hierarchy

### 1. Navigation

Desktop navigation contains:

- Validate
- API
- Pricing
- Documentation
- Sign in

The primary navigation action is **Validate free** and scrolls to or opens the free validator. **API** remains a normal navigation link; the stronger API conversion appears only after a validation result.

Mobile navigation must remain available through an accessible menu. The current behavior of hiding all navigation links below 768px is not acceptable.

### 2. Hero and validator

Use this core message:

**Headline:** Check your UAE e-invoice before it reaches your ASP.

**Supporting copy:** Upload XML or JSON and get a clear list of semantic, VAT, and arithmetic issues. Free, no signup, and invoice payloads are not stored.

The validator is part of the first viewport, not a CTA that opens signup.

Primary interaction:

- Large drag-and-drop upload area.
- Primary label: **Validate a file — free**.
- Supported formats visible before interaction: XML and JSON.
- Maximum file size visible before interaction: 256 KB.
- Privacy statement beside the control: processed in memory and not persisted.

Secondary interactions:

- **Paste XML or JSON** reveals the existing text editor.
- **Try a sample** provides one valid and one intentionally broken example without showing the full template catalogue in the hero.

The existing 20-per-hour IP limit remains. It should be disclosed unobtrusively before validation and clearly when the limit is reached.

### 3. Compact trust strip

Immediately below the validator, show four factual points:

- UAE-focused semantic preflight
- XML and JSON accepted
- Invoice payloads not stored
- Independent tool; not an accredited ASP

Do not show unsupported uptime or latency claims unless they are backed by a public status page and documented measurement window.

### 4. Who it is for

Use three short audience cards:

- **Finance teams:** Find invoice data and totals problems before handoff.
- **ERP and software vendors:** Test UAE invoice exports during development and CI.
- **Integrators and consultants:** Give clients a consistent, machine-readable repair list.

Avoid separate generic feature cards. Each audience statement should connect directly to a job the validator performs.

### 5. Example result

Show a compact, realistic failed-preflight result containing:

- Buyer TRN must contain 15 digits.
- Amount due does not reconcile with the tax-inclusive total.

This section demonstrates the finance-readable result format and proves that the product returns actionable fixes rather than a generic pass/fail badge.

### 6. Free validator versus API

Use a simple two-column comparison.

**Free validator**

- No account required.
- Manual file upload or paste.
- 20 validations per hour per IP.
- Same rule engine and error format as the API.

**Validation API**

- API key required.
- Designed for ERP exports, CI, and automated invoice flows.
- Plan-based monthly quotas and per-minute limits.
- Machine-readable results.

The API CTA is **Automate with the API**. Pricing remains accessible but the full three-card pricing table does not need to dominate the homepage.

### 7. Scope and trust

Consolidate the current repeated disclaimers into a single clear scope panel.

**Checks currently included:**

- Invoice type and required business terms.
- Supplier and buyer UAE TRN format.
- Currency and supported code-list membership.
- VAT category and rate consistency.
- Line arithmetic, tax breakdown, totals, and payable amount reconciliation.

**Not currently included:**

- Complete official XSD and Schematron conformity.
- FTA registration lookup.
- Legal transmission or filing.
- Statutory archival.
- Guaranteed acceptance by an ASP or authority.

The page should show the engine profile or rule-set version returned by the product. A calendar date must only be shown if it comes from a maintained product value rather than manually written marketing copy.

### 8. FAQ and footer

Keep the FAQ concise and focused on:

- accreditation;
- what a pass means;
- data retention;
- supported formats;
- free-tool limits; and
- the difference between the free validator and API.

The footer keeps the independent preflight disclaimer and links to privacy, terms, refunds, contact, and documentation.

## Validator result design

### Result summary

The first result surface contains:

- **Preflight passed** or **Preflight failed**.
- Number of blocking issues and warnings.
- Detected invoice type and validation profile.
- **Copy report** and **Validate another file** actions.

Avoid green language that suggests filing, legal compliance, or acceptance. A passing message should say: "No blocking issues were found by the checks currently included in this preflight engine."

### Issue rows

Each issue displays information in this order:

1. Human-readable field name, such as **Buyer TRN** or **Amount due**.
2. Plain-language problem statement.
3. Direct recommended fix.
4. Expandable **Technical details** containing severity, JSON/XML path, engine rule ID, and PINT business-term or rule reference.

Blocking issues appear before warnings. The existing machine-readable result remains unchanged; presentation logic maps technical paths to understandable labels and falls back to the path when no label exists.

### Errors and unavailable states

- Invalid or unreadable file: explain the accepted formats and let the user choose another file.
- File over 256 KB: state the limit and offer API documentation; do not claim the API accepts a larger file unless its configured limit confirms that.
- Validator timeout: retain the input and offer Retry.
- Rate limit reached: show the reset time and API option without forcing signup.
- Redis unavailable in production: preserve the current fail-closed 503 behavior and explain that the free validator is temporarily unavailable.
- Network failure: retain the input and offer Retry.

No error state may discard pasted text or force the user to reselect a file unless the browser prevents retaining it.

## Component boundaries

The implementation should preserve the current Next.js application and APIs. No new service or infrastructure is required.

Recommended UI boundaries:

- `HomepageHero`: positioning, message, and audience-neutral trust copy.
- `ValidatorWorkspace`: upload, paste, sample selection, request state, and retry behavior.
- `ValidationSummary`: pass/fail state, counts, metadata, and report actions.
- `ValidationIssueList`: sorting and rendering blocking issues and warnings.
- `ValidationIssue`: human-readable label, fix, and expandable technical details.
- `ScopePanel`: one canonical description of included and excluded coverage.
- `FreeVsApi`: provider-independent comparison and API conversion.
- `MobileNavigation`: accessible mobile menu using the existing route structure.

The homepage and dedicated validator page should share the same validator and result components. They must not maintain two independent result designs or validation request implementations.

## Data flow

1. The user drops, selects, pastes, or loads a sample invoice.
2. The browser performs only basic size and file-type checks.
3. The document is sent to the existing `POST /api/tools/validate` route.
4. The route applies the Redis-backed IP limit and calls the existing validation engine.
5. The interface renders the unchanged normalized result.
6. After a result is displayed, the interface may offer API access. Validation itself never requires authentication.

Invoice content must not be sent to analytics. Analytics may record coarse events such as upload selected, validation completed, result pass/fail, API CTA clicked, and signup completed, without paths, rule messages, invoice identifiers, or payload contents.

## Mobile behavior

- Single-column layout at phone widths.
- Minimum 44px touch targets.
- Full-width upload and validation controls.
- A visible mobile navigation menu.
- Result actions wrap without horizontal scrolling.
- Technical identifiers wrap or scroll inside their own container, not the entire page.
- The validator and result summary appear before explanatory marketing content.
- No sticky control may cover result content or system browser controls.

## Accessibility

- File input, drop zone, paste editor, disclosure controls, and mobile menu are keyboard accessible.
- Status changes use an appropriate live region without repeatedly announcing the full error list.
- Error, warning, and success states use icons and text in addition to color.
- Focus moves to the result summary after validation and to the error message when the request cannot be completed.
- Reduced-motion preferences disable nonessential transitions.

## Payments and plans

PayPal is the active checkout provider. PayPal branding appears only in checkout and account billing contexts, not as homepage decoration.

Product plans and API entitlements remain provider-independent. The redesign must not add Dodo or Lemon Squeezy references.

## Testing and acceptance criteria

### Functional

- A visitor can upload valid JSON and receive a passing result without an account.
- A visitor can upload valid XML and receive a result without an account.
- Paste and sample flows call the same route and render the same result component as upload.
- A broken invoice shows blocking issues, plain-language fixes, and expandable technical details.
- The free limit and Redis-unavailable states remain enforced.
- The API CTA never blocks free validation.

### Trust and content

- No page claims FTA accreditation, legal compliance, filing, or guaranteed acceptance.
- The product's included and excluded scope is visible without opening the FAQ.
- Zero-payload-retention language remains accurate to server and logging behavior.
- Free and API validation are described as using the same engine.
- No Dodo or Lemon Squeezy references are visible.

### Responsive and accessible

- Navigation remains usable at 320px width.
- Upload, paste, validation, results, and report-copy actions work at phone, tablet, and desktop widths.
- Primary flows are keyboard accessible.
- Automated accessibility checks find no serious or critical issues on the homepage and validator page.

### Regression and production

- Existing API and web tests continue to pass.
- New component tests cover upload, paste, pass, fail, timeout, 429, and 503 states.
- The Next.js production build succeeds.
- Railway preview or deployment health checks pass before production traffic is moved.
- Public smoke tests verify the homepage, web health, API health, JSON validation, and XML validation.

## Out of scope

- Changing validation rules or claiming complete PINT AE conformity.
- New infrastructure or a hosting move.
- Replacing MongoDB or Redis.
- Changing API authentication or entitlement architecture.
- Activating PayPal without real credentials and plan IDs.
- Arabic localization in this implementation cycle.
- Building an FTA or ASP integration.
- Reworking dashboard functionality unrelated to the validator conversion path.

## Rollout

Implement on a dedicated branch and use a preview or non-production Railway deployment for visual and functional review. Keep the current production deployment available until the redesigned version passes responsive browser checks and production-equivalent smoke tests. Merge through a pull request; Railway remains the only production host.
