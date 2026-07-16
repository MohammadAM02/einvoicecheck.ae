# GR1 build report - real output

Machine: Windows 11, Node 20+, `app/web`. Run on 2026-07-14. No deploy, no live infra:
Mongo is `mongodb-memory-server`, Redis is `ioredis-mock`, Dodo Payments is mocked (as the rest
of the repo already does). **The tool itself needs no external API** - the rule engine runs
inside the Next.js route handler.

## 1. Tests - `npm test` (vitest run) in `app/web`

```
> einvoicecheck-web@1.0.0 test
> vitest run

 RUN  v4.1.10 F:/Administrator/Downloads/Proven-Demand API Sprint/app/web

 ✓ test/tools-validate.test.ts (9 tests) 151ms
 ✓ test/auth-keys.test.ts (7 tests) 5111ms
     ✓ creates the account, mints one key, and returns the raw key exactly once  644ms
     ✓ logs in with the right password and refuses the wrong one  325ms
 ✓ test/webhooks.test.ts (14 tests) 5847ms
     ✓ accepts a correctly signed payload  693ms
 ✓ test/billing.test.ts (12 tests) 5824ms
     ✓ defaults to test_mode when DODO_PAYMENTS_ENVIRONMENT is unset  615ms

 Test Files  4 passed (4)
      Tests  42 passed (42)
   Start at  23:05:34
   Duration  10.82s (transform 1.99s, setup 332ms, import 14.16s, tests 16.93s, environment 1ms)
```

**42/42 passing.** 33 were already green before GR1 (E2's auth/keys/billing/webhooks); GR1 adds
the 9 in `test/tools-validate.test.ts`:

1. the vendored engine is byte-identical to `app/api/src/rules` (SHA-256 per file - drift guard)
2. accepts a valid canonical JSON invoice with no errors
3. returns normalized field-level errors (`path`/`rule`/`severity`/`message`) for a broken invoice
4. accepts UBL / PINT AE XML and matches direct engine output exactly
5. reports a parse error (`ENG-PARSE-01`) instead of fabricating a result
6. rejects an empty document (400)
7. 429s after the hourly IP limit and leaves other IPs alone
8. fails open with `degraded: true` when Redis is unavailable
9. returns 503 (never unlimited) when `TOOL_RATE_LIMIT_REQUIRE_REDIS=true` and Redis is down

## 2. Build - `npm run build` in `app/web`

```
> einvoicecheck-web@1.0.0 build
> next build

   ▲ Next.js 15.5.20

   Creating an optimized production build ...
 ✓ Compiled successfully in 6.5s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/24) ...
 ✓ Generating static pages (24/24)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      182 B         106 kB
├ ○ /_not-found                            163 B         103 kB
├ ● /alternatives/[slug]                   182 B         106 kB
├ ƒ /api/auth/login                        163 B         103 kB
├ ƒ /api/auth/logout                       163 B         103 kB
├ ƒ /api/auth/signup                       163 B         103 kB
├ ƒ /api/billing/cancel                    163 B         103 kB
├ ƒ /api/billing/change-plan               163 B         103 kB
├ ƒ /api/billing/checkout                  163 B         103 kB
├ ƒ /api/billing/portal                    163 B         103 kB
├ ƒ /api/billing/recover                   163 B         103 kB
├ ƒ /api/keys                              163 B         103 kB
├ ƒ /api/keys/[id]                         163 B         103 kB
├ ƒ /api/tools/validate                    163 B         103 kB      <-- GR1
├ ƒ /api/usage                             163 B         103 kB
├ ƒ /api/waitlist                          163 B         103 kB
├ ƒ /api/webhooks/dodo                     163 B         103 kB
├ ○ /blog                                  165 B         106 kB
├ ○ /contact                               182 B         106 kB
├ ƒ /dashboard                            3.3 kB         106 kB
├ ○ /docs                                  182 B         106 kB
├ ○ /legal/privacy                         182 B         106 kB
├ ○ /legal/refunds                         182 B         106 kB
├ ○ /legal/terms                           182 B         106 kB
├ ○ /login                               1.17 kB         107 kB
├ ○ /pricing                               182 B         106 kB
├ ○ /robots.txt                            163 B         103 kB
├ ○ /signup                              1.18 kB         107 kB
├ ○ /sitemap.xml                           163 B         103 kB
├ ● /tools/[slug]                        2.96 kB         109 kB      <-- GR1 (was 182 B)
├   ├ /tools/uae-e-invoice-validator
├   ├ /tools/pint-ae-validator
├   └ /tools/trn-format-checker
├ ● /vs/[slug]                             182 B         106 kB
└ ○ /waitlist                            1.21 kB         107 kB
+ First Load JS shared by all             102 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
```

**Exit code 0** (verified: `BUILD_EXIT=0`). Type-check passes (the build failed once on an
unused `@ts-expect-error` in `src/lib/validation.ts`; removed, rebuilt clean).

## 3. Checks

- `grep -ri stripe app/web/src app/web/test` -> **0 matches**. Billing is Dodo Payments only.
  (Pre-existing mentions elsewhere in the repo are in planning docs owned by other steps, not in
  any code GR1 touched.)
- `/tools/uae-e-invoice-validator` is prerendered and already in `sitemap.xml`.
- `app/api` was not modified: the engine is copied *out of* it, not changed.

## 4. Still PENDING on the human

- **Deploy.** Nothing is deployed. No live URL exists and none is claimed on the page or in this
  report. `NEXT_PUBLIC_API_BASE_URL` still defaults to the *planned* `https://api.einvoicecheck.ae`.
- Set `REDIS_URL` and `TOOL_RATE_LIMIT_REQUIRE_REDIS=true` in the production environment so a
  Redis outage cannot silently turn the free tool into an unlimited one.
- Set `TOOL_RATE_LIMIT_SALT` to a real secret (it defaults to a constant).
