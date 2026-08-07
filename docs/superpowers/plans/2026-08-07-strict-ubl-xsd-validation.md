# Strict UBL XSD Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make strict XML validation reject non-conforming UBL Invoice/CreditNote structure, expose truthful layered diagnostics, and route the free validator through the same API implementation as paid validation.

**Architecture:** Centralize native `libxmljs2` XSD validation in one API-side module that serves the validator, converter, and generator. Build a layered XML validation core that runs format, XSD structure, and existing semantic checks in the approved order. Keep v1 XML compatibility, add v2 structured output, and move canonical JSON to an explicitly labelled `/v1/preflight` endpoint.

**Tech Stack:** Node.js 20+, Fastify 5, Vitest, `fast-xml-parser`, `libxmljs2`, `fontoxpath`, Next.js 15, React 19, TypeScript, Redis rate limiting.

## Global Constraints

- Do not add dependencies; reuse the installed `libxmljs2`, `fast-xml-parser`, and existing semantic/Schematron code.
- `/v2/validate` and the public validator accept XML only.
- `/v1/validate` remains flat-response compatible for XML clients; JSON gets HTTP 400 with `/v1/preflight` guidance.
- `/v1/preflight` is canonical JSON data validation and must never claim PINT-AE structural conformance.
- The validator never repairs, normalizes, or silently substitutes submitted XML.
- Parse failure skips Structure and Semantic; XSD failure still runs Semantic.
- Invoice and CreditNote use their matching UBL 2.1 schemas.
- `valid:true` requires every required layer to pass.
- Missing location metadata is `null`; never invent line, column, or XML path values.
- API keys remain server-side; the public web route must not expose credentials.
- No official Schematron coverage claim is added without exact repository evidence.
- Read `.hermes/critic-loop.md` before commits and record deployed evidence after live verification.

---

## File map

**Create:**
- `app/api/src/rules/xsd.js` — the single native Invoice/CreditNote XSD authority.
- `app/api/src/rules/xml-validation.js` — layered XML orchestration and v2 result construction.
- `app/api/test/xml-validation.test.js` — focused layered-core tests.
- `app/api/test/fixtures/validate/valid-credit-note.xml` — stable valid CreditNote fixture copied from the repository's `trn-creditnote/example/Standard tax credit Note.xml`.

**Modify:**
- `app/api/src/rules/convert/xsd.js` — compatibility wrapper to the neutral XSD authority.
- `app/api/src/rules/generate/validate-xsd.js` — compatibility wrapper to the neutral XSD authority.
- `app/api/src/rules/engine.js` — extract reusable semantic evaluation without changing canonical JSON behavior.
- `app/api/src/routes/validate.js` — v1 XML adapter, v2 route, and JSON preflight route.
- `app/api/src/app.js` — OpenAPI description and response schemas.
- `app/api/test/xsd.test.js` — CreditNote and namespace coverage.
- `app/api/test/validate.test.js` — v1/v2/preflight contract and execution-order coverage.
- `app/api/test/helpers/fixtures.js` — fixture helper for the valid CreditNote.
- `app/web/src/lib/validation.ts` — server-side API client replacing local rule execution.
- `app/web/src/app/api/tools/validate/route.ts` — single free-tool proxy to `/v2/validate`.
- `app/web/src/app/api/tools/validate/batch/route.ts` — batch proxy using the same XML-only API client.
- `app/web/src/lib/validation-ui.ts` — v2 layer types and flattening/presentation helpers.
- `app/web/src/components/validation/ValidationSummary.tsx` — render v2 layer statuses and counts.
- `app/web/src/components/validation/ValidationIssueList.tsx` — render rich issue locations.
- `app/web/src/components/validation/ValidationIssue.tsx` — display optional line, column, and XML path.
- `app/web/src/components/BatchValidator.tsx` — consume v2 layer results for batch counts.
- `app/web/test/tools-validate.test.ts` — proxy behavior and v2 response tests.
- `app/web/package.json` and `app/web/package-lock.json` — remove `fast-xml-parser` if no remaining import exists after cleanup.
- `app/web/src/app/docs/page.tsx` — document XML-only `/v1/validate` and JSON `/v1/preflight`.

**Delete after import audit confirms no consumers:**
- `app/web/src/lib/rules/` — validator-only vendored engine copy.
- `app/web/test/engine-parity.test.ts` — parity test for the deleted local validator engine.

---

### Task 1: Centralize the Invoice/CreditNote XSD authority

**Files:**
- Create: `app/api/src/rules/xsd.js`
- Modify: `app/api/src/rules/convert/xsd.js`
- Modify: `app/api/src/rules/generate/validate-xsd.js`
- Modify: `app/api/test/xsd.test.js`
- Create: `app/api/test/fixtures/validate/valid-credit-note.xml`

**Interfaces:**
- Produces `validateXsd(xml: string) -> { documentType: 'Invoice' | 'CreditNote' | null, issues: XsdIssue[], evalErrors: XsdEvalError[] }`.
- `XsdIssue` contains `{ rule, path, message, severity, line, column, xmlPath }`; `line`, `column`, and `xmlPath` are nullable.
- Existing converter consumers continue importing `validateXsd` from `rules/convert/xsd.js`.
- Existing generator consumers continue importing `validateGenerateXsd` from `rules/generate/validate-xsd.js`.

- [ ] **Step 1: Add failing CreditNote and namespace tests.**

Append tests to `app/api/test/xsd.test.js` that read `test/fixtures/validate/valid-credit-note.xml`, assert zero `XSD-01` issues, mutate the Invoice namespace to an invalid URI, mutate the CreditNote namespace to an invalid URI, and assert `XSD-01` issues. Assert a well-formed unknown root remains an `XSD-01`, not an `XSD-ERR`.

```js
it('accepts a valid CreditNote against the CreditNote schema', () => {
  const xml = fs.readFileSync(path.join(import.meta.dirname, 'fixtures/validate/valid-credit-note.xml'), 'utf8');
  const result = validateXsd(xml);
  expect(result.documentType).toBe('CreditNote');
  expect(result.evalErrors).toEqual([]);
  expect(result.issues.filter((issue) => issue.rule === 'XSD-01')).toHaveLength(0);
});

it('rejects an Invoice with the wrong default namespace', () => {
  const result = validateXsd(STANDARD.replace(
    'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'urn:oasis:names:specification:ubl:schema:xsd:NotInvoice-2',
  ));
  expect(result.issues.some((issue) => issue.rule === 'XSD-01')).toBe(true);
});
```

- [ ] **Step 2: Run the focused XSD tests and confirm the new tests fail.**

Run:

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/xsd.test.js
```

Expected: the new CreditNote/namespace assertions fail because the existing Invoice-only implementation or wrapper selection does not satisfy them.

- [ ] **Step 3: Implement `app/api/src/rules/xsd.js`.**

Move the existing schema loading and error mapping into the neutral module. Load both `UBL-Invoice-2.1.xsd` and `UBL-CreditNote-2.1.xsd` from `app/api/pint-ae-resources/ubl-2.1/xsd/maindoc` with the existing `file://` base URL. Select CreditNote only when the parsed root local name is `CreditNote`; select Invoice for `Invoice` and use the Invoice schema for unknown roots so libxml2 reports a structural root violation. Keep startup schema-load failures fatal. Map available libxml2 line/column properties to numbers and use `null` when absent; preserve the existing best-effort `pathFromMessage` extraction as `xmlPath`.

- [ ] **Step 4: Replace the old implementations with compatibility wrappers.**

`app/api/src/rules/convert/xsd.js` should re-export `validateXsd` from `../xsd.js`. `app/api/src/rules/generate/validate-xsd.js` should export `validateGenerateXsd(xml)` that calls the neutral `validateXsd(xml)`. Do not leave duplicate schema loading or validation logic in either wrapper.

- [ ] **Step 5: Run the focused XSD tests and the existing converter/generator tests.**

Run:

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/xsd.test.js test/convert.test.js test/generate.test.js
```

Expected: all existing XSD, converter, and generator tests pass, including the new Invoice/CreditNote and namespace cases.

- [ ] **Step 6: Commit the centralized XSD authority.**

Before committing, read `.hermes/critic-loop.md`, then run `git diff --check` and commit only Task 1 files:

```bash
git add app/api/src/rules/xsd.js app/api/src/rules/convert/xsd.js app/api/src/rules/generate/validate-xsd.js app/api/test/xsd.test.js app/api/test/fixtures/validate/valid-credit-note.xml
git commit -m "refactor(api): centralize UBL invoice and credit note XSD validation"
```

---

### Task 2: Build the layered XML validation core

**Files:**
- Create: `app/api/src/rules/xml-validation.js`
- Modify: `app/api/src/rules/engine.js`
- Create: `app/api/test/xml-validation.test.js`
- Modify: `app/api/test/helpers/fixtures.js`

**Interfaces:**
- Produces `validateXmlDocument(xml: string) -> XmlValidationResult`.
- `XmlValidationResult` has `valid`, `inputFormat`, `validationScope`, `invoiceType`, `schemaVersion`, and `format`, `structure`, `semantic` layer objects.
- Each layer is `{ status: 'passed' | 'failed' | 'skipped', issues: ValidationIssue[] }`.
- Each issue preserves `{ path, rule, severity, message, fix }` and adds nullable `line`, `column`, and `xmlPath`.
- Existing `validateInvoice(body, contentType)` remains the canonical JSON evaluator and does not gain XSD behavior.

- [ ] **Step 1: Extract semantic evaluation from `engine.js` without changing its JSON output.**

Extract the current `numericGuard(invoice)` plus the `RULES` loop and safe rule-crash handling into an exported `evaluateInvoiceRules(invoice)` function. Keep `validateInvoice` calling that function after `normalizeInput`, so canonical JSON tests retain their current `valid`, `invoiceType`, `schemaVersion`, and flat `errors` response.

- [ ] **Step 2: Add failing layered-core tests.**

Create tests for:

```js
it('stops after a malformed XML format failure', () => {
  const result = validateXmlDocument(validUblXml().replace('</Invoice>', '</Invocie>'));
  expect(result.valid).toBe(false);
  expect(result.format.status).toBe('failed');
  expect(result.format.issues[0].rule).toBe('ENG-PARSE-01');
  expect(result.structure.status).toBe('skipped');
  expect(result.semantic.status).toBe('skipped');
});

it('runs semantic rules after an XSD failure', () => {
  const result = validateXmlDocument(validUblXml().replace(
    'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'urn:oasis:names:specification:ubl:schema:xsd:Wrong-2',
  ));
  expect(result.format.status).toBe('passed');
  expect(result.structure.status).toBe('failed');
  expect(result.structure.issues.some((issue) => issue.rule === 'XSD-01')).toBe(true);
  expect(result.semantic.status).toBe('passed');
  expect(result.valid).toBe(false);
});
```

Also assert a valid Invoice and valid CreditNote get a passed Structure layer, and every issue location field is either a real value or `null`.

- [ ] **Step 3: Run the new tests to verify they fail.**

Run:

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/xml-validation.test.js
```

Expected: import or execution failures because the layered core does not exist.

- [ ] **Step 4: Implement `validateXmlDocument`.**

Use `normalizeInput(xml, 'application/xml')` only to parse the original XML into the existing canonical invoice model. On `parseError`, return Format failed and Structure/Semantic skipped. On parse success, call the neutral `validateXsd(xml)`, map its issues to Structure, then call `evaluateInvoiceRules(invoice)` and `validateSchematron(xml)` for Semantic. Preserve the existing interpreter dedupe for the date rule. Run Semantic even when Structure has errors. Compute `valid` from error-severity issues in all non-skipped layers.

Use `validationScope: 'pint-ae-ubl-xml'` and preserve the existing schema version default. Keep client-facing parser/XSD messages safe; do not expose schema filesystem paths.

- [ ] **Step 5: Run focused core, engine, and Schematron tests.**

Run:

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/xml-validation.test.js test/validate.test.js test/schematron.test.js
```

Expected: the new layered assertions pass and existing canonical JSON/Schematron behavior remains green.

- [ ] **Step 6: Commit the layered core.**

```bash
git add app/api/src/rules/xml-validation.js app/api/src/rules/engine.js app/api/test/xml-validation.test.js app/api/test/helpers/fixtures.js
git commit -m "feat(api): add layered XML validation core"
```

---

### Task 3: Add v2 strict XML, v1 XML compatibility, and JSON preflight routes

**Files:**
- Modify: `app/api/src/routes/validate.js`
- Modify: `app/api/src/app.js`
- Modify: `app/api/test/validate.test.js`

**Interfaces:**
- `POST /v2/validate`: authenticated XML-only route returning `XmlValidationResult`.
- `POST /v1/validate`: authenticated XML-only route returning the existing flat result shape.
- `POST /v1/preflight`: authenticated canonical JSON-only route returning the existing data-rule result plus explicit `validationScope: 'canonical-json-data-preflight'`.
- All three routes retain existing API authentication, rate limiting, and usage metering.

- [ ] **Step 1: Add failing route tests.**

Add route tests for:

- `/v2/validate` valid Invoice returns layer objects and `valid`.
- `/v2/validate` valid CreditNote selects the CreditNote XSD.
- `/v2/validate` malformed XML returns Format failure and skipped later layers.
- `/v2/validate` wrong namespace returns Structure issues and semantic output.
- `/v1/validate` accepts XML and retains `errors[]`.
- `/v1/validate` rejects a canonical JSON body with HTTP 400 and `/v1/preflight` in the message.
- `/v1/preflight` accepts `validInvoice()` and returns the explicit JSON data-preflight scope.
- Authentication remains 401 on all three routes without a key.

- [ ] **Step 2: Run the focused route tests to verify the new contract fails.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/validate.test.js
```

Expected: `/v2/validate` and `/v1/preflight` are missing; current JSON `/v1/validate` tests fail the new XML-only contract.

- [ ] **Step 3: Implement route dispatch with one XML parser helper.**

Change `xmlPayload` to return the original XML string for raw XML or `{ document: xml }`, and return `null` for canonical JSON. `/v1/validate` must return a 400 error when `xmlPayload` is null. `/v2/validate` calls `validateXmlDocument` and sends its result. `/v1/validate` calls the same core and flattens the three layer issue arrays into the existing `errors[]`, preserving `invoiceType` and `schemaVersion`.

Move the existing canonical JSON call to `/v1/preflight`, reject XML there with a clear data-preflight-only message, and add `validationScope` to its response. Remove direct Schematron execution from the route once `validateXmlDocument` owns the complete XML flow; this prevents v1 and v2 from running different semantic paths.

Make usage metering accept the endpoint string instead of hardcoding `/v1/validate`, and preserve `valid` outcome accounting.

- [ ] **Step 4: Add OpenAPI schemas and descriptions.**

In `app/api/src/app.js` and route schemas, define reusable JSON schemas for `LayerResult`, rich `ValidationIssue`, and `XmlValidationResult`. Document `/v2/validate` as strict UBL XML validation, `/v1/validate` as the legacy flat XML contract, and `/v1/preflight` as canonical JSON data preflight. Do not describe either endpoint as FTA-accredited or as transmitting a legal invoice.

- [ ] **Step 5: Run the focused route suite and OpenAPI generation.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test -- --run test/validate.test.js
npm run openapi
```

Expected: all new and migrated route tests pass; generated OpenAPI contains the three distinct input contracts.

- [ ] **Step 6: Commit the API contracts.**

```bash
git add app/api/src/routes/validate.js app/api/src/app.js app/api/test/validate.test.js
git commit -m "feat(api): add strict XML v2 validation contract"
```

---

### Task 4: Route the free single and batch tools through the API

**Files:**
- Modify: `app/web/src/lib/validation.ts`
- Modify: `app/web/src/app/api/tools/validate/route.ts`
- Modify: `app/web/src/app/api/tools/validate/batch/route.ts`
- Modify: `app/web/test/tools-validate.test.ts`

**Interfaces:**
- `validateDocument(text: string): Promise<XmlValidationResult>` performs a server-side fetch to `${NEXT_PUBLIC_API_BASE_URL}/v2/validate`.
- The API key is read only from `process.env.EINVOICECHECK_API_KEY` on the server.
- Single and batch routes keep existing public IP rate-limit envelopes and return `{ ok: true, result, rateLimit }` or `{ ok: true, results, rateLimit }`.

- [ ] **Step 1: Add failing proxy tests.**

Stub `global.fetch` in `app/web/test/tools-validate.test.ts` and assert the validation client sends `POST /v2/validate`, `content-type: application/xml`, and the server-only `x-api-key`. Assert JSON input is rejected rather than evaluated locally. Assert non-2xx API responses become a truthful web error response. Add the same behavior to the batch route for each XML document.

- [ ] **Step 2: Run the web validation tests to verify the proxy assertions fail.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/web
npm test -- --run test/tools-validate.test.ts
```

Expected: current tests observe local synchronous engine execution and fail the fetch/key assertions.

- [ ] **Step 3: Replace local execution with the server-side API client.**

Use the same `apiBaseUrl()` normalization and `apiKeyHeader()` pattern already used by `app/web/src/app/api/tools/convert/route.ts`. Add a bounded `AbortSignal.timeout` to prevent a stuck API from hanging the public route. Return HTTP 503 when the API URL or key is not configured or the upstream request fails. Forward only safe upstream error messages; never expose the API key.

Make the single route `await validateDocument(document)`. Keep the existing empty-document, size, Redis-unavailable, and 429 behavior. Require XML input before calling the API and update the user-facing error from “canonical JSON or XML” to XML-only.

Update the batch route to call the same async client sequentially, preserving one rate-limit unit per invoice. Reject non-XML documents with an index-specific error instead of running local JSON rules.

- [ ] **Step 4: Run web proxy tests and type/build checks.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/web
npm test -- --run test/tools-validate.test.ts
npm run build
```

Expected: proxy tests pass; production build succeeds without bundling native XSD dependencies into the web application.

- [ ] **Step 5: Commit the web proxy.**

```bash
git add app/web/src/lib/validation.ts app/web/src/app/api/tools/validate/route.ts app/web/src/app/api/tools/validate/batch/route.ts app/web/test/tools-validate.test.ts
git commit -m "feat(web): proxy validator through strict XML API"
```

---

### Task 5: Render v2 layers and remove the duplicate web validator engine

**Files:**
- Modify: `app/web/src/lib/validation-ui.ts`
- Modify: `app/web/src/components/validation/ValidationSummary.tsx`
- Modify: `app/web/src/components/validation/ValidationIssueList.tsx`
- Modify: `app/web/src/components/validation/ValidationIssue.tsx`
- Modify: `app/web/src/components/BatchValidator.tsx`
- Delete after import audit: `app/web/src/lib/rules/`
- Delete after import audit: `app/web/test/engine-parity.test.ts`

**Interfaces:**
- UI type `XmlValidationResult` mirrors the API v2 layer/status contract.
- `flattenValidationIssues(result)` returns issues in Format, Structure, Semantic order for existing report/export components.
- `layerOfIssue` is no longer the source of truth for v2 results; the response layer is authoritative.

- [ ] **Step 1: Add failing component tests for layer statuses and locations.**

Extend the existing validation component tests with a v2 result containing one Format issue, one Structure issue with `line`, `column`, and `xmlPath`, and one Semantic issue. Assert the summary shows the three layer statuses/counts and the issue view renders location data only when present. Assert skipped layers are visibly distinct from passed layers.

- [ ] **Step 2: Run the focused web tests to verify the old flat-result assumptions fail.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/web
npm test -- --run test/tools-validate.test.ts test/validation-ui.test.ts
```

Expected: current components either cannot read v2 layers or report counts from a nonexistent flat array.

- [ ] **Step 3: Update UI types and adapters.**

Define `ValidationLayerStatus`, `ValidationIssue`, `ValidationLayer`, and `XmlValidationResult` in `validation-ui.ts`. Flatten layer issues only for components that still need a single ordered list. Keep the current copy/report behavior while using response layer names and statuses instead of rule-prefix inference.

- [ ] **Step 4: Update summary, issue list, issue detail, and batch rendering.**

Render Format, Structure, and Semantic badges with `passed`, `failed`, and `skipped` states. Keep filtering behavior, but filter from the authoritative layer. Render nullable location values as `Line N, column M` and `XML path: ...` only when supplied. Update batch counts to flatten each v2 result rather than accessing `result.errors`.

- [ ] **Step 5: Remove the unused local validation engine.**

After confirming `app/web/src/lib/validation.ts` is the only production import of `app/web/src/lib/rules/`, delete the vendored rule tree and `app/web/test/engine-parity.test.ts`. Remove `fast-xml-parser` from `app/web/package.json` and regenerate `app/web/package-lock.json` only if no remaining web import exists. Do not remove any API-side rule or converter/generator code.

- [ ] **Step 6: Run all web tests and build.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/web
npm test
npm run build
```

Expected: all web tests pass, no local validator engine is bundled, and the free UI displays API v2 layer results.

- [ ] **Step 7: Commit the UI and duplicate-engine removal.**

```bash
git add app/web/src/lib/validation-ui.ts app/web/src/components/validation app/web/src/components/BatchValidator.tsx app/web/package.json app/web/package-lock.json
git add -u app/web/src/lib/rules app/web/test/engine-parity.test.ts
git commit -m "feat(web): render structured validation layers"
```

---

### Task 6: Align documentation, run full gates, and verify production

**Files:**
- Modify: `app/web/src/app/docs/page.tsx`
- Modify: `.hermes/critic-loop.md`
- Test: `app/api/test/**`, `app/web/test/**`

- [ ] **Step 1: Update developer documentation.**

Document `/v2/validate` as XML-only strict UBL Invoice/CreditNote validation. Document `/v1/validate` as the legacy flat XML contract. Document `/v1/preflight` as canonical JSON data preflight that does not validate final UBL XML structure. Remove text that says the public validator accepts canonical JSON.

- [ ] **Step 2: Run the complete API and web test suites.**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/app/api
npm test

cd /c/Users/AMG/code/https-einvoicecheck.ae/app/web
npm test
npm run build
```

Expected: all API and web tests pass. A failure is a stop condition; do not push a partial implementation.

- [ ] **Step 3: Verify synchronization and repository safety.**

Run:

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Confirm only intended implementation files are staged. Do not stage the user's unrelated untracked audit attachments or local tool directories.

- [ ] **Step 4: Commit documentation and final local verification.**

Read `.hermes/critic-loop.md`, update F-02 to `🔄 IN PROGRESS` with the implementation commit, then commit:

```bash
git add app/web/src/app/docs/page.tsx .hermes/critic-loop.md
git commit -m "docs: publish strict XML validation scope"
```

- [ ] **Step 5: Deploy and verify the exact production commit.**

Push the implementation only after the API and web suites pass. Record the resulting commit and Railway deployment identity. Once deployment succeeds, exercise:

- `invalid-01-malformed-xml.xml`: one Format parse issue, `ENG-PARSE-01`, no semantic-only diagnosis.
- `valid-comprehensive-pint-ae.xml`: no false XSD failure.
- `app/api/pint-ae-resources/trn-creditnote/example/Standard tax credit Note.xml`: CreditNote schema selected.
- Wrong Invoice and CreditNote namespace mutations: Structure `XSD-01` failures.

Use the existing public web tool and direct API path, not only a local request. Update `.hermes/critic-loop.md` with the deployed commit, endpoint, timestamp, and observed layer results. Mark F-02 resolved only after both direct API and public free-tool verification agree.

- [ ] **Step 6: Final commit/push gate.**

Read `.hermes/critic-loop.md` again, confirm no unresolved P0/P1 finding relevant to the changed files is being ignored, run both suites once more if any post-deploy documentation change occurred, and push the verified commits.

---

## Verification checklist

- [ ] One native XSD implementation serves validator, converter, and generator.
- [ ] Invoice and CreditNote schemas are selected correctly.
- [ ] Wrong namespaces cannot produce `valid:true`.
- [ ] Malformed XML fails Format before later layers run.
- [ ] XSD failure produces Structure issues and still exposes Semantic findings.
- [ ] v2 distinguishes passed, failed, and skipped layers.
- [ ] v1 XML clients retain the flat response shape.
- [ ] JSON is rejected by `/v1/validate` and available only at `/v1/preflight`.
- [ ] Public single and batch tools proxy the API and expose no API key.
- [ ] Web no longer runs a second validator engine.
- [ ] API and web tests/build pass.
- [ ] Production behavior is verified against the deployed commit and recorded in `.hermes/critic-loop.md`.
