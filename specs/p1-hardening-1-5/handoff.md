# Handoff

Task: `p1-hardening-1-5` — EInvoiceCheck P1 hardening

Branch: `rpi/p1-hardening-1-5`
Base: `f1c420b`
Verified code tree: `b1de132`
Release status: **locally verified; not pushed or deployed**

## Delivered

1. Generated standard `380`, summary `480`, and credit-note `381` XML passes the complete PINT-AE validation pipeline; generation fails closed on invalid output.
2. Canonical and XML validation rejects non-zero seller tax for reverse-charge category `AE` while preserving valid zero-tax/notional-rate cases.
3. API monthly quotas use an atomic Redis token reservation with exact UTC-month expiry, fail-closed plan metadata, and exact release for internal failures; converter `ERROR` is not billed.
4. Batch validation performs one atomic multi-unit reservation, meters each accepted invoice, rejects insufficient whole batches before processing, and enforces 2–50 server-side.
5. `/usage` uses an independent limiter bucket, preserves lifetime `allTime`, exposes current-month usage, and bounds current-month work; the web dashboard uses the UTC month for quota.
6. The summary generator UI is aligned with API categories `E/O/Z`.

## Evidence

- API: 19 files, **166/166** tests passed.
- Web: 22 files, **153/153** tests passed.
- Next.js production build passed.
- Approval hashes, diff check, secret scan, and 39-path scope gate passed.
- Final independent DeepSeek V4 Flash review: **SHIP**, no Critical or Important code findings.
- Detailed commands and limitations: `specs/p1-hardening-1-5/verification.md`.

## Deferred minor cleanup

- Remove the now-unreferenced shared `UsageReply#` schema when next touching `app/api/src/app.js`.
- Remove the dead generator `includes('AE')` branch when next touching generator internals.
- Web outcome counts use a 30-day window while API outcomes use the UTC month; this pre-existing display difference was outside approved scope.
- Production/live verification remains separate release work and requires explicit authorization.

## Rollback

Git-only: revert repair commits `e333374`, `db50434`, `eafc32e`, and `b1de132`, then the initial lane merges if required. No migration or deployment occurred.

## Reusable lessons

- Register Fastify release hooks before `app.ready()`.
- Redis quota release should use an opaque exact token (`SREM`), never a blind decrement.
- UI template categories need a contract test against the API template registry.
- Passing suites do not override a failed scope gate or adversarial review.
