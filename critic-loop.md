# Critic Loop — Shared Agent State

> Shared state between Codex and Hermes. Read this file before making changes or claiming a fix.
>
> Repository: `motivatedc-creator/https-einvoicecheck.ae`
> Default branch: `main`
> Last updated: 2026-08-07

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

**Reported fix**

Hermes reported that:

- `XMLValidator.validate()` was added before `XMLParser.parse()`;
- canonical change is in `packages/rules/src/xml.js`;
- synced copies are in `app/api/src/rules/xml.js` and `app/web/src/lib/rules/xml.js`;
- API tests were `104/104`;
- web tests were `101/101`;
- parser failures should surface as `ENG-PARSE-01` with line/column details.

**Independent live evidence**

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

**Unknown**

- Whether Hermes fix exists on the current branch.
- Whether the fix was deployed to Railway.
- Whether web/API are using different rule copies.
- Whether the live test reached a different validation path.
- Whether production is still running an older commit.

**Acceptance test**

Submit `invalid-01-malformed-xml.xml` to the live UI and API.

Expected:

- one blocking `Format` / `ENG-PARSE-01` issue;
- parser line/column when available;
- zero semantic issues;
- commit SHA and deployed SHA recorded here.

**Next action**

Map repository code, confirm canonical parser source, compare deployed commit, deploy if needed, then retest live.

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
