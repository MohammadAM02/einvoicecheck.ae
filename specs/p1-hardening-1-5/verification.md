# Verification

Task: `p1-hardening-1-5`

> **SUPERSEDED / BLOCKED:** The evidence below is accurate for commit `4f340dc`, but an independent adversarial review found one Critical, seven Important, and one Minor blocker. It is not release evidence. Acceptance A-014–A-022 and the repair wave in `plan.md` must pass before this document is replaced with final verification.

Merged-tree verification on `rpi/p1-hardening-1-5` (supervisor worktree) after integrating
Lane A (validation Tasks 1-2) and Lane B (metering Tasks 3-5). Base: `f1c420b`.

## Integration

- Lane A commits: `fea42b7` (generator conformance 380/480 + fail-closed gate), `0779a1d` (AE reverse-charge zero seller tax)
- Lane B commits: `20e6e61` (atomic UTC-monthly quota), `dd00161` (batch per-invoice reservation), `d0ab7bb` (/usage protection)
- Merges: `git merge --no-ff rpi/p1-hardening-1-5-lane-a` and `--no-ff rpi/p1-hardening-1-5-lane-b` — both clean, no conflicts.

## Commands and results (fresh, merged tree)

| Command | Exit | Result |
|---|---|---|
| `cd app/api && npm test -- --run` | 0 | 19 files, 159 tests passed |
| `cd app/web && npm test -- --run` | 0 | 21 files, 144 tests passed |
| `cd app/web && npm run build` | 0 | Next.js production build completed |
| `git diff --check f1c420b..HEAD` | 0 | clean |
| `python .hermes/gates/secret-scan.py` | 0 | SECRET SCAN PASSED |
| `python .hermes/gates/verify-scope.py --allow .hermes/work/p1-hardening-1-5/allow-scope.txt --base f1c420b` | 1 | SCOPE FAILED — one path: `app/web/src/lib/redis.ts` |

## Scope deviation (disclosed, awaiting reviewer ruling)

`app/web/src/lib/redis.ts` (+2 lines, type-only) is outside the plan's allowed list. Lane B's
task-mandated atomic multi-unit reservation (`reserveToolRateLimit` in
`app/web/src/lib/toolRateLimit.ts`, an allowed file) requires `incrby`/`decrby` on the shared
`MinimalRedis` client type; TypeScript rejects the reservation code otherwise (TS2551/TS2339),
and the production build fails without it. The change adds no behavior and no dependency; the
only alternative is a type cast inside the allowed file, which is strictly worse. Revertible
independently. Requesting explicit reviewer/approver ruling; the deviation is recorded in both
lane-b-report.md and this file.

## Acceptance coverage

- A-001/A-002/A-003 (generator conformance): covered by Lane A tests (generate-conformance.test.js, generate.test.js, xml-validation.test.js) — merged API suite green.
- A-004/A-005 (AE reverse charge): covered by Lane A tests — merged API suite green.
- A-006/A-007/A-008 (monthly quota): quota.test.js — 6 tests, green.
- A-009/A-010 (batch accounting): batch-quota.test.ts + tools-validate.test.ts — green.
- A-011/A-012 (/usage protection): usage-protection.test.js + usage.test.js — green.
- A-013 (integrated verification): this table.
- Failure/security scenarios: Redis fail-closed retained (rate limiter + quota mirror `requireRedis`); no invoice payload in Redis/Mongo/logs (asserted by quota.test.js counter-only check); invalid auth unchanged; oversized/malformed batches consume nothing.

## Operational checks (local only; no deployment)

- Quota Redis keys inspected in tests: `q:month:<keyId>:<YYYY-MM>` counters only, TTL to UTC month end.
- Error contracts: quota exhaustion `429 {error:'quota_exceeded', ...}`; Redis-outage `503 quota_store_unavailable` when `RATE_LIMIT_REQUIRE_REDIS=true`; batch shortfall `429` free-tool shape.
- No push, no deploy, no migration, no production-data access performed.
