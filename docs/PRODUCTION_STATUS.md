# EINVOICECHECK — Production Status Report

> Generated: August 2026  
> Repo: `motivatedc-creator/https-einvoicecheck.ae`  
> Railway Project: `1fb98838-2449-4322-bbd9-40381dd48e3c`  
> Environment: `889e02e6-702f-40d3-aa7c-ff72b544c159`

---

## 1. Architecture Overview

```
einvoicecheck.ae ──ALIAS──► spzk30hh.up.railway.app ──► WEB (Next.js 15)
                                                             │
                                                             ├──► MongoDB (users, keys, usage)
                                                             │
api.einvoicecheck.ae ──CNAME──► sfm2368q.up.railway.app ──► API (Fastify 5)
                                                             │
                                                             ├──► MongoDB (same collections)
                                                             └──► Redis (rate limits)
```

### Services

| Service | Role | Framework | Port | Public URL | Health |
|---------|------|-----------|------|------------|--------|
| **WEB** | Frontend (marketing + dashboard) | Next.js 15 / React 19 | 8080 | `einvoicecheck.ae` | ✅ 200 |
| **API** | E-invoice validation engine | Fastify 5 | 3000 | `api.einvoicecheck.ae` | ✅ 200 (mongo+redis up) |
| **MongoDB** | Database (users, keys, usage) | MongoDB | — | Private | ✅ Connected |
| **Redis** | Cache + rate limiting | Redis | — | Private | ✅ Connected |

---

## 2. Deployed Config

| Env Var | Service | Value | Status |
|---------|---------|-------|--------|
| `AUTH_SECRET` | WEB | (64 hex chars) | ✅ Set |
| `AUTH_SECRET` | API | (64 hex chars) | ✅ Set |
| `RATE_LIMIT_REQUIRE_REDIS` | API | `true` | ✅ Set (fail-closed) |
| `TOOL_RATE_LIMIT_REQUIRE_REDIS` | WEB | `true` | ✅ Set (fail-closed) |
| `MONGODB_URL` | Both | (Railway injected) | ✅ Active |
| `REDIS_URL` | Both | (Railway injected) | ✅ Active |

### DNS Records (AeServer)

| Type | Host | Target | Status |
|------|------|--------|--------|
| ALIAS | `@` | `spzk30hh.up.railway.app` | ✅ Resolving |
| CNAME | `api` | `sfm2368q.up.railway.app` | ✅ Resolving |
| TXT | `_railway-verify` | `"railway-verify=..."` | ✅ Present |

---

## 3. Dependency Audit

| Metric | WEB | API |
|--------|-----|-----|
| Total deps (incl. transitive) | 250 | 289 |
| Direct deps | 8 prod / 11 dev | 6 prod / 4 dev |
| Offline vulnerabilities | **0** | **0** |
| License contamination | None (all MIT/Apache 2.0) | None (all MIT/Apache 2.0) |

### Post-Audit Actions Completed

| Action | Service | Commit | Status |
|--------|---------|--------|--------|
| Mongoose 8.9.5 → 9.7.4 | API | `907373e` | ✅ 19/19 tests pass |
| `fast-xml-parser` 4.5.1 → 5.10.1 | API + WEB | `907373e` | ✅ Both services |
| `mongoose.set('strictQuery')` removed | API | `907373e` | ✅ Deprecated code cleaned |
| `RATE_LIMIT_REQUIRE_REDIS=true` | API Railway | env var | ✅ Fail-closed rate limiting |
| `"license": "UNLICENSED"` | WEB package.json | `907373e` | ✅ Consistent with API |

---

## 4. Validation Rule Engine — Gap Analysis

### Coverage vs PINT AE v1.0.1

```
Spec source: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/businessrule/
```

| Rule ID | Your Check | PINT AE Ref | Status |
|---------|-----------|-------------|--------|
| Invoice type presence | `invoiceType.js` — `ENG-TYPE-01` | IBR-004 (BT-3) | ✅ |
| Invoice type code list | `invoiceType.js` — membersip in UNCL1001 | IBR-CL-04 | ✅ |
| Invoice number present | `requiredFields.js` — `ENG-REQ-01` | IBR-002 (BT-1) | ✅ |
| Issue date present | `requiredFields.js` — `ENG-REQ-02` | IBR-003 (BT-2) | ✅ |
| Seller name present | `requiredFields.js` — `ENG-REQ-03` | IBR-006 (BT-27) | ✅ |
| Buyer name present | `requiredFields.js` — `ENG-REQ-04` | IBR-007 (BT-44) | ✅ |
| At least one line | `requiredFields.js` — `ENG-REQ-05` | IBR-016 (BG-25) | ✅ |
| At least one tax subtotal | `requiredFields.js` — `ENG-REQ-06` | IBR-SR-58 (BG-23) | ✅ |
| Sum of line nets present | `requiredFields.js` — `ENG-REQ-07` | IBR-012 (BT-106) | ✅ |
| Totals present (5 fields) | `requiredFields.js` — `ENG-REQ-08..11` | IBR-013..015 | ✅ |
| Seller TRN 15 digits | `trn.js` — `ENG-TRN-01/02` | IBR-006 (BT-31) | ✅ |
| Buyer TRN 15 digits | `trn.js` — `ENG-TRN-03/04` | IBR-007 (BT-48) | ✅ (warning when absent) |
| Currency code ISO 4217 | `currency.js` — `ENG-CUR-01/02` | IBR-005 / IBR-CL-04 | ✅ |
| AED tax accounting | `currency.js` — `ENG-CUR-03/04` | IBR-053 / IBR-077 | ✅ |
| VAT category code list | `vatCategory.js` — `ENG-VAT-01/02` | IBR-SR-58 (BT-151) | ✅ |
| VAT rate consistency | `vatCategory.js` — `ENG-VAT-03/04` | BR-S / BR-Z / BR-E | ✅ |
| Line net = qty × price | `lineArithmetic.js` — `ENG-LINE-01..05` | IBR-CO-04 (BT-131) | ✅ |
| Tax = taxable × rate/100 | `taxBreakdown.js` — `ENG-TAX-09` | BR-S-09 (BT-117) | ✅ |
| Net by category reconciliation | `taxBreakdown.js` — `ENG-TAX-08` | BR-S-08 | ✅ (warn with doc adjustments) |
| IBR-CO-10 line sum | `documentTotals.js` — `ENG-TOT-10` | IBR-CO-10 | ✅ |
| IBR-CO-13 tax-exclusive | `documentTotals.js` — `ENG-TOT-13` | IBR-CO-13 | ✅ |
| IBR-CO-14 tax sum | `documentTotals.js` — `ENG-TOT-14` | IBR-CO-14 | ✅ |
| IBR-CO-15 tax-inclusive | `documentTotals.js` — `ENG-TOT-15` | IBR-CO-15 | ✅ |
| IBR-CO-16 payable | `documentTotals.js` — `ENG-TOT-16` | IBR-CO-16 | ✅ |
| IBR-CO-17 allowance/charge total | (covered by CO-13) | IBR-CO-17 | ✅ (redundant) |
| IBR-CO-11 prepaid ≤ payable | `schematron.js` — `ENG-SCH-01/IBR-CO-11` | IBR-CO-11 | ✅ |
| IBR-073 date format YYYY-MM-DD | `schematron.js` — `ENG-SCH-01/IBR-073` | IBR-073 | ✅ |

### Fault Injection Findings (Adversarial Review)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Arithmetic bypass via non-numeric totals | 🔴 High | ✅ Fixed — `ENG-NUM-01` numeric guard (`9e2b3ef`) |
| 2 | `/usage` endpoint has no rate limit | 🟡 Medium | Open — DOS via any valid key |
| 3 | Expensive XML parsing before structural rejection | 🟡 Medium | Open — CPU waste on garbage documents |
| 4 | `UsageEvent` collection grows unbounded | 🟡 Medium | Open — no TTL index on timestamp |
| 5 | VAT rate uses strict equality for floats | 🟡 Low | Open — false positives on FP noise |
| 6 | Rate limiter TOCTOU race | 🟢 Low | Open — sub-millisecond window |
| 7 | API key extraction ambiguity | 🟢 Low | Open — edge case |
| 8 | Parse-error messages leak internals | 🔴 High | ✅ Fixed — crash detail logged server-side only (`9e2b3ef`) |

---

## 5. Security Posture

| Concern | Implementation | Status |
|---------|---------------|--------|
| Password storage | scrypt + 16-byte salt + 64-byte hash | ✅ |
| Session tokens | HMAC-SHA256 signed, HttpOnly, SameSite=Lax | ✅ |
| API keys | SHA-256 hashed in DB, shown once at creation | ✅ |
| Rate limiting (per-minute) | Redis sorted set sliding window, fail-closed | ✅ |
| Rate limiting (per-month) | ❌ Not implemented | 🔴 Overage not rejected |
| Redis outage fallback | 503 when `RATE_LIMIT_REQUIRE_REDIS=true` | ✅ |
| XML bomb protection | `processEntities: false` (fast-xml-parser default) | ✅ |
| CORS | No `@fastify/cors` (appropriate for API) | ✅ |
| PayPal webhook verification | POST to PayPal verify API, idempotent dedup | ✅ |

---

## 6. Known Duplications (Tech Debt)

| Concern | Files | Impact | Recommendation |
|---------|-------|--------|---------------|
| Pricing plans | `api/config/plans.js` ↔ `web/lib/plans.ts` | Drift = inconsistent rate limits | Cron watchdog to detect divergence; shared package when actively iterated |
| Rule engine (8 files) | `api/src/rules/` ↔ `web/src/lib/rules/` | Rule mismatch = different results per service | Extract `@einvoicecheck/rules` npm package when rules change more than 1x/quarter |
| Mongoose models | `web/lib/models.ts` (TS) ↛ `api/src/models/` (JS) | Schema mismatch on same collections | Aligned in `907373e` (both Mongoose 9.x) |

---

## 7. Open Action Items — Prioritized

### P0 — Before Next Release

- [x] **IBR-073**: Add date format validation (`YYYY-MM-DD`) to the Schematron layer — `ENG-SCH-01/IBR-073` in `app/api/src/rules/schematron.js`
- [x] **IBR-CO-11**: Add prepaid ≤ payable check to the Schematron layer — `ENG-SCH-01/IBR-CO-11` in `app/api/src/rules/schematron.js`
- [ ] **Full official XSD + Schematron runner**: vendor the PINT AE ruleset + pick a runner (Java subprocess / WASM / Node) — `TODO(pint-ae-xsd)` in `app/api/src/rules/xml.js`; `schematron.js` is the adapter point
- [x] **Fault #1**: Guard against non-numeric total fields causing silent arithmetic bypass — `ENG-NUM-01` numeric guard added (`9e2b3ef`)
- [x] **Fault #8**: Sanitize parse-error messages to not leak internal details — crash detail logged server-side only (`9e2b3ef`)
- [x] **API models missing from repo**: Restored `app/api/src/models/ApiKey.js` and `UsageEvent.js` (`4291e8c`). Safe-registration pattern (`mongoose.models.X ||`) prevents test-environment re-compile errors. 19/19 tests green, all 6 suites pass.

### P1 — This Quarter

- [ ] **Fault #3**: Gate XML parsing behind a fast structural check (root element = `<Invoice>` or `<CreditNote>`)
- [ ] **Fault #4**: Add TTL index on `UsageEvent.timestamp` (expire after 90 days)
- [ ] **Monthly quota enforcement**: Check `UsageEvent.count` against `plan.monthlyQuota` at validate time
- [ ] **Fault #2**: Add rate limiting to `/usage` endpoint

### P2 — Tech Debt

- [ ] **BT-1 length check**: Invoice number max 16 characters
- [ ] **Fault #5**: Use `moneyEq()` tolerance for VAT rate comparison instead of `!==`
- [ ] **Schema**: Declare `"license"` in WEB `package.json` (done in `907373e`)
- [ ] **Non-root user in API Dockerfile**: Match WEB's `USER nextjs` pattern

---

*This report is a living document — update it as the codebase evolves.*
