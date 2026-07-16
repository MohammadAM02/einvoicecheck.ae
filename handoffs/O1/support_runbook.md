# O1 — Support Runbook (einvoicecheck.ae)

**Product:** UAE e-invoice **preflight validation API**.
**Operator:** one person, based in the UAE (UTC+4). There is no team, no on-call rota, no night shift.
**Billing:** Dodo Payments (merchant of record). All billing/refund questions route to the Dodo dashboard.

**Positioning guardrail — must appear in any customer-facing reply where scope is even
slightly in question:** we do preflight validation only. We are **not FTA-accredited**, we do
**not transmit legal e-invoices**, we do **not replace an accredited service provider**, and we
provide **no statutory archival**. We check your invoice *before* it goes to your accredited
provider, so it doesn't get rejected there.

---

## 0. Placeholder register (nothing below is invented — fill these in before go-live)

| # | Placeholder | Used in | Status |
|---|---|---|---|
| 1 | `[OPERATOR TO COMPLETE: support email]` | site footer, docs, 401/429 error bodies, every canned response signature | **NOT PROVISIONED** |
| 2 | `[OPERATOR TO COMPLETE: operator mobile number]` | alert push/SMS destination | not provisioned |
| 3 | `[OPERATOR TO COMPLETE: alert tooling account]` (Pushover / Gmail+Twilio / Zapier — see §2) | alert pipeline | not provisioned |
| 4 | `[OPERATOR TO COMPLETE: operator full name]` | signature line | not provisioned |
| 5 | `[OPERATOR TO COMPLETE: status page URL, if any]` | incident replies | not provisioned |
| 6 | `[OPERATOR TO COMPLETE: Dodo Payments merchant dashboard URL]` | billing escalation | not provisioned |
| 7 | `[OPERATOR TO COMPLETE: declared waking hours]` (default assumed 07:00–23:00 UTC+4) | SLA banner | not confirmed |

Do **not** publish any of these as a guess. Every one is a real-world fact only the operator has.

---

## 1. The loop we are building

```
customer emails [OPERATOR TO COMPLETE: support email]
        │
        ▼
  mail provider (inbox)
        │  forwarding / filter rule fires on arrival
        ▼
  alert bridge  ──►  PUSH NOTIFICATION on operator's phone (sound = critical, bypasses silent)
        │
        ▼
  operator opens mail on phone, replies from a canned response (canned_responses.md)
        │
        ▼
  target: first human reply < 5 minutes during waking hours
```

The only thing that makes a solo operator competitive on support is *latency*. The canned
responses exist so that the median reply is a 30-second paste-and-edit, not a 20-minute
investigation.

---

## 2. Alert pipeline — three cheap options, honest trade-offs

### Option A — Mail filter → **Pushover** (RECOMMENDED)
Inbox rule forwards every new support mail to a Pushover email-to-push address; Pushover
delivers a push to the phone with an **Emergency priority** sound that ignores Do Not Disturb.

- Cost: **$5 one-time per platform**, no subscription.
- Latency: seconds. Push, not SMS — no carrier queue.
- Setup: ~20 minutes. No code, no server, no webhook to keep alive.
- Trade-offs: depends on the phone having data/wifi; if the Pushover app is force-killed by
  battery optimisation, delivery is delayed (fix: whitelist it from battery optimisation).
  Also depends on the mail provider actually firing forwarding rules promptly — most do within
  seconds, but this is the untested link (see §6).

### Option B — Mail filter → forwarding to SMS gateway (Twilio / carrier email-to-SMS)
Inbox rule forwards to a small function (or Zapier/Make Zap) that fires a Twilio SMS.

- Cost: ~$1/mo number + ~$0.03/SMS in the UAE; Zapier free tier caps at 100 tasks/mo and
  polls on a **15-minute** cycle on the free plan — which **breaks the 5-minute SLA outright**.
  So this option realistically needs either a paid Zapier tier or a small self-hosted webhook.
- Latency: SMS is seconds *if* triggered instantly; 15 min if triggered by free-tier polling.
- Trade-offs: most moving parts, most ongoing cost, another thing that can silently stop
  working. Its one real advantage: SMS lands even with no data connection.

### Option C — Phone mail app with per-sender/per-folder push (no third party at all)
Route support mail into its own inbox/label and enable high-priority push in the phone's
native mail client (Gmail "high priority only" / Apple Mail VIP + notification sound).

- Cost: **$0**. Zero new accounts.
- Latency: push-enabled IMAP is usually seconds; but some clients fall back to periodic
  fetch (5–15 min) depending on OS battery policy. That is exactly the failure mode that
  quietly destroys a 5-minute SLA — you don't find out, you just answer late.
- Trade-offs: cheapest and simplest, least *guaranteed*. Fine as a **backup channel**, not as
  the primary.

### Recommendation
**Option A (Pushover).** It is the only one of the three that is simultaneously (a) one-time
cheap, (b) genuinely instant, (c) able to override silent/DND — which is the whole point of a
5-minute promise — and (d) has no polling tier that silently degrades. Run **Option C as a
redundant second path** (it costs nothing and covers a Pushover outage). Skip Option B unless
SMS-without-data becomes a real need.

---

## 3. SLA — what we actually promise (honest)

| Window (UTC+4) | Promise | Published wording |
|---|---|---|
| Waking hours, `[OPERATOR TO COMPLETE: declared waking hours]` (working assumption 07:00–23:00) | **First human reply within 5 minutes.** Not a resolution — a real human acknowledging with the likely cause and next step. | "Email us — a human replies in minutes during UAE business hours." |
| Outside waking hours (assume ~23:00–07:00 UTC+4) | **No 5-minute promise.** Mail is queued; first reply on waking. Realistic worst case: **up to 8 hours**. | "Outside those hours we reply first thing the next morning UAE time." |
| Operator unavailable (travel, illness, offline) | Auto-responder states the honest expected delay and points to `/docs` + the error-code reference. | See §5. |

**We do not offer 24/7 support and must never say or imply that we do.** One person cannot.
The competitive claim is *speed while awake*, not *coverage*. UTC+4 is genuinely useful here:
we are awake while US pipelines break overnight and while Asia is mid-working-day — say that,
don't overclaim beyond it.

**No uptime/response SLA is contractually guaranteed on the $0 tier.** Paid tiers get the same
5-minute waking-hours target as a *stated intent*, not a credit-backed contractual SLA — do not
write "SLA" into paid plan copy without deciding what the credit is.

---

## 4. Triage & escalation path

**Step 1 — Classify within 60 seconds.** Every inbound falls into exactly one bucket:

| Bucket | Signal | Action | Target |
|---|---|---|---|
| **A. Self-inflicted / expected 4xx** | 401, 429, malformed body, validation errors the customer disagrees with | Paste the matching canned response (`canned_responses.md` CR-01..CR-09). No investigation needed. | < 5 min, resolved in one reply |
| **B. Scope / positioning** | "are you FTA-accredited?", "can you replace my ASP?", "does this file my invoice?" | CR-10 verbatim. **Never soften the guardrail to keep a sale.** | < 5 min |
| **C. Billing** | charge, refund, cancel, invoice for the subscription | Reply, then act in the **Dodo Payments** merchant dashboard (`[OPERATOR TO COMPLETE: Dodo Payments merchant dashboard URL]`). Dodo is merchant of record; refunds are issued there. | < 5 min ack, < 24h action |
| **D. Suspected product bug** | validator flags a file the customer can show is correct per PINT AE; or a 5xx | Escalate to §4-Step-2. Ack immediately, do not guess. | < 5 min ack |
| **E. Outage** | /health failing, multiple reports, 5xx across customers | §4-Step-3. | Immediate |

**Step 2 — Bug escalation (self-escalation; there is nobody above you).**
1. Ask for the **exact request payload** (redacted TRNs are fine) and the **`ENG-*` rule code**.
2. Reproduce against the same rule module locally. The engine is deterministic (E1 test: same
   input → identical JSON), so a non-reproducible report means the payload differs — ask again.
3. If the rule is genuinely wrong: tell the customer *within the same day* that it's ours, give
   the workaround, and ship the fix. A rule bug in a compliance tool is a trust event, not a
   ticket. Log it in the changelog.
4. If the rule is right and the customer is wrong: say so plainly, cite the spec ref carried in
   the error (e.g. `ENG-VAT-04/BR-S`), and give the exact fix.

**Step 3 — Outage.** Check `GET /health` (reports Mongo + Redis status). If either is down:
post the honest status, reply to every open thread with the same sentence, fix, then send a
one-paragraph post-mortem to anyone who wrote in. Do not go quiet — silence is the only
unrecoverable support failure for a solo product.

**Step 4 — Proof harvest (support-as-marketing).** After any interaction that ends well, one
ask: *"Mind if I quote that on the site?"* Target one new quote per week. Feeds L1.

---

## 5. Out-of-hours auto-responder (draft — honest, no 24/7 implication)

> Thanks for writing — this is a one-person operation in the UAE (UTC+4), and it's currently
> outside my working hours. I'll reply first thing in the morning, UAE time.
>
> If you're blocked right now, these usually solve it faster than I can:
> • Error-code reference: https://einvoicecheck.ae/docs
> • 401 → your API key is missing or wrong; 429 → you're over your plan's rate limit, check `Retry-After`.
>
> Reminder on scope: einvoicecheck.ae is **preflight validation only**. We are not FTA-accredited,
> we don't transmit legal e-invoices, and we don't replace your accredited service provider.

---

## 6. OUTSTANDING — the <5-minute alert test is **UNVERIFIED**

The O1 contract's literal `done_when` is: *"a test email to the support inbox produces an alert
in under 5 minutes."*

**This could not be verified in this session, and I am not going to pretend otherwise.** There
is no support inbox (it is not provisioned), no alert-tooling account, no phone number, and no
credentials. Nothing was sent, nothing was received, nothing was timed. **The pipeline above is
a design, not a tested system.**

### Exact verification procedure for the operator (run once the inbox exists)

1. Provision the support mailbox → record it as placeholder #1 everywhere it appears.
2. Create the Pushover account (Option A), install the app, **whitelist it from battery
   optimisation**, and set the einvoicecheck application to **Emergency priority** with a
   distinct sound.
3. In the mail provider, add a rule: *all incoming mail* → forward to the Pushover
   email-to-push address. (Verify the forwarding address, if the provider requires confirmation.)
4. Put the phone in its normal everyday state: screen locked, silent/DND on, in your pocket.
5. From a **different** address, send a test mail with subject `ALERT TEST 1` and note the
   send timestamp to the second.
6. Note the timestamp on the push notification. **PASS = delta < 5 minutes.** Record both
   timestamps.
7. Repeat twice more: once at night (DND active — confirms the override actually works), once
   with the phone on mobile data only.
8. Re-run this test **monthly**. Silent alert-pipeline decay is the single most likely way the
   5-minute promise dies.
9. Only after a PASS on step 6 may the site publish any "replies in minutes" claim. Until then,
   **do not publish the speed promise** — an unmet support promise is worse than no promise.

Log results here:

| Date | Test | Send time | Alert time | Delta | Pass? |
|---|---|---|---|---|---|
| | ALERT TEST 1 | | | | **NOT RUN** |
| | ALERT TEST 2 (night/DND) | | | | **NOT RUN** |
| | ALERT TEST 3 (mobile data) | | | | **NOT RUN** |
