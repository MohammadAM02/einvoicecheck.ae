# O1 — Weekly Cadence (re-triggered every Monday post-launch; feeds L1)

**Owner:** the operator (solo, UTC+4). **Trigger:** every Monday, post-launch.
**Time budget:** half a day for content + 30 min/day community + the Friday 20-minute row.
If it exceeds that, cut scope — the cadence surviving is worth more than any single week's asset.

The rule that makes this work: **one week, one move.** If the week doesn't end in a live URL, a
sent email, or a published post, the week didn't happen.

---

## Monday — the run sheet (L1 executes this)

### 1. Support health check (10 min) — do this FIRST
- [ ] Send the alert test: mail `[OPERATOR TO COMPLETE: support email]` from an outside address,
      phone locked and silent. **Log send time and alert time.** Delta must be < 5 minutes.
      Procedure: `support_runbook.md` §6. **This test has never passed yet — it has never been run.**
- [ ] Any ticket from last week that took > 5 min during waking hours: why? Was it a missing
      canned response? If yes, **write the new canned response now** and add it to
      `canned_responses.md`.
- [ ] Any inbound that a canned response covered badly → fix the canned response, not the customer.

### 2. Publish the week's asset (half day)
- [ ] Ship the blog post for this week from `content_calendar.md` (weeks 1–8 are already titled
      and mapped — do not re-plan, just write).
- [ ] Same day, run it through `repurpose_templates.md`:
  - [ ] LinkedIn post (**primary channel** — §8) + link in first comment
  - [ ] X thread
  - [ ] Reddit-ready answer → **save it**; deploy only when a genuinely matching thread appears.
        No thread = no post. Disclose affiliation. No astroturfing, ever.
  - [ ] Email/changelog snippet for the monthly send
- [ ] Internal link: post → exactly one money page. Guardrail sentence present. No claim of
      accreditation, transmission, or archival. **Check this before publishing, not after.**

### 3. Cold outreach block (§8 — core, not optional) (60 min)
- [ ] Add 10 UAE SMEs / corporate service providers to the list.
- [ ] Send T1 / T2 / T3 touches due this week (template: GTM §9). Plain text, one link max.
- [ ] The offer is the free check, not a call.

### 4. LinkedIn + local community block (30 min/day, all week)
- [ ] 3 LinkedIn posts this week (Mon asset repurpose + 2 compliance-calendar beats).
- [ ] UAE founder WhatsApp/Telegram groups: participate, don't pitch.
- [ ] Competitor watch: any price change, outage or changelog worth a reply? (GTM §2.15.2)

### 5. Proof harvest (10 min)
- [ ] One new piece of social proof this week. After any interaction that ended well:
      *"Mind if I quote that?"* Log the quote with a date and the customer's real words.

### 6. Friday — the dashboard row (20 min, one spreadsheet row, no BI stack)
GSC impressions · GSC clicks · visitors · email signups · **activations (first successful API
call)** · trials · paid conversions · MRR · churned · **median support response time** ·
**alert-test delta (Mon)** · content shipped Y/N · new proof quote Y/N.

---

## What L1 should escalate (don't let these slide)

| Signal | Action |
|---|---|
| Monday alert test **fails or wasn't run** | The 5-minute promise is not real this week. **Remove any "replies in minutes" claim from the site** until it passes again. Fix the pipeline before writing any content. |
| Content not shipped 2 weeks running | The cadence is dead. That is the only failure mode that actually kills this. Ship the smallest version today. |
| Activation rate < 40% (days 0–30) | **Stop marketing.** Fix docs/onboarding first — you're filling a leaking bucket (GTM §6.2). |
| Median support response > 5 min during waking hours | Alert pipeline problem or missing canned response. Diagnose which. |
| Any customer asks whether we're FTA-accredited | Answer with CR-10 **verbatim**. Never soften it to save a deal. |
| Urge to launch on HN / RapidAPI / r/webdev | Re-read GTM §8. Wrong niche. Don't. |
| Urge to buy ads | §2.13 gate: MRR ≥ $2,000 **and** known trial→paid **and** churn < 8%. All three, or no. |

## Decision gates (pre-committed — do not renegotiate at 1 a.m.)
- **Day 30:** site indexed · ≥8 content pieces live · ≥1 free tool · launch done or scheduled.
- **Day 60:** ≥1,000 organic impressions/mo trending up · ≥25 signups.
- **Day 90:** ≥25 signups AND ≥500 organic impressions → continue. Below → structured review,
  three options on paper: double down / pivot niche / kill.

## Placeholders this cadence depends on
`[OPERATOR TO COMPLETE: support email]` · `[OPERATOR TO COMPLETE: operator mobile number]` ·
`[OPERATOR TO COMPLETE: alert tooling account]` · `[OPERATOR TO COMPLETE: declared waking hours]`
Full register: `support_runbook.md` §0. Until #1 and #3 exist, **step 1 of this cadence cannot
run at all.**
