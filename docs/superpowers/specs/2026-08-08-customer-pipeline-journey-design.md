# Customer Pipeline Journey — Design

Date: 2026-08-08
Status: Approved (brainstorming session)

## Problem

Pages are disjointed islands. Tools don't know about pricing, pricing doesn't
know about tools, dashboard leads nowhere. Landing explains the product but
doesn't route anywhere (after the FAQ there is only a footer). Symptoms: B
(landing unclear where to go), C (no post-signup path), D (tools confusing).
Free-tool users are fine — tools work as SEO/marketing bait.

Money event: **self-serve API key purchase** (signup → plan → key → integrate).

## Funnel

```
Discover → Try → [Free tier bridge] → Paid → Integrate
```

| Stage | Pages | Job | Exit CTA |
|---|---|---|---|
| Discover | landing, blog, templates, alternatives, vs, docs index | Make the product's job clear | "Try the free validator" |
| Try | 5 tools (validator, PINT-AE, TRN, repairer, generator) | Prove value, stay anonymous | "Get your free API key — no card" |
| Free tier (bridge) | pricing, signup | Key with limited monthly calls, no card | upgrade when you scale |
| Paid | pricing | self-serve plan → key | — |
| Integrate | dashboard | Guided setup: key → first call → verified | destination |

The pipeline is a *state each page is aware of*, not a set of links. No new
routes required (page paths remain movable if needed).

## Components

1. **`FunnelStage`** — tiny shared primitive (per-page constant):
   `discover | try | free | paid | integrate`. One source of truth for "what
   does this page do next."

2. **`NextStep`** — one component rendered site-wide (nav/footer/tool strip).
   Reads the page's stage, renders the exit CTA:
   - discover → "Try the free validator"
   - try → "Get your free API key — no card"
   - free (dashboard, unpaid) → "Upgrade when you scale"
   - paid → usage + docs links

3. **Tool family bar** — compact 5-chip bar on every tool page (and homepage),
   so the suite is discoverable. Google entry stays intact (independent SEO
   pages); sequence only activates once the user is *in* a tool.

4. **Tool sequence cross-links** — Generate/Repair point at Validate ("Next
   logical step: validate this XML"); Validate points back at
   Generate/Repair + API CTA. TRN checker stays standalone (no XML in/out).
   **No payload carryover** (deliberately: cross-link only, sessionStorage
   carryover deferred until a user complains about re-pasting).

5. **Dashboard onboarding checklist** — 3 steps: create key → copy it → make
   your first call (curl with their key pre-filled). Until complete, a
   "complete setup" card dominates the dashboard. After: usage panel +
   upgrade CTA.

6. **Pricing** — free tier is the hero row ("$0, 1,000 calls/mo, no card"),
   paid rows above.

## Landing page (minimal)

Keep hero, embedded ValidatorWorkspace, TrustStrip, FreeVsApi, ScopePanel,
FAQ, SEO copy — all already good. Add:
- NextStep exit strip (post-check → "Get your free API key — no card")
- Tool family bar

No persona split, no rewrite.

## Constraints honored

- Tools stay free + no signup (SEO engine) — preserved.
- SEO structure + keywords stay; page paths movable (none needed).
- Auth model unchanged (server-side, API-key based); deferred discussion.

## Explicitly out of scope

- sessionStorage payload carryover (deferred until asked)
- Persona split on landing
- Auth model rework
- PDF ingestion pipeline
- /get-started hub

## Testing

- One unit check for `NextStep` stage→CTA mapping.
- Dashboard checklist state transitions.
- Per existing repo test conventions.
