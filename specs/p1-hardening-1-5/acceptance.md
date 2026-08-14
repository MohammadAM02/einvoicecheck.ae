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
| A-014 | Active-plan Redis metadata is missing or malformed | A billable request is made | Request fails closed with a safe service-unavailable response; no work or quota is consumed | Quota route tests |
| A-015 | Redis reserve/expiry operation partially fails | A quota reservation is attempted | No leaked counted reservation remains and work does not proceed | Redis failure-injection test |
| A-016 | A converter result has internal status `ERROR` | Response completes | Exact reservation is idempotently released and not billed | Convert failure-path test |
| A-017 | Concurrent batch reservations race at the boundary | A larger over-limit batch and a one-unit request compete | The one-unit request can succeed when capacity exists; counter never exceeds the limit | Deterministic Lua reservation test |
| A-018 | Summary template is selected in the web generator | Category options and payload are produced | Options/payload use `E/O/Z`; API generation succeeds | Web component + API contract test |
| A-019 | Paid-operation rate bucket is exhausted | Caller requests `/usage` | The first usage read uses its independent allowance rather than returning 429 | Usage limiter isolation test |
| A-020 | Historical and current-month events exist | `/usage` and dashboard summaries are requested | `allTime` remains lifetime; quota used/remaining use the UTC calendar month | API + web usage tests |
| A-021 | Batch contains fewer than two invoices | Server endpoint receives it | Request is rejected before quota reservation or validation | Batch boundary test |
| A-022 | Repair wave is integrated | Full verification runs | Reviewer blockers are closed and API/web/build/diff/secret/scope/completion gates pass | Recorded commands and re-review |

## Failure and security scenarios

- Redis-required production mode remains fail closed when quota/rate-limit storage is unavailable.
- No invoice body appears in logs or durable quota keys.
- Invalid authentication still returns the existing safe response.
- Oversized and malformed batch requests cannot consume partial quota.
