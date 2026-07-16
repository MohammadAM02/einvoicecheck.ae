# O1 — Content Calendar (8 weeks)

**Source of truth for titles:** `handoffs/M1/seo_baseline.md` §3 (and `app/web/src/lib/posts.ts`).
**Nothing here invents a new plan** — this is M1's 8-week plan with the repurposing outputs
attached to each week, reweighted per `GTM-MARKETING-MASTER-PLAN.md` **§8 (UAE compliance
niche)**.

## Channel weighting — UAE compliance niche (§8, binding)

This is **not** the generic dev-tool grind. §8 explicitly reweights:

| Channel | Weight | Why |
|---|---|---|
| **LinkedIn (founder voice)** | **Primary rented channel — 3 posts/week** | The buyer is a UAE finance/ops lead or founder, not a Hacker News reader. |
| **SEO / blog (localized)** | Backbone, 1 post/week | Deadline-driven queries: "e invoicing UAE", "PINT AE validation". |
| **Cold outreach to UAE SMEs / corporate service providers** | **Core, not optional** | 3-touch sequence; the free validator IS the "free compliance health-check". |
| Local founder communities (WhatsApp/Telegram, in-person Dubai/AD) | High | Small, warm-intro-driven, an advantage a global competitor cannot buy. |
| Comparison pages (`/vs/*`, `/alternatives/*`) | Keep | M2 already shipped these. |
| **X / Twitter** | **Secondary** | Kept for build-in-public credibility + AEO source material, not lead gen. |
| **Reddit** | **Reduced** | §8 says drop most of Reddit. We keep a *narrow* practice: answer only genuinely matching UAE/e-invoicing/PINT threads. Rules in `repurpose_templates.md`. |
| **HN, RapidAPI** | **Dropped** | §8. Do not spend a week on them. |
| Paid ads | **Locked** (§2.13 gate) | MRR ≥ $2k + known trial→paid + churn < 8%. |

Guardrail on every asset, no exceptions: **preflight validation only — not FTA-accredited, does
not transmit legal e-invoices, does not replace an accredited service provider, no statutory
archival.** Every post links to exactly one money page. No post claims accreditation,
transmission or archival.

---

## The 8 weeks

Legend: **X** = X thread · **LI** = LinkedIn post · **RD** = Reddit-ready answer (deployed only
when a real matching thread appears — never posted cold) · **CE** = cold-outreach angle.

### Week 1 — PRE-FILLED (see `repurpose_templates.md` for the finished drafts)
- **Post:** *E-invoicing in the UAE: what actually changes for your finance system*
- **Keyword:** `e invoicing UAE` (1,000/mo) · **Intent:** informational pillar
- **Links to:** `/` and `/tools/uae-e-invoice-validator`
- **X:** 8-tweet thread — "what actually changes, field by field" ✅ drafted
- **LI:** founder-voice post — "the file breaks, not the filing" ✅ drafted
- **RD:** answer for "does UAE e-invoicing mean I need new software?" ✅ drafted
- **CE:** T1 cold email — "your invoices will be checked against PINT AE from [date]; free check, no call"
- **Also this week:** support alert pipeline live + **the alert test in `support_runbook.md` §6 actually run**

### Week 2
- **Post:** *The 12 UAE e-invoice errors that get files rejected (and how to fix each one)*
- **Keyword:** `e invoicing UAE` · informational
- **Links to:** `/tools/uae-e-invoice-validator`, `/docs`
- **Raw material is already written:** this post is `canned_responses.md` CR-04 → CR-08 turned
  outward. The rule families (TRN, VAT, LINE, TOT, CUR) *are* the 12 errors. Do not re-research.
- **X:** thread = one tweet per error family, each with the exact fix
- **LI:** "The five things that get a UAE e-invoice rejected are all boring. That's the good news."
- **RD:** the canonical "why was my invoice rejected" answer
- **CE:** T2 value-only follow-up — send the error list, no ask

### Week 3
- **Post:** *"FTA approved accounting software in UAE": what that phrase does and does not mean*
- **Keyword:** `FTA approved accounting software in UAE` (480/mo) · commercial
- **Links to:** `/alternatives/cleartax`
- **Note:** this post is the guardrail *as content* — accreditation applies to service
  providers, not to every tool. It is the single most honesty-dependent post in the eight, and
  the one most likely to be cited by AI assistants. Say plainly that we are not accredited.
- **X:** thread on the accreditation misconception · **LI:** same, founder voice (this one will
  travel on LinkedIn — it's a fear-and-confusion topic for UAE finance leads)
- **CE:** T3 close-the-loop

### Week 4
- **Post:** *PINT AE validation rules, explained field by field*
- **Keyword:** `PINT AE validation` (90/mo) · informational, highest-conversion technical term
- **Links to:** `/tools/pint-ae-validator`, `/docs`
- **X:** thread mapping BT-31 / BT-48 / BT-106 / BT-110 / BT-5+BT-6 to plain English
- **LI:** lighter version for the finance-lead audience
- **RD:** the go-to reply for any PINT AE schema thread
- **Also:** free tool #1 launch moment (GR1) — each tool is its own launch

### Week 5
- **Post:** *How to validate a UAE e-invoice in your CI pipeline (GitHub Actions example)*
- **Keyword:** `UAE e invoicing API` (210/mo) · transactional
- **Links to:** `/docs`, `/pricing`
- **X:** the code, in full, as a thread · **LI:** de-technicalised ("catch it before your
  provider does") · **RD:** genuinely useful CI answer
- **Note:** this is the one week the developer audience is the primary target. Weight X higher
  than LinkedIn for this post only.

### Week 6
- **Post:** *What UAE e-invoicing software actually costs in 2026*
- **Keyword:** `UAE e invoicing software` (590/mo) · commercial
- **Links to:** `/pricing`, `/vs/cleartax`
- **Note:** honest pricing table including competitors. Billing on our side is **Dodo Payments**
  (merchant of record) — that's the only billing fact that belongs in customer-facing copy.
- **X / LI:** the price table as an image + the honest "here's who is cheaper than us and when
  you should buy them"
- **Also:** launch retro post (per §5 week 6) + support alerting hardened

### Week 7
- **Post:** *UAE TRN format: how to validate a Tax Registration Number before you invoice*
- **Keyword:** `e invoicing UAE` long tail · informational
- **Links to:** `/tools/trn-format-checker`
- **Content already exists:** CR-04. 15 digits, no letters, leading-zero loss in spreadsheets.
- **LI:** this is the highest-shareability LinkedIn post of the eight — every UAE finance person
  has been burned by a spreadsheet eating a leading zero.

### Week 8
- **Post:** *Preflight vs transmission: why your accredited provider is not enough on its own*
- **Keyword:** `UAE e invoicing API` · commercial (positioning)
- **Links to:** `/pricing`, `/waitlist`
- **Note:** this is CR-10 as a blog post. It must be *more* honest than a sales page, not less:
  lead with what we are not. The persuasion comes from the honesty, not despite it.
- **X / LI / RD:** all three, all carrying the guardrail verbatim.

---

## Standing weekly cadence (every week, non-negotiable)

- 1 content asset + same-day repurposing → **half a day, total**
- 30 min/day community block (LinkedIn engagement + UAE groups; Reddit only on real matches)
- Support: <5 min first reply during waking hours (`support_runbook.md`) — **subject to the
  alert test actually passing**
- Friday: 20-minute dashboard row (§6.1)
- Monday: the L1 cadence run (`weekly_cadence.md`)

## What we deliberately are NOT doing

Hacker News. RapidAPI. r/webdev. Show HN. Generic dev-community grinding. §8 drops them for this
niche and we are not going to quietly re-add them because they feel like progress.
