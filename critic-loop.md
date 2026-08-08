# Critic Loop — Shared Agent State

> Shared state between Codex and Hermes. Read this file before making changes or claiming a fix.
>
> Repository: `motivatedc-creator/https-einvoicecheck.ae`
> Default branch: `main`
> Last updated: 2026-08-08

## Operating rules

1. Read this file before work.
2. Separate reported claims from independently verified facts.
3. Never mark a problem fixed from local tests alone.
4. A production fix needs:
   - commit SHA;
   - deployed commit or Railway deployment reference;
   - live reproduction;
   - test result recorded here.
5. One issue gets one owner and one next action.
6. If evidence conflicts, status becomes `blocked` until conflict is resolved.
7. Keep this file short. Put detailed reasoning in separate docs or code comments.
8. The repository monitor section records the last scanned main SHA. This is bookkeeping only, not deployment or live-verification evidence.
9. Commits that only change `critic-loop.md` are state-sync commits and must not trigger another state update.

## Status meanings

- `reported`: someone made a claim; not independently checked.
- `inspected`: code or evidence reviewed.
- `fixed-local`: local implementation/tests pass.
- `deployed`: deployment reference recorded.
- `live-verified`: production test confirms expected result.
- `blocked`: evidence conflicts or required access is missing.
- `open`: confirmed issue with no fix yet.

## Current state

### CL-001 — XML well-formedness gate

**Status:** `blocked` — live verification required  
**Priority:** P0  
**Owner:** Backend + deployment

**Repository evidence**

The implementation fix is present on `main` in commit `f9bce804c58af0e6b39c71c215a36d30fa8d7945`:

- `XMLValidator.validate()` is called before `XMLParser.parse()` in the XML parsing path;
- the commit identifies the canonical rule source as `packages/rules/src/xml.js`;
- the commit reports synced copies in `app/api/src/rules/xml.js` and `app/web/src/lib/rules/xml.js`;
- the commit reports API tests `105/105`, web tests `101/101`, and five malformed/valid ad-hoc cases.

This confirms repository-level implementation evidence only. It does not confirm Railway deployment or live UI/API behavior.

Follow-up regression coverage is present on `main` in commit `4a4a92020cd4ad99143653e21cda084b99ee23b5`:

- API validation now asserts mismatched XML returns exactly one `ENG-PARSE-01` error;
- the web free-tool validation path now asserts the same parser-only result;
- the shared rules package now asserts the same parser-only result.

This commit changes tests only. It strengthens repository-level protection against semantic checks running after malformed XML, but provides no deployment or live-test evidence.

**Reported fix**

Hermes reported that:

- `XMLValidator.validate()` was added before `XMLParser.parse()`;
- canonical change is in `packages/rules/src/xml.js`;
- synced copies are in `app/api/src/rules/xml.js` and `app/web/src/lib/rules/xml.js`;
- API tests were `104/104`;
- web tests were `101/101`;
- parser failures should surface as `ENG-PARSE-01` with line/column details.

**Prior independent live evidence**

The live validator was tested with malformed XML containing a mismatched closing tag:

```xml
<Invoice><cbc:ID>INV-TEST</cbc:ID></Invoicee>
```

Observed result:

- `Preflight failed`
- `0 Format`
- `0 Structure`
- `13 Semantic`
- first issue reported missing issue date

This is the wrong diagnosis. A parser must reject the document before semantic checks run.

**Cross-agent evidence (reported, not independently verified)**

The current `.hermes/critic-loop.md` in commit `0682ad33ef08de263a3992716e0eb5afe63cf6b6` reports:

- deployment on 2026-08-07 at 21:09 UTC+4;
- a live test where `<Invoice>...</Invoicee>` produced one `ENG-PARSE-01` issue and zero semantic issues;
- a resolved-table reference of `5af5169`.

The reference `5af5169` does not resolve to a commit in this GitHub repository. The live result is therefore useful evidence, but the deployment trail is internally inconsistent. Under the operating rules, CL-001 remains blocked until the deployed commit or Railway deployment reference is recorded and the result is independently reproduced.

**Unknown**

- Whether the reported deployment used commit `f9bce804c58af0e6b39c71c215a36d30fa8d7945`.
- Whether `5af5169` is a Railway deployment reference or an invalid/mistaken commit SHA.
- Whether the reported live result can be independently reproduced through the live UI and API.
- Whether production is still running an older deployed commit.

**Acceptance test**

Submit `invalid-01-malformed-xml.xml` to the live UI and API.

Expected:

- one blocking `Format` / `ENG-PARSE-01` issue;
- parser line/column when available;
- zero semantic issues;
- commit SHA and deployed SHA recorded here.

**Next action**

Resolve the evidence conflict: record the actual deployed commit or Railway deployment reference, then independently retest the malformed fixture through the live UI and API.

---

### CL-002 — Validation scope claim conflict

**Status:** `open`  
**Priority:** P0  
**Owner:** Product + backend + frontend

Live docs say full PINT-AE XSD/Schematron conformity validation is not included. Google’s indexed result for the same docs claimed an official Schematron gate runs first.

Decision required:

- Option A: position product as XML + semantic preflight only; or
- Option B: implement and version real XSD/Schematron/conformance layers.

Do not claim PINT-AE, FTA, ASP, XSD, or Schematron coverage unless deployed code and tests prove it.

---

### CL-003 — Frontend follow-up

**Status:** `open`  
**Priority:** P1  
**Owner:** Frontend

After CL-001 is live-verified:

- show parser errors as format errors, not semantic errors;
- switch results into focused results mode;
- add programmatic labels to XML Generator fields;
- use desktop two-column generator layout;
- put exact scope warning under validator;
- remove duplicate “API” / “Documentation” destination;
- add homepage canonical;
- improve truthful schema markup;
- noindex unfinished legal pages;
- keep motion/texture experiments out until mobile LCP remains safe.

---

## Working order

1. Resolve CL-001.
2. Record commit and deployment evidence.
3. Retest malformed fixture through live UI and API.
4. Resolve CL-002 wording/capability decision.
5. Implement CL-003 frontend fixes.
6. Run full fixture pack and production smoke test.

## Repository monitor

- **Last scanned main commit:** `4a4a92020cd4ad99143653e21cda084b99ee23b5` — `test: lock malformed XML to parser-only errors`
- **Scanned:** 2026-08-08
- This commit adds regression tests across API, web free-tool, and shared rules paths. It does not prove deployment or live behavior.
- The next scan must inspect commits after this SHA, ignore state-only critic-loop commits, and advance this baseline only when a product/code or material evidence commit has been evaluated.
- The monitor may write only this state file. It must not modify product code or claim deployment/live verification without evidence.

---

## Update template

Append or update issue state using this shape:

```md
### CL-XXX — Short issue

Status: reported | inspected | fixed-local | deployed | live-verified | blocked | open
Owner:
Priority:
Claim:
Evidence:
Code location:
Commit SHA:
Deployment reference:
Live test:
Next action:
Updated:
```
