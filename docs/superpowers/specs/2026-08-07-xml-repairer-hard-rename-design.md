# XML Repairer Hard-Rename Design

**Date:** 2026-08-07  
**Status:** Design approved; written spec pending user review  
**Prerequisite for:** Shared XSD validation gate rollout

## Purpose

Correct the product boundary by renaming the existing XML **Converter** to the XML **Repairer** everywhere it remains active.

The current feature does not convert between document formats. It receives an existing XML invoice, applies limited and auditable format repairs, and returns XML. Calling it a converter confuses customers, developers, API consumers, and the architecture of the future document-conversion product.

## Product vocabulary

- **Validator:** judges an existing UBL XML document and never modifies it.
- **Repairer:** makes limited, auditable repairs to an existing XML document. Its input and output are both XML.
- **Generator:** builds UBL XML from structured form or application data.
- **Converter:** a future document-ingestion pipeline for PDF, Word, image, or other source invoices. It will extract data, map it to a structured invoice model, require appropriate review, and produce JSON and/or UBL XML. It is not part of this project.

## Goals

1. Replace all active customer-facing, API, source, test, and operational terminology for the current feature with **Repairer**.
2. Replace `POST /v1/convert` with `POST /v1/repair` without a compatibility alias.
3. Rename the full response and client contract rather than leaving conversion vocabulary behind.
4. Preserve all existing repair behavior, security controls, refusal guardrails, auditability, and non-persistence guarantees.
5. Deliver the rename atomically so Railway cannot deploy a mismatched caller and callee.
6. Remove obsolete converter-era design artifacts so the repository has one maintained description of the Repairer.

## Non-goals

- No new repair rules.
- No changes to what the Repairer is allowed to modify.
- No conversion from PDF, Word, image, JSON invoice data, or any other source format.
- No compatibility alias, redirect, or migration period for `/v1/convert`.
- No XSD-validator extraction in this prerequisite. That follows in the separate validator design and implementation.
- No changes to the Validator or Generator behavior.

## Architecture

### Public API

`POST /v1/repair` replaces `POST /v1/convert`.

It preserves:

- API-key and bearer authentication;
- per-key rate limiting;
- usage metering;
- the 5 MB API body limit;
- raw XML and JSON-wrapped XML transport;
- no invoice-payload persistence;
- repair audit trails;
- input/output hashes and data-integrity checks;
- refusal guardrails;
- format and full modes.

A JSON request body may wrap an XML string, but canonical JSON invoice data is not a Repairer input.

`POST /v1/convert` is no longer registered and receives the service's normal 404 response.

### Repair engine

The active engine moves from `rules/convert/` to `rules/repair/`.

The engine's public vocabulary becomes:

- `repair(xml, options)` instead of `convert(xml, options)`;
- `RepairResult` instead of `ConvertResult`;
- `repairXml` instead of `convertXml`;
- `RepairApiResponse` instead of `ConvertApiResponse`.

The response status vocabulary becomes:

- `REPAIRED`: safe format repairs produced XML;
- `NOOP`: no safe repair was required;
- `REFUSED`: the document cannot be repaired within policy;
- `ERROR`: the engine or an integrity guard failed.

`repairedAt` replaces `convertedAt`.

The XSD implementation stays under the Repairer for this prerequisite. The following validator project will move it into a neutral API-only module shared by Validator and Repairer.

### Web Repairer

The browser calls `POST /api/tools/repair`. This server-only route calls `POST /v1/repair` using the existing server-side API key.

The existing Repairer page and workspace remain. Stale proxy paths, client functions, types, statuses, analytics labels, quota text, and error messages are renamed. The API key remains server-side and submitted XML is not persisted.

### Operational data

New usage events record `/v1/repair`. Existing database records that contain `/v1/convert` remain unchanged as historical facts.

Existing quota behavior remains intact. The API limiter remains keyed by API-key ID, and the public-tool limiter keeps its existing `uae-e-invoice-repairer` key, so the rename does not reset active counters.

## Data flow

```text
Existing XML
  -> browser Repairer
  -> POST /api/tools/repair
  -> server-side authenticated proxy
  -> POST /v1/repair
  -> repair engine
  -> repaired XML + audit, or explicit refusal
```

The Validator is never called implicitly, and the Repairer does not silently become a Converter. The existing validate-next handoff remains an explicit user action after repair.

## Failure behavior

- Invalid request bodies return a safe 400 response using Repairer terminology.
- Authentication and rate-limit failures retain their current status codes and security behavior.
- `REFUSED` returns no repaired XML when policy forbids a safe repair.
- `ERROR` returns no repaired XML and does not leak stack traces or internal exception details.
- The web proxy maps upstream failures to Repairer language.
- No redirect, alias, or fallback invokes `/v1/convert`.

## Repository cleanup

Implementation deletes obsolete converter-era materials rather than rewriting them:

- converter-named historical specs and plans;
- converter spikes and demos;
- converter presentation artifacts.

Active Repairer documentation and this design become the maintained record. Unrelated uses of the word "convert"—for example language-level type conversion—are not renamed.

## Atomic delivery

The implementation is one atomic hard-rename commit containing:

1. engine directory and exports;
2. API route, schemas, OpenAPI tags, metering labels, and tests;
3. web proxy path, client contract, UI messages, analytics labels, and tests;
4. active documentation updates;
5. historical converter-artifact deletion.

The commit is not pushed until both full test suites pass. Because `main` auto-deploys, partial rename commits must not be pushed separately.

## Verification

### Engine contract

- Repairable XML returns `REPAIRED`, `repairedAt`, output XML, hashes, and an audit trail.
- Clean XML returns `NOOP`.
- Unsafe or prohibited input returns `REFUSED` without output XML.
- Internal or integrity failure returns `ERROR` without leaked internals.

### API contract

- `POST /v1/repair` preserves authentication, rate limiting, metering, raw XML input, JSON-wrapped XML input, and no-payload-persistence behavior.
- `POST /v1/convert` returns 404.
- OpenAPI exposes a Repairer route and tag with no active converter route or tag.
- New metering records identify `/v1/repair`.

### Web contract

- `POST /api/tools/repair` proxies only to `/v1/repair`.
- The full public flow works: upload or paste, repair, inspect audit/diff, copy or download, then explicitly validate.
- Error and quota messages contain no conversion terminology.

### Repository gate

- Active source, tests, and current docs contain no stale feature identifiers such as `ConvertResult`, `convertXml`, `CONVERTED`, or `convertedAt`.
- Remaining uses of "convert" are reviewed and must be unrelated to this feature.
- Converter-era plans, specs, spikes, demos, and presentation artifacts are absent.
- The full API and web test suites pass.

### Live acceptance

After Railway deploys the atomic commit:

1. A repairable fixture succeeds through the public Repairer.
2. Downloaded XML matches the output represented by the audit trail.
3. Direct `/v1/repair` access enforces authentication.
4. `/v1/convert` returns 404.
5. The deployed page and API responses contain Repairer terminology.

## Sequencing with strict XSD validation

This rename is implemented first. The subsequent strict-validator project then:

1. extracts the existing XSD gate from `rules/repair/` into a neutral API-only module;
2. adds official Invoice and CreditNote schema selection;
3. shares that one XSD authority between Validator and Repairer;
4. adds strict XML-only validator endpoints and the approved v2 layered response.

This avoids introducing new validator architecture under terminology already known to be wrong.
