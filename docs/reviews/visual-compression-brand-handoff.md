# Visual Compression and Brand Handoff

## Goal

Make the homepage substantially faster to scan on desktop and mobile without changing the approved ERP preflight positioning or validator behavior.

## Product direction preserved

- ERP creates the invoice.
- einvoicecheck.ae checks it before submission.
- The ASP remains responsible for legal transmission.
- The validator remains the dominant first action.

## What changed

- Added the approved document-check logo system from the existing brand artifact.
- Added the logo lockup to desktop and mobile navigation.
- Added an SVG browser icon through the Next.js app icon convention.
- Reduced hero support copy.
- Replaced the text-heavy failure section with a three-step visual process and three compact failure cards.
- Reduced the homepage example from two issues to one representative finance-readable issue.
- Replaced the free-versus-API comparison table with one concise API continuation card.
- Moved scope, limitations and privacy detail into progressive-disclosure rows.
- Reduced the FAQ to five questions and replaced card styling with divider-based accordion rows.
- Added a stronger post-hero type scale, clearer section spacing and compact mobile trust facts.

## Files changed

- `app/web/public/brand/einvoicecheck-lockup.svg`
- `app/web/public/brand/einvoicecheck-mark.svg`
- `app/web/src/app/icon.svg`
- `app/web/src/app/layout.tsx`
- `app/web/src/app/visual-compression.css`
- `app/web/src/components/Chrome.tsx`
- `app/web/src/components/FreeVsApi.tsx`
- `app/web/src/components/HomeClient.tsx`
- `app/web/src/components/ScopePanel.tsx`
- `app/web/test/homepage.test.tsx`
- `app/web/test/navigation.test.tsx`

## Deliberately unchanged

- Validation engine and rules
- API routes
- Retry and reset behavior
- Rate limits
- Authentication and billing
- Pricing
- Railway configuration
- Result component behavior
- Technical claims and guardrails

## Review requirements

- Confirm the logo remains legible in navigation at desktop and phone widths.
- Confirm the browser tab uses `app/icon.svg` instead of the generic globe.
- Review at 375, 768, 1024 and 1440 px.
- Confirm no horizontal overflow.
- Confirm process arrows and icons remain clear at every width.
- Confirm all disclosures and FAQ rows are keyboard accessible.
- Run the complete web tests and production build.
- Do not merge until Railway preview and visual review pass.
