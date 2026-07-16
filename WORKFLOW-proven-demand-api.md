# Proven-Demand API Sprint — Autonomous Agent Workflow

**Runtime:** Claude Code desktop (identical structure works in Codex). Requires your installed skill bundles (engineering, marketing, product, business-growth).
**Pattern:** `orchestrator` (DAG dependency mode) with an `evaluator` gate before launch — per `/engineering-advanced-skills:agent-workflow-designer`.
**Sprint window:** Jul 14 → Jul 25, 2026 (launch gate). Post-launch loop runs indefinitely.
**Human touchpoints:** 4 (G1 niche word, G2A infra checklist, G2B live-verification status, G3 launch word). Everything else is autonomous.

---

## 0. Kickoff prompt — paste this into a fresh desktop session

```text
You are the ORCHESTRATOR for workflow "proven-demand-api-v1", fully specified in
WORKFLOW-proven-demand-api.md in this directory. Read it end to end before acting.

Rules:
1. Execute the DAG in §2. Spawn ONE subagent per step. Each subagent receives ONLY
   its handoff contract from §4 plus the artifact files named in `upstream_artifacts`
   — never the full conversation context.
2. Write every output to ./handoffs/<step_id>/ exactly as specified in the step's
   `outputs`. Validate outputs against the step's `done_when` before marking complete.
3. Maintain ./handoffs/ledger.json (per-step status, retries, token spend, timestamps).
4. Halt and ask me ONLY at gates G1, G2A, G2B, G3. Ask in the exact one-line format the
   gate specifies. Do not ask me anything else.
5. Apply the failure policy in §5 and kill criteria in §6 without asking.

Load the referenced skill for each step before executing it. Begin with step V1 now.
```

---

## 1. Objective

Execute the "copy proven demand" playbook end to end: pick one utility API with verified existing demand → ship landing + SEO on day zero → build the API and billing on a boring stack → deploy free-tool and comparison-page distribution → run a <5-minute support loop as the retention weapon. No novel ideas, no paid ads, no stack debates.

**Stack is locked (decision already made — do not re-litigate):** Next.js client · Fastify API · Redis cache · MongoDB · Railway hosting · **Dodo Payments** billing (swapped from Stripe — founder operates as a UAE individual without a trade licence; Dodo supports individual merchants. Do not retain Stripe as a parallel integration).

**Billing amendment:** Dodo has no metered-billing primitive. The API's own MongoDB `UsageEvent` metering (built in E1) is the source of truth for usage; overage bills via plan tiering or an on-demand charge, not via a processor-side meter. Live mode requires approved individual KYC — this is a hard precondition on G3, not a background task.

---

## 2. DAG

```json
{
  "workflow_id": "proven-demand-api-v1",
  "pattern": "orchestrator",
  "dependency_mode": "dag",
  "orchestrator": "planner",
  "specialists": ["validator", "seo_marketer", "api_engineer", "dashboard_engineer", "growth_builder", "ops_agent", "ship_gate_evaluator"],
  "steps": [
    { "step_id": "V1", "agent": "validator",          "depends_on": [] },
    { "step_id": "G1", "agent": "HUMAN",              "depends_on": ["V1"] },
    { "step_id": "G2A","agent": "HUMAN",              "depends_on": ["G1"] },
    { "step_id": "M1", "agent": "seo_marketer",       "depends_on": ["G1", "G2A"] },
    { "step_id": "E1", "agent": "api_engineer",       "depends_on": ["G1"] },
    { "step_id": "G2B","agent": "HUMAN",              "depends_on": ["M1"] },
    { "step_id": "E2", "agent": "dashboard_engineer", "depends_on": ["E1", "G2A"] },
    { "step_id": "M2", "agent": "seo_marketer",       "depends_on": ["M1", "V1"] },
    { "step_id": "GR1","agent": "growth_builder",     "depends_on": ["M1", "E1"] },
    { "step_id": "SDK1","agent": "api_engineer",      "depends_on": ["E1"] },
    { "step_id": "MCP1","agent": "api_engineer",      "depends_on": ["E1"] },
    { "step_id": "LEV1","agent": "growth_builder",    "depends_on": ["E1", "M2"] },
    { "step_id": "O1", "agent": "ops_agent",          "depends_on": ["E2"] },
    { "step_id": "Q1", "agent": "ship_gate_evaluator","depends_on": ["E2", "M1", "M2", "GR1", "O1", "SDK1", "MCP1", "LEV1"] },
    { "step_id": "G3", "agent": "HUMAN",              "depends_on": ["Q1", "G2B"] },
    { "step_id": "L1", "agent": "ops_agent",          "depends_on": ["G3"] }
  ]
}
```

M1 and E1 run in parallel the moment G1 and G2A clear. **G2A is infrastructure only** — domain, Railway, Dodo account + test-mode key/webhook secret, support email — none of which require a live site to obtain, so it can't deadlock against M1. **G2B is Dodo's live/KYC verification**, which genuinely needs M1's real site as an input (processors reviewing individual-merchant applications want to see actual terms, pricing, and refund policy) — so G2B is now correctly sequenced *after* M1 instead of bundled with the credentials that unblock it. G2B only gates **G3** (going live), never E2 — E2 builds and fully tests against Dodo test-mode credentials from G2A the entire time G2B sits in Dodo's review queue. M2, GR1, SDK1, and MCP1 fan out as soon as their parents finish (SDK1/MCP1 as soon as E1 finishes — they don't wait on marketing). LEV1 depends on both E1 and M2 since the demo page needs a working API and reuses M2's comparison-page shell. Q1 is the fan-in quality gate — it now waits on all eight producing steps, not five, so the high-leverage builds get the same pre-launch scrutiny as the core product. **G3 now waits on both Q1 and G2B** — the ship gate can pass while KYC is still pending, but launch itself can't happen until Dodo verification clears, same as the earlier KYC precondition, just now explicit in the DAG edges instead of prose alone.

**Note on scope:** SDK1, MCP1, and LEV1 are the three build-task items from the marketing plan's §2.15 (high-leverage plays #3, #4, #1). The other five plays in that section (#2, #5, #6, #7, #8) are deliberately *not* in this DAG — they're ops/content moves that happen after launch, in the L1 weekly loop or manually, not engineering work that should compete for sprint time before you have a live product.

---

## 3. Shared conventions (all agents)

**Handoff contract schema** (minimum contract from the workflow-designer skill — every step in §4 uses it):
`workflow_id · step_id · task · constraints · upstream_artifacts · outputs · done_when · budget_tokens · timeout_seconds`

**Context discipline:** a subagent gets its contract + the listed artifact files. Nothing else. Artifacts are the interface.

**Artifact root:** `./handoffs/<step_id>/`. Every step also appends one status line to `./handoffs/ledger.json`.

**Datestamp discipline:** all web research uses live search with the current date (July 2026). No training-data numbers for volume, pricing, or competitor features.

**GTM plan is binding for marketing/content steps (M1, M2, GR1, O1):** where `GTM-MARKETING-MASTER-PLAN.md` is listed as an upstream artifact, the agent must build to its spec, not freelance. Specifically honor: the one-message positioning (§1.2) and the non-negotiable guardrail — never claim FTA accreditation, never imply the product transmits legal invoices, never position it as replacing an ASP ("we check, we don't replace"); the §8 UAE reweighting (this is the compliance niche, so LinkedIn + local + cold-outreach lead, not the generic dev-community grind); the §2.3 comparison targets already named in decision.json's m2_competitors; and the §2.4 free-tool design rules for GR1 (a TRN-format / PINT-field checker as the zero-login version of the paid API).

---

## 4. Step contracts

### V1 — Demand validation (validator)

```json
{
  "workflow_id": "proven-demand-api-v1", "step_id": "V1",
  "task": "Score 3 candidate niches against the rubric and recommend exactly one.",
  "constraints": [
    "Candidate 1 (seeded): the UAE compliance/SaaS wedge already validated in prior research — restate it in one line, then score it with fresh data like the others.",
    "Candidate 2: one niche public-data scraping API (pick the specific vertical with clearest search volume).",
    "Candidate 3: one cross-platform social posting/scheduling API.",
    "Per candidate: monthly search volume for 5 buy-intent keywords; top 3 competitors with pricing, review complaints, and feature gaps; evidence of people paying today.",
    "Rubric /100: search volume & buy intent 30 · competitor weakness/gaps 25 · buildable in ≤2 weeks on the locked stack 20 · price tolerance ≥$29/mo 15 · SEO+free-tool distribution fit 10.",
    "End with ONE recommendation and a one-paragraph 'why this over the other two'. No hedging, no 'it depends'."
  ],
  "upstream_artifacts": [],
  "outputs": ["niche_report.md", "decision.json (ranked scores + recommendation + the 5 keywords + competitor list for M2)"],
  "done_when": "decision.json has 3 scored candidates, one recommendation, and every score cites a live source",
  "budget_tokens": 150000, "timeout_seconds": 7200
}
```
Skills: `dossier`, `product-skills:competitive-teardown`, web search.

### G1 — Niche lock (HUMAN, deadline Jul 14 EOD)
Orchestrator posts: *"V1 recommends **[niche]** ([score]/100). Reply `go`, `swap 2`, or `swap 3`."* One word back. That's the whole decision.

### G2A — Infrastructure credentials (HUMAN)
Orchestrator posts a single checklist: domain purchased + DNS access, Railway project, Dodo Payments account with test-mode key + webhook secret, Google Search Console access, support inbox address. **None of these require a live site** — that's the point of splitting this from verification. Blocks M1/E2. (Secrets go in Railway env vars, never in chat.)

### G2B — Dodo live verification (HUMAN, begins after M1 is live)
This is Dodo's individual-merchant KYC/live-mode review. It **requires the real site as input** (processors reviewing individual applications want to see actual terms, pricing, and refund policy) — which is exactly why it's sequenced after M1 instead of bundled into G2A. Orchestrator confirms M1 is live, then you submit the live-mode application to Dodo yourself (outside this session — KYC document upload isn't something the agent does), and report status back. **G2B blocks only G3** (going live) — it never blocks E2, which builds and fully tests against G2A's test-mode credentials the entire time G2B sits in Dodo's queue. Start this the moment M1 ships; it's the most likely thing to slip your launch date, so treat the review queue as running in parallel with everything else, not after it.

### E1 — Core API engine (api_engineer, deadline Jul 20)

```json
{
  "step_id": "E1",
  "task": "Build the core Fastify API for the locked niche.",
  "constraints": [
    "Fastify + MongoDB (Mongoose) + Redis caching on hot paths. API-key auth, per-key rate limiting, usage metering events written to Mongo.",
    "Endpoints: the single primary utility function done excellently + health + usage. No speculative features.",
    "OpenAPI 3.1 spec generated from routes. Integration tests for every endpoint incl. auth failures and rate-limit behavior.",
    "Deploy to Railway staging. Seed a demo API key."
  ],
  "upstream_artifacts": ["handoffs/V1/decision.json"],
  "outputs": ["repo (./app/api)", "openapi.yaml", "test_report.md", "staging_url.txt"],
  "done_when": "all tests pass in CI log AND staging responds to an authenticated demo request",
  "budget_tokens": 250000, "timeout_seconds": 14400
}
```
Skills: `engineering-skills:senior-backend`, `engineering-advanced-skills:api-test-suite-builder`.

### M1 — Landing + SEO day zero (seo_marketer, deadline Jul 15)

```json
{
  "step_id": "M1",
  "task": "Ship the marketing site the day the niche locks — before the product exists. This site is also the required input for G2B (Dodo's live-mode review), so it must be a credible, complete product site, not a placeholder.",
  "constraints": [
    "Next.js site on the purchased domain via Railway. Required pages/sections, all real content, none stubbed: product explanation, target users, how it works, pricing, early-access signup CTA, contact details, Terms of Service, Privacy Policy, Refund Policy.",
    "Visible positioning guardrail somewhere on the homepage/product page: this is a pre-submission validation check — it does not transmit invoices, does not claim FTA accreditation, and does not replace an accredited ASP. State it plainly; this protects both the launch positioning and the Dodo verification review, which will check for overclaimed regulatory status on a compliance-adjacent product.",
    "Copy targets the 5 buy-intent keywords from decision.json and follows GTM-MARKETING-MASTER-PLAN.md's positioning (§1.2) and §8 UAE reweighting. Title/meta/OG per page, JSON-LD, sitemap.xml, robots.txt.",
    "Submit sitemap to Google Search Console. Write seo_baseline.md: keyword→page map + 8-week content plan (1 post/week, titles included).",
    "Information architecture pre-reserves /alternatives/* and /vs/* routes for M2 and /tools/* for GR1."
  ],
  "upstream_artifacts": ["handoffs/V1/decision.json", "GTM-MARKETING-MASTER-PLAN.md"],
  "outputs": ["repo (./app/web)", "live_url.txt", "seo_baseline.md", "gsc_submission.md"],
  "done_when": "site is live on the real domain, all nine required pages/sections are real content (not stubs), the positioning guardrail line is visibly present, and sitemap shows submitted in GSC",
  "budget_tokens": 180000, "timeout_seconds": 10800
}
```
Skills: `landing:landing`, `marketing-skills:copywriting`, `searchfit-seo:on-page-seo`, `marketing-skills:schema-markup`.

### E2 — Dashboard + billing (dashboard_engineer, deadline Jul 22)

```json
{
  "step_id": "E2",
  "task": "Onboarding, key management, usage display, and Dodo Payments subscriptions on the M1 Next.js app.",
  "constraints": [
    "Auth + signup → auto-provision API key. Dashboard: key CRUD, usage graph from E1's MongoDB UsageEvent metering (this is the usage source of truth — Dodo has no meter primitive), plan status.",
    "Dodo Payments (SDK `dodopayments`, `environment: 'test_mode'`): 3 tiers (free trial / $29 / $99 as defaults — adjust to V1 price data). Checkout via checkoutSessions.create(); customer portal via customers.customerPortal.create(); plan change via changePlan() with proration. Overage billed via plan tiering or on-demand charge (POST /subscriptions/{id}/charge), NOT a processor meter.",
    "Webhooks: Standard Webhooks spec — HMAC-SHA256, verify with unwrap(), idempotent on webhook-id. Handle subscription.active|renewed|updated|on_hold|failed and payment.succeeded|failed.",
    "Do NOT introduce Stripe. Gate API rate limits by plan via shared Redis config."
  ],
  "upstream_artifacts": ["handoffs/E1/openapi.yaml", "handoffs/E1/staging_url.txt", "handoffs/M1/live_url.txt"],
  "outputs": ["repo updates", "billing_test_report.md (test-mode: subscribe, upgrade, cancel, webhook replay)"],
  "done_when": "a test-mode user can sign up, pay, call the API with their key, and see usage",
  "budget_tokens": 220000, "timeout_seconds": 14400
}
```
Skills: `product-skills:saas-scaffolder`. (No Stripe skill — pull Dodo's SDK, checkout, portal, and webhook surface from live docs at docs.dodopayments.com; do not write API names from memory.)

### M2 — Comparison pages (seo_marketer, deadline Jul 23)

```json
{
  "step_id": "M2",
  "task": "Capture competitor search traffic.",
  "constraints": [
    "From decision.json competitor list: 3 '[Competitor] alternative' pages + 2 'us vs [Competitor]' pages on the reserved routes.",
    "Honest feature tables from live competitor pricing pages (fetch fresh). Lead with the gaps V1 found in their reviews.",
    "Each page: unique meta, FAQ schema, CTA to free tier."
  ],
  "upstream_artifacts": ["handoffs/V1/decision.json", "handoffs/M1/seo_baseline.md", "GTM-MARKETING-MASTER-PLAN.md"],
  "outputs": ["5 live pages", "comparison_pages.md (urls + target keywords)"],
  "done_when": "all 5 pages live and added to sitemap",
  "budget_tokens": 120000, "timeout_seconds": 7200
}
```
Skill: `marketing-skills:competitor-alternatives`.

### GR1 — Free tool funnel (growth_builder, deadline Jul 24)

```json
{
  "step_id": "GR1",
  "task": "One free browser tool that does a single-shot version of the paid API, hosted at /tools/*.",
  "constraints": [
    "Zero login. Result page shows output + 'do this programmatically' CTA with a code snippet calling the real API.",
    "Its own landing copy targeting the highest-volume informational keyword from seo_baseline.md.",
    "Rate-limit by IP via the existing Redis.",
    "High-leverage play #6 (marketing plan §2.15): give each result page a unique, cacheable, indexable URL — not a query-param or session-scoped view. Popular results become permanent public pages that compound into programmatic SEO on their own; this is a design requirement, not an optional nice-to-have."
  ],
  "upstream_artifacts": ["handoffs/M1/seo_baseline.md", "handoffs/E1/openapi.yaml", "GTM-MARKETING-MASTER-PLAN.md"],
  "outputs": ["live tool url", "free_tool.md (keyword target + funnel notes)"],
  "done_when": "tool works logged-out, links into signup, and produces a unique indexable URL per result",
  "budget_tokens": 140000, "timeout_seconds": 10800
}
```
Skill: `marketing-skills:free-tool-strategy`.

### SDK1 — Drop-in migration SDK (api_engineer, deadline Jul 24)

```json
{
  "step_id": "SDK1",
  "task": "Ship client libraries whose interface mirrors the incumbent's, so switching is a one-line import change. High-leverage play #3.",
  "constraints": [
    "Generate from E1's OpenAPI spec — don't hand-roll a divergent interface.",
    "Pull the top competitor's SDK method signatures from decision.json / M2's comparison research and mirror method names, argument order, and return shapes wherever compatible with your API's actual behavior. Never silently misrepresent behavior to force a match — a documented shim is fine, a lie is not.",
    "Ship Python + Node packages minimum (match whatever V1/decision.json shows the niche's dominant language is; add a third only if data supports it).",
    "README leads with a 'migrating from [Competitor]?' section showing the one-line diff.",
    "Publish to PyPI/npm and a public GitHub repo with 2-3 runnable examples."
  ],
  "upstream_artifacts": ["handoffs/E1/openapi.yaml", "handoffs/V1/decision.json", "handoffs/M2/comparison_pages.md"],
  "outputs": ["published packages (pypi/npm)", "github repo url", "sdk_migration_notes.md"],
  "done_when": "a fresh install of the package can complete an authenticated call against staging using an interface a [Competitor] user would recognize",
  "budget_tokens": 120000, "timeout_seconds": 10800
}
```
Skills: `engineering-skills:senior-backend`, `mcp-builder` (for the SDK/client-library patterns even though this isn't MCP itself).

### MCP1 — Agent-native access: MCP server + llms.txt (api_engineer, deadline Jul 24)

```json
{
  "step_id": "MCP1",
  "task": "Make the product natively usable by AI agents, ahead of incumbents. High-leverage play #4.",
  "constraints": [
    "Build a minimal MCP server exposing the core utility as one or two well-described tools, wrapping E1's API (auth via the same API key model).",
    "Publish a maintained llms.txt at the domain root summarizing what the product does, its API shape, and links to docs — written for LLM consumption, not human marketing copy.",
    "Ensure the OpenAPI spec from E1 is clean and publicly linked (agents and MCP directories both consume it).",
    "Submit the MCP server to at least one public MCP directory/registry once live."
  ],
  "upstream_artifacts": ["handoffs/E1/openapi.yaml", "handoffs/E1/staging_url.txt"],
  "outputs": ["mcp server repo", "llms.txt (deployed at domain root)", "mcp_submission.md"],
  "done_when": "the MCP server successfully completes one authenticated tool call against staging and llms.txt is live at the domain root",
  "budget_tokens": 130000, "timeout_seconds": 10800
}
```
Skill: `mcp-builder`.

### LEV1 — Self-referential demo page (growth_builder, deadline Jul 24)

```json
{
  "step_id": "LEV1",
  "task": "Build the 'live [niche] comparison, powered by our own API, auto-refreshed daily' page. High-leverage play #1.",
  "constraints": [
    "The page must actually call E1's live API for its data — not a hardcoded snapshot — and must say so explicitly ('data below is served live by our own API — see how: [docs link]').",
    "Auto-refresh on a schedule (daily cron via Railway) rather than requiring a manual rebuild.",
    "Reuse M2's competitor pricing/feature data as the comparison content, but the mechanism of display is the product demo.",
    "Add FAQ + schema markup per the AEO guidance in the marketing plan — this page is explicitly designed to become an AI-assistant citation source."
  ],
  "upstream_artifacts": ["handoffs/E1/staging_url.txt", "handoffs/M2/comparison_pages.md"],
  "outputs": ["live page url", "lev1_notes.md"],
  "done_when": "the page is live, pulls real data from the API on a schedule, and the 'powered by our API' claim is visibly true",
  "budget_tokens": 90000, "timeout_seconds": 7200
}
```
Skills: `marketing-skills:aeo`, `searchfit-seo:schema-markup`.

### O1 — Support + content ops (ops_agent, deadline Jul 25)

```json
{
  "step_id": "O1",
  "task": "Stand up the <5-minute support loop and the content repurposing machine.",
  "constraints": [
    "Support: pipe inbox → instant phone alert; write 10 canned first-responses covering the failure modes E1's tests exposed; runbook with escalation path and a 5-minute-response SLA during waking hours (UTC+4).",
    "Content: template that turns each docs page / blog post into an X thread, a LinkedIn post, and a Reddit-appropriate answer. Pre-fill week 1 from existing docs.",
    "Weekly cadence file the orchestrator re-triggers every Monday post-launch."
  ],
  "upstream_artifacts": ["handoffs/E1/test_report.md", "handoffs/M1/seo_baseline.md", "GTM-MARKETING-MASTER-PLAN.md"],
  "outputs": ["support_runbook.md", "canned_responses.md", "content_calendar.md", "repurpose_templates.md"],
  "done_when": "a test email to the support inbox produces an alert in under 5 minutes",
  "budget_tokens": 100000, "timeout_seconds": 7200
}
```
Skills: `engineering-advanced-skills:runbook-generator`, `marketing-skills:social-content`.

### Q1 — Ship gate (ship_gate_evaluator, evaluator loop, max 2 iterations)
Run `/engineering-advanced-skills:ship-gate` across the repo. Critical findings → file fixes back to the owning agent (E1/E2/M1/SDK1/MCP1/LEV1) and re-run. Two failed loops → halt with `handoffs/blockers.md`. Output: `ship_gate_report.md`, pass/fail.

### G3 — Launch (HUMAN, target Jul 25)
**Precondition:** Dodo individual KYC must be approved (live mode is impossible without it). Orchestrator confirms KYC status before offering the gate. Then posts: *"Ship gate passed, KYC approved. Reply `launch` to flip Dodo live + DNS."* One word.

### L1 — Post-launch loop (ops_agent, recurring weekly)
Every Monday: publish the week's post per `content_calendar.md`, repurpose it, check GSC impressions/clicks, log support response times, append to `handoffs/L1/weekly_report.md`. Surfaces the §6 week-4 checkpoint automatically.

---

## 5. Failure policy

Per step: 2 retries with exponential backoff; validate `done_when` before marking complete. On second failure the orchestrator may re-plan that step once (split it or reduce scope). After that, write `handoffs/blockers.md` with the exact blocker and halt — no silent scope drift. External-call timeouts inherit the step timeout. Global spend cap 1.5M tokens; ledger.json tracks per-step burn and the orchestrator warns at 80%.

## 6. Kill criteria (pre-agreed — the orchestrator enforces, not debates)

- **V1 gate:** no candidate scores ≥ 60/100 → halt and report. Do not build a losing niche because the sprint exists.
- **Week 4 post-launch:** fewer than 25 signups AND fewer than 500 organic impressions in GSC → orchestrator schedules a decision review with the data and three options (double down / pivot niche / kill). Defaults to nothing; forces the review.

## 7. What stays human

Four inputs (G1, G2A checklist, G2B verification status, G3 launch word) — deliberately nothing else. The G2 split exists specifically to break a real circular dependency (Dodo's live verification needs a live site, but the site build shouldn't wait on verification) — infrastructure and verification are no longer one bundled gate that could deadlock the sprint. The rest of the design holds: the only way this stalls is a missing input from you.
