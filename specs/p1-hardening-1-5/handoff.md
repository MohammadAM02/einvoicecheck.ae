# Handoff

Task: `p1-hardening-1-5` — EInvoiceCheck P1 hardening (R1-R5)
Branch: `rpi/p1-hardening-1-5` (supervisor integration branch, worktree)
Base: `f1c420b` (approved plan)

## Delivered changes

Lane A (validation, commits `fea42b7`, `0779a1d`):
- Generator now emits PINT-AE Billing `380` (standard) / `480` (summary) and the generated XML must pass the complete `validateXmlDocument()` pipeline (fail-closed).
- Canonical validation rejects non-zero seller tax for category `AE`; zero-tax notional-rate AE cases remain valid.

Lane B (metering, commits `20e6e61`, `dd00161`, `d0ab7bb`):
- Atomic UTC-calendar-month quota enforced on /v1/validate (all variants), /v1/convert, /v1/generate via one shared Redis reservation/finalization path; per-minute limiter intact; fail-closed behavior retained; internal errors release the reservation.
- Batch free-tool endpoint reserves one unit per accepted invoice atomically before processing; whole batch rejected on shortfall; malformed/oversized batches consume nothing.
- GET /usage is rate-limited (10/min per key) and its summary is bounded to the current UTC month; legacy response shape preserved.

## Evidence

- Lane reports: `.hermes/work/p1-hardening-1-5/lane-a-report.md`, `lane-b-report.md` (RED/GREEN command output inside).
- Merged-tree verification: `specs/p1-hardening-1-5/verification.md` — API 159/159, web 144/144, build clean, diff-check clean, secret scan PASSED.
- Acceptance coverage A-001..A-013 mapped in verification.md.

## Limitations / deferred

- No deployment or live verification (not authorized). Production Redis/Mongo capacity unknown.
- Lane B scope deviation disclosed: `app/web/src/lib/redis.ts` (+2 type lines, `incrby`/`decrby`) — required by the mandated multi-unit reservation; outside plan's allowed list. Awaiting reviewer/approver ruling (see verification.md).

## Rollback

Git-only, per lane: revert `fea42b7`+`0779a1d` (Lane A) or `20e6e61`+`dd00161`+`d0ab7bb` (Lane B) independently. No migration or deployment involved.

## Reusable lessons

- Fastify hooks cannot be added after `app.ready()` — register the auto-release hook during route registration, not per request.
- A test mock of a synchronous engine must stay synchronous; an `async` mock silently returns a Promise and the failure path never runs.
- `vi.stubEnv` for import-time env values requires `vi.resetModules()` plus a fresh import, or the first test sees the stale module.
