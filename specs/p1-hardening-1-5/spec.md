# Specification

Task: `p1-hardening-1-5`

## Requirements

### R1 — Generator full-pipeline conformance

- Standard invoice generation must use PINT-AE Billing invoice type `380`.
- Summary invoice generation must use PINT-AE Billing invoice type `480`.
- Credit-note behavior must remain compatible with the current accepted profile.
- Generation must reject or fail closed when the resulting XML does not pass the complete `validateXmlDocument()` format, structure, and semantic pipeline.
- Public response shape remains backward compatible unless a failure response must expose an existing safe error shape.

### R2 — Reverse-charge AE invariant

- Canonical validation must reject category `AE` when seller-side tax amount is non-zero where the active PINT-AE profile requires zero.
- Document tax totals must continue reconciling with tax subtotals.
- Legitimate AE notional-rate cases with zero seller tax must remain accepted.
- JSON, XML, and generated-output behavior must be covered.

### R3 — Atomic monthly quota enforcement

- Period is UTC calendar month.
- Each API key has the monthly quota defined by its active plan.
- Quota must be reserved atomically before expensive billable work.
- Concurrent requests cannot consume more than the remaining quota.
- Requests rejected before billable work do not consume quota.
- Internal/server failures release or do not finalize the reservation.
- Validation, conversion, and generation use one shared enforcement path.
- Existing per-minute enforcement remains intact.

### R4 — Batch per-invoice accounting

- Batch accepts 2-50 valid XML document strings under the existing request-size boundary.
- It reserves one free-tool unit per accepted invoice before processing.
- If sufficient units are unavailable, reject the complete batch without partial validation.
- The response reports consumption and remaining quota consistently with actual reservation.
- Processing must be bounded; do not create unbounded concurrency or add a new service.

### R5 — Usage endpoint protection

- `GET /usage` uses an existing rate-limit mechanism with a suitable low-cost policy.
- Summary work is time-bounded to the same UTC calendar-month contract where plan quota is concerned.
- Response compatibility is preserved.
- Avoid an all-time unbounded aggregation in the hot path.

## Security and reliability invariants

- Authentication, API-key ownership, secret handling, and Redis fail-closed production behavior must not weaken.
- No invoice payload is added to logs, MongoDB, or Redis.
- No new dependency unless existing platform/library features cannot satisfy the requirement.
- Error responses must not leak filesystem paths, secrets, hashes, or raw payloads.
- No push, deploy, migration, or production-data operation.

## Worker constraints

- Supervising worker and all delegated workers: provider `deepseek`, model `deepseek-v4-flash`.
- All implementation workers must load `ponytail:ponytail` (full), `hermes-rpi-gates`, `brainstorming`/spec context, `writing-plans`, `test-driven-development`, and `verification-before-completion` as applicable.
- Tests are written and observed failing before production changes.
- Validation and metering lanes use isolated child worktrees; integration occurs only after lane-level tests pass.
