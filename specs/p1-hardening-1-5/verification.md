# Verification

Task: `p1-hardening-1-5`

Status: **VERIFIED locally** on branch `rpi/p1-hardening-1-5`. Code tree verified at `b1de132`; base `f1c420b`. No push, deployment, migration, production-data access, or live production claim.

## Integration

- Initial Lane A: `fea42b7`, `0779a1d`; merged as `2edb7c1`.
- Initial Lane B: `20e6e61`, `dd00161`, `d0ab7bb`; merged as `25cd6de`.
- Approved repair amendment: `78bf7dd` (spec `e55e22cf…`, plan `6b7bac2d…`).
- Web repair integrated as `e333374`.
- API repairs integrated as `db50434`, `eafc32e`, `b1de132`.

## Fresh merged-tree evidence

| Command | Exit | Result |
|---|---:|---|
| `cd app/api && npm test -- --run` | 0 | 19 files, 166 tests passed |
| `cd app/web && npm test -- --run` | 0 | 22 files, 153 tests passed |
| `cd app/web && npm run build` | 0 | Next.js production build completed |
| `git diff --check f1c420b..HEAD` | 0 | clean |
| `python .hermes/gates/rpi.py verify-approval p1-hardening-1-5` | 0 | approval hashes match amended spec and plan |
| `python .hermes/gates/secret-scan.py` | 0 | SECRET SCAN PASSED |
| `python .hermes/gates/verify-scope.py --allow .hermes/work/p1-hardening-1-5/allow-scope.txt --base f1c420b` | 0 | SCOPE PASSED: 39 changed paths |
| `python .hermes/gates/verify-completion.py p1-hardening-1-5` | 0 | COMPLETION VERIFICATION PASSED in `VERIFIED` state |

Independent DeepSeek V4 Flash adversarial review reran the API/web suites, web build, diff, approval, secret, and scope gates; directly probed E/O/Z summary XML through the full validator; and returned **SHIP** with no Critical or Important code findings. Full report: `.hermes/work/p1-hardening-1-5/final-review.md`.

## Acceptance coverage

- **A-001–A-003 / R1:** generator conformance tests prove standard `380`, summary `480`, and credit-note `381` pass the complete validation pipeline; failing generated output is rejected.
- **A-004–A-005 / R2:** canonical and XML paths reject non-zero AE seller tax and preserve legitimate zero-tax/notional-rate AE.
- **A-006–A-008, A-014–A-016 / R3:** atomic token reservations enforce the UTC month quota, fail closed on missing/malformed plan metadata, release exact reservations on internal failures, and do not bill converter `ERROR`.
- **A-009–A-010, A-017, A-021 / R4:** batch reservation is one conditional Lua operation, meters each accepted invoice, rejects whole-batch shortfalls, creates no key for zero units, and enforces 2–50 server-side.
- **A-011–A-012, A-019–A-020 / R5:** `/usage` has an independent limiter bucket, preserves lifetime `allTime`, exposes current-month usage, and bounds outcome/recent work to the UTC month; the web dashboard uses the UTC month for quota while retaining its 30-day graph.
- **A-018 / R6:** summary UI and API both use exactly `E/O/Z`; standard and credit-note behavior remains `S`.
- **A-013, A-022:** merged-tree suites, build, approval, diff, secret, scope, completion, and independent-review gates close the task.

## Operational and security checks

- Monthly quota Redis keys contain opaque UUID reservation tokens only and expire at the exact UTC month boundary; tests assert no invoice payload is stored.
- Quota exhaustion returns `429 quota_exceeded`; missing/malformed authoritative plan data returns safe `503 quota_store_unavailable`; batch shortfall returns the existing free-tool 429 shape.
- No dependency or manifest change, secret, payload logging, deployment, or migration.

## Explicit limitations

- True multi-process Redis concurrency is justified by native Redis `EVAL` atomicity; ioredis-mock serializes calls.
- Production Redis `EVAL`, production volume, and authenticated/live production behavior were not tested because deployment and production access were not authorized.
- Manually minted API keys must publish `plan:limits:<keyId>` before billable use; otherwise the intended fail-closed response is 503.
