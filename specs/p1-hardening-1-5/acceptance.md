# Acceptance Scenarios

Task: `p1-hardening-1-5`

| ID | Given | When | Then | Verification |
|---|---|---|---|---|
| A-001 | Standard generator input | XML is generated and fully validated | Type is `380`; format, structure, and semantic layers pass | Generator + XML validation tests |
| A-002 | Summary generator input | XML is generated and fully validated | Type is `480`; all layers pass | Generator + XML validation tests |
| A-003 | Existing credit-note input | XML is generated | Existing accepted behavior remains valid | Regression test |
| A-004 | Canonical AE input with non-zero seller tax | Validation runs | Result is invalid with a specific AE rule/fix | Engine and route tests |
| A-005 | Legitimate AE input with notional rate and zero seller tax | Validation runs | Result remains valid when all other rules pass | Engine + XML tests |
| A-006 | API key with one monthly unit left | Two concurrent billable requests run | At most one reserves the final unit | Concurrency-focused quota test |
| A-007 | API key at monthly quota | Validation, conversion, or generation is requested | Work is rejected before expensive processing with documented status/body | Route tests |
| A-008 | Billable operation throws an internal error | Quota reservation exists | Reservation is released/not finalized | Failure-path test |
| A-009 | Batch of N accepted invoices with N units available | Batch is submitted | Exactly N units are reserved and N results returned | Batch route test |
| A-010 | Batch needs more units than remain | Batch is submitted | Whole batch is rejected; no document is processed | Batch route test |
| A-011 | Authenticated caller repeatedly requests `/usage` | Limit is exceeded | Endpoint returns `429` | Usage route test |
| A-012 | Usage summary is requested | Query executes | Current-month quota summary is correct and no unbounded all-time aggregate is required | Usage test/query inspection |
| A-013 | Both lanes are integrated | Full verification runs | API tests, web tests, web build, secret scan, scope check, and diff check pass | Recorded commands in `verification.md` |

## Failure and security scenarios

- Redis-required production mode remains fail closed when quota/rate-limit storage is unavailable.
- No invoice body appears in logs or durable quota keys.
- Invalid authentication still returns the existing safe response.
- Oversized and malformed batch requests cannot consume partial quota.
