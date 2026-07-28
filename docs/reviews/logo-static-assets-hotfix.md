# Logo static-assets hotfix

## Problem

The production Docker image copied only `public/templates` into the Next.js standalone runner. The navigation logo lives under `public/brand`, so the deployed server returned a missing asset even though the SVG existed in the repository and the build passed.

## Fix

Copy the complete `public` directory into the production image:

```dockerfile
COPY --from=builder /app/public ./public
```

This preserves templates and includes current and future public assets such as brand SVGs.

## Scope

No application, validation, API, authentication, billing, rate-limit, or UI behavior changes.

## Verification required

- Railway Docker build passes.
- `/brand/einvoicecheck-lockup.svg` returns HTTP 200.
- Navigation logo renders on desktop and mobile.
- Existing template downloads continue to work.
