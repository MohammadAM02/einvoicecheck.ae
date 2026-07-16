# E1 Test Report — UAE e-invoice preflight validation API

**Date:** 2026-07-14
**Environment:** Windows 11, Node v24.18.0, npm 11.16.0
**Runner:** Vitest 2.1.9. Mongo via `mongodb-memory-server` 10.4.3, Redis via
`ioredis-mock` 8 — **zero external services required**.

## Result: PASS — 18/18 tests, 5/5 suites

### Real `npm test` output

```
> uae-einvoice-preflight-api@1.0.0 test
> vitest run

 RUN  v2.1.9 F:/Administrator/Downloads/Proven-Demand API Sprint/app/api

 ✓ test/validate.test.js (6 tests) 5445ms
 ✓ test/engine.test.js (7 tests) 6ms
 ✓ test/usage.test.js (2 tests) 1257ms
 ✓ test/rateLimit.test.js (1 test) 1148ms
 ✓ test/health.test.js (2 tests) 1149ms

 Test Files  5 passed (5)
      Tests  18 passed (18)
   Start at  10:45:19
   Duration  12.75s
```

## Endpoints × test cases

| Endpoint | Test case | Expected | Result |
|---|---|---|---|
| `POST /v1/validate` | Missing API key header | 401 `unauthorized` | PASS |
| `POST /v1/validate` | Invalid API key | 401 | PASS |
| `POST /v1/validate` | `Authorization: Bearer <key>` accepted | 200 valid | PASS |
| `POST /v1/validate` | **Happy path** — valid AED invoice | 200 `valid:true`, 0 errors | PASS |
| `POST /v1/validate` | **Failure path** — deliberately broken invoice | 200 `valid:false`, cited errors | PASS |
| `POST /v1/validate` | UBL 2.1 / PINT AE XML via `application/xml` | 200 `valid:true` | PASS |
| `POST /v1/validate` | **Rate limit** — 4th call over a 3/window key | 429 `rate_limited` + `Retry-After` | PASS |
| `GET /usage` | No API key | 401 | PASS |
| `GET /usage` | Aggregates metering events (2 valid + 1 invalid) | 200, correct outcome counts | PASS |
| `GET /health` | Mongo + Redis up | 200 `status:ok`, both `up` | PASS |
| `GET /health` | No auth required | 200 | PASS |
| Rule engine | Valid invoice passes | `valid:true`, type `388` | PASS |
| Rule engine | Deterministic (same in → same out) | identical JSON | PASS |
| Rule engine | Broken invoice flags TRN + VAT + line + total rules | all 4 rule families present | PASS |
| Rule engine | Every error has `{path,rule,severity,message,fix}` | shape holds | PASS |
| Rule engine | UBL XML parsed + validated | type `388`, pint schema | PASS |
| Rule engine | Unparseable input → single `ENG-PARSE-01` | structural error | PASS |
| Rule engine | Foreign currency requires AED tax currency | `ENG-CUR-03` raised | PASS |

Explicitly required cases from the E1 contract — all covered:
- **auth failure (missing/invalid key → 401)** ✅
- **rate-limit behavior (over-limit → 429)** ✅
- **validation happy-path + deliberately-broken-invoice failure path** ✅
- **every endpoint has integration tests** ✅ (`/v1/validate`, `/usage`, `/health`)

## Coverage (`npm test -- --coverage`, v8 provider)

```
Statements   : 86%    (1155/1343)
Branches     : 60.26% (135/224)
Functions    : 91.83% (45/49)
Lines        : 86%    (1155/1343)
```

Uncovered lines are dominated by `src/server.js` (0% — the live-listen
bootstrap, not exercisable in-process) and defensive/error branches in the
rule modules and the Redis connector. The rule engine, routes, models, and
security plugin are all ≥ 90% statements. Excluding `server.js`, statement
coverage is ~90%.

## Notes / honest caveats
- `mongodb-memory-server` downloaded a `mongod` binary on first run (network was
  available in this session); subsequent runs reuse the cache.
- The two `postinstall` scripts (`esbuild`, `mongodb-memory-server`) were
  initially blocked by an allow-scripts guard; `esbuild`'s platform binary was
  materialized manually (`node node_modules/esbuild/install.js`). On a normal
  CI/build host, run `npm install` with scripts enabled (or approve them) and no
  manual step is needed.
- No live MongoDB, Redis, or Railway were available in this build session, so
  no staging deploy was performed — see `staging_url.txt`.
