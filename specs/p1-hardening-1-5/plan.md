# Plan

Task: `p1-hardening-1-5`

## Architecture

Use one project-bound Kanban supervision card. Its DeepSeek V4 Flash supervisor creates two isolated child git worktrees and delegates two lanes in parallel: validation (Tasks 1-2) and metering (Tasks 3-5). Each lane follows strict TDD and produces commits plus a report. The supervisor independently reviews both diffs, integrates them into its worktree, resolves conflicts minimally, runs merged-tree verification, writes RPI verification/handoff artifacts, and requests review. No push or deployment.

## Allowed scope

- `app/api/src/rules/generate/**`
- `app/api/src/rules/checks/**`
- `app/api/src/rules/xml-validation.js`
- `app/api/src/plugins/security.js`
- `app/api/src/routes/{validate,convert,generate,usage}.js`
- `app/api/src/config/plans.js`
- `app/api/src/models/UsageEvent.js` only if needed for atomic quota semantics
- `app/api/test/**`
- `app/web/src/app/api/tools/validate/batch/route.ts`
- `app/web/src/components/BatchValidator.tsx` only for response-contract alignment
- `app/web/src/components/GeneratorWorkspace.tsx` only to align summary `480` categories with the API
- `app/web/src/lib/redis.ts` only for the native Redis primitive required by atomic batch reservation
- `app/web/src/lib/{toolRateLimit,usage,plans}.ts`
- `app/web/test/**`
- `specs/p1-hardening-1-5/**`
- `.hermes/work/p1-hardening-1-5/**`
- `.hermes/critic-loop.md` only to record repository evidence without claiming deployment/live verification

## Forbidden scope

- Legal/contact/operator content.
- Pricing/API documentation contract changes.
- Placeholder tool routes/indexing.
- PayPal billing/webhook implementation.
- Secrets, `.env`, OAuth files, Railway configuration.
- Dependency additions without a recorded blocker proving existing facilities are insufficient.
- Push, deploy, production migration, or production-data access.

## Lane A — Validation

### Task 1: generator conformance

- Add failing tests proving standard and summary generated XML fail the full pipeline today.
- Change only the template/profile mapping and the smallest generation gate needed.
- Verify standard `380`, summary `480`, and existing credit-note behavior.

### Task 2: AE reverse charge

- Add failing canonical and XML tests for non-zero AE seller tax.
- Add the invariant once in the shared rule path used by all relevant callers.
- Preserve valid zero-tax/notional-rate AE cases.

## Lane B — Metering

### Task 3: monthly quota

- Add failing boundary and concurrency tests.
- Reuse Redis and existing plan-limit publication.
- Implement one shared reservation/finalization path for validation, conversion, and generation.
- UTC calendar month; no PayPal dependency.

### Task 4: batch accounting

- Add failing tests for per-invoice reservation and all-or-nothing rejection.
- Reuse the existing Redis-backed free-tool limiter; extend it minimally for atomic multi-unit reservation.
- Keep processing sequential or bounded by a small existing mechanism; no unbounded parallelism.

### Task 5: `/usage`

- Add failing repeated-request and bounded-summary tests.
- Apply an existing limiter rather than creating a second framework.
- Bound quota summary to the current UTC month and remove the unbounded hot-path aggregate where response compatibility permits.

## Repair wave after adversarial review

Execute one focused DeepSeek V4 Flash fix lane from integrated commit `4f340dc`, then a fresh independent re-review.

### Repair 1: fail-closed, atomic monthly quota

- RED: missing-plan, malformed-plan, reserve/expiry partial-failure, exact idempotent release, and converter `ERROR` tests.
- Replace split reserve/check/expiry with one native Redis Lua operation using a unique opaque reservation token; no invoice data enters Redis.
- Missing/malformed plan metadata returns a safe 503 rather than unlimited access. Redis transport failure follows the existing production fail-closed policy.
- Release removes only the exact reservation and is idempotent. Converter internal `ERROR` results do not finalize.

### Repair 2: atomic batch reservation and HTTP minimum

- RED: deterministic 19/20 race test proving a two-unit rejection cannot reject the concurrent one-unit request; one-invoice server request test.
- Replace `INCRBY` + `DECRBY` rollback with one conditional Lua check/increment/expiry operation.
- Return immediately for zero accepted units without creating a Redis key; enforce 2–50 at the server boundary.

### Repair 3: generator UI contract

- RED: summary form test expects exactly `E/O/Z` and verifies the submitted payload.
- Change only the summary options/rates in `GeneratorWorkspace.tsx`; standard and credit-note options remain unchanged.

### Repair 4: usage compatibility and limiter isolation

- RED: paid requests cannot consume the `/usage` bucket; historical event remains in `allTime`; quota used/remaining uses current UTC month in API and web summaries.
- Add a namespace parameter to the existing limiter and use a dedicated usage key.
- Preserve exact lifetime `allTime`; add/use explicit current-month data for quota calculations. Keep only the existing indexed lifetime count needed for compatibility.

### Repair verification

- Run focused RED/GREEN tests per repair, then the full API suite, full web suite, web build, diff check, secret scan, updated scope gate, completion gate, and a fresh independent review.
- No deployment, push, migration, production-data access, or dependency addition.

## Delegation protocol

- Supervisor model/provider: `deepseek-v4-flash` / `deepseek`.
- Every `delegate_task` child inherits that model/provider and is instructed to load Ponytail full and the listed RPI/Superpowers skills.
- Child lanes may work concurrently only in isolated git worktrees.
- Children do not push, deploy, or modify the supervising worktree.
- Each child reports: commits, changed files, RED/GREEN commands and outputs, concerns, and scope deviations.
- Supervisor verifies actual Git commits/diffs; child claims alone are not accepted.

## Verification

After integration, run once at the end:

1. `cd app/api && npm test -- --run`
2. `cd app/web && npm test -- --run`
3. `cd app/web && npm run build`
4. `git diff --check <base>..HEAD`
5. `python .hermes/gates/secret-scan.py`
6. `python .hermes/gates/verify-scope.py --allow <allowed-path-file> --base <base>`
7. `python .hermes/gates/verify-completion.py p1-hardening-1-5`

## Operational checks

- Inspect generated XML through the actual complete validator.
- Inspect quota Redis keys to ensure they contain counters/period metadata only, never payloads.
- Confirm error contracts for quota exhaustion, Redis outage, and batch rejection.

## Rollback

- Revert lane commits independently if either validation or metering regresses.
- No migration or deployment occurs, so rollback is Git-only.

## Risks and mitigations

- Shared API files may collide: isolate lanes, integrate after commits, and keep shared-path edits minimal.
- Atomic quota behavior may be subtle: require concurrency tests and reviewer inspection.
- Generator profile semantics may be disputed: current reviewed PINT-AE Billing codes `380`/`480` are binding for this task.
- DeepSeek V4 Flash may stall on integration judgment: supervisor blocks the card with evidence rather than guessing or changing model.
