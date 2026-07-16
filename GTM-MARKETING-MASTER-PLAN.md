# GTM & Marketing Master Plan — Proven-Demand API Product

**Scope:** everything from first visitor to compounding revenue. Built for a bootstrap utility API/SaaS at $29–99/mo price points, one operator, near-zero budget, based in UAE selling globally.
**Companion docs:** `WORKFLOW-proven-demand-api.md` (steps M1, M2, GR1, O1, L1 execute parts of this plan).

---

## How to use this document

This is an operating system, not a reading assignment. The rule that makes it work: **one week, one move.** Every week you ship exactly one marketing asset (a page, a tool, a post, a launch) and run the standing cadence. If a task doesn't end with a live URL, a sent email, or a published post, it is not marketing — it's procrastination wearing a marketing costume.

Read §1–§2 once. Then live in §5 (the 90-day calendar) and §6 (the weekly dashboard). Everything else is reference for when a specific week's task needs depth.

---

## 1. Strategic foundation

### 1.1 The economics dictate the strategy — accept this first

At $29–99/mo, a customer is worth roughly $350–1,200 over their lifetime (assuming 12-month average retention). Paid channels for developer/B2B tools run $80–400 per acquisition *when professionally managed with budget to test*. You have neither the budget to find winning ads nor the LTV data to know your ceiling. Therefore:

**Your CAC must be approximately $0. Every channel in this plan compounds instead of costing.** SEO posts rank for years. Comparison pages intercept competitor demand forever. Free tools generate signups while you sleep. Community answers keep getting found and get cited by AI assistants. Paid advertising is not banned on principle — it's gated behind an unlock condition in §2.13, because until you know your trial→paid rate and churn, buying traffic is buying blindfolded.

This is exactly the model from both source posts: the $480k operator and the $5k/mo operator both explicitly rejected ads and won on compounding organic + operational speed.

### 1.2 The one message

From our positioning work — your homepage headline formula, repeated identically everywhere:

> **[What it does] for [specific audience] — [your wedge] without [the incumbent's pain point].**

Illustrative (scraping-API candidate): *"Clean, structured data from [target sites] — one simple endpoint, transparent pricing, replies from a human in minutes. No enterprise sales calls."*

Your wedge as a solo operator is always some combination of: **simpler integration, honest pricing, one narrow thing done excellently, and support speed no incumbent can match.** Never claim "more features" — you'll lose that fight. Claim the fight you win.

### 1.3 Message hierarchy (what to say, in order)

1. **Headline** — the one message (10 seconds: what, who, why you).
2. **Proof** — a live code snippet that works, response-time stat, real usage numbers once you have them ("2.1M requests served").
3. **Objection kill** — pricing transparency, no credit card for trial, "cancel anytime," rate limits stated plainly.
4. **Comparison** — "switching from [Competitor]?" link. Meet the buyer where they already are.
5. **Speed promise** — "questions answered in minutes, not days" with a visible support email.

### 1.4 Audience definition (sharpen after niche lock)

| Candidate niche | Primary buyer | Where they live online | Buying trigger |
|---|---|---|---|
| Scraping/data API | Indie devs, growth engineers, data teams at SMBs | Reddit (r/webscraping, r/webdev, r/dataengineering), HN, X, Stack Overflow, n8n/Make communities | Got blocked, got a surprise bill, incumbent's docs failed them |
| Social posting API | SaaS founders building scheduling features, agency devs, automation builders | Indie Hackers, r/SaaS, X build-in-public scene, n8n/Zapier/Make forums | Platform API pain, incumbent per-profile pricing |
| UAE compliance SaaS | Founders/ops leads at UAE SMEs, corporate service providers | LinkedIn, UAE founder WhatsApp/Telegram groups, local events, Google search in en/ar | Deadline, fine risk, new regulation taking effect |

The first two run the developer motion (this whole document as written). The third shifts channel weights significantly — see §8.

---

## 2. Channel strategy

### 2.1 Master channel portfolio

Activate in this order. Never run more than the "active" set for your phase — spreading thin is how solo operators lose to focus.

| # | Channel | Type (ORB) | Cost | Effort | Time to payoff | Activate |
|---|---|---|---|---|---|---|
| 1 | SEO (site + blog) | Owned | $0 | High | 2–6 months, then compounds | Day 0 |
| 2 | Comparison/alternative pages | Owned | $0 | Medium | 1–3 months | Week 1 |
| 3 | Free tools | Owned | $0 | Medium | 1–2 months | Week 2 |
| 4 | Docs-as-marketing | Owned | $0 | Medium | Immediate (conversion) | Day 0 |
| 5 | Communities (Reddit/HN/IH/SO) | Rented | $0 | Medium, ongoing | Immediate spikes + long tail | Week 2 |
| 6 | AEO (AI assistant citations) | Owned | $0 | Low (piggybacks on 1,2,5) | 2–4 months | Week 3 |
| 7 | GitHub SDKs + examples | Owned | $0 | Medium | 1–3 months | Week 3 |
| 8 | Directories & marketplaces | Borrowed | $0 | Low, one-time | 2–8 weeks | Week 3 |
| 9 | Product Hunt / HN launch | Borrowed | $0 | Medium, one-time | Launch-day spike + backlinks | Week 4–6 |
| 10 | Email lifecycle | Owned | ~$0–20/mo | Low after setup | Immediate (conversion) | Week 2 |
| 11 | X build-in-public | Rented | $0 | Low, ongoing | 3–6 months | Month 2 |
| 12 | Targeted cold outreach | Owned | $0 | Medium | 1–4 weeks | Month 2 (optional) |
| 13 | Support-as-marketing | Owned | $0 | Ongoing | Immediate (retention + proof) | Day 1 of first user |
| 14 | Paid ads | Rented | $$$ | High to do well | Immediate but expensive | **Gated — see §2.13** |

Phase discipline: **Days 0–30 → channels 1, 2, 4 only.** Weeks 3–6 add 3, 5, 6, 7, 8, 10. Month 2 adds 9, 11, optionally 12. Channel 13 is always on.

### 2.2 SEO — the backbone

Three keyword layers, each mapping to a page type:

**Layer 1 — Transactional (highest value, lowest volume).** "[thing] api", "[thing] api pricing", "best [thing] api 2026", "[thing] api free tier." → Homepage, pricing page, and one dedicated landing page per major use case. These pages sell; write them like sales pages with working code above the fold.

**Layer 2 — Comparison (highest conversion rate of anything you'll build).** "[Competitor] alternative", "[Competitor] pricing", "[CompA] vs [CompB]", "[Competitor] too expensive." The searcher already has budget and intent — they're unhappy with someone else. → §2.3.

**Layer 3 — Informational (volume + AEO fuel).** "how to [do the thing] in Python", "how to [do the thing] without getting blocked", "[platform] API rate limits explained", "[thing] for n8n/Zapier/Make." → Blog posts and free tools. Every single one ends with a working code snippet using *your* API — the content is the top of your funnel, the snippet is the bridge.

**Programmatic SEO (month 2+):** templated pages at scale where a pattern exists — "[Your product] for [language]" (Python/Node/PHP/Go/Ruby), "[Your product] + [automation platform]" (n8n, Make, Zapier, Pipedream), "[use case] with [your product]". 15–40 thin-but-genuinely-useful pages, each with a tailored code sample. Integration pages are criminally underrated: automation-platform users are high-intent, non-technical enough to pay rather than build, and nobody competes hard for those keywords.

**Technical hygiene (one-time, week 1):** sitemap submitted to Google Search Console + Bing Webmaster Tools, page speed >90, FAQ + SoftwareApplication schema on key pages, hub-and-spoke internal linking (every blog post links to its use-case landing page; every landing page links to pricing), clean URL structure (`/blog/`, `/vs/`, `/alternatives/`, `/tools/`, `/docs/`).

**Cadence:** one post per week, forever. Rotate formats (§3.3). Consistency beats brilliance — the operator in your source post attributed growth to boring weekly compounding, not viral hits.

### 2.3 Comparison & alternative pages — the demand thieves

For each of your top 3–5 competitors, build two page types:

- **"/alternatives/[competitor]"** — "7 best [Competitor] alternatives in 2026." List yourself first with honest reasoning, include real alternatives (honesty ranks and converts; astroturf doesn't), fetch their *live* pricing for the table, and lead with the complaints real users post in their reviews/Reddit threads (you'll have these from the validation step).
- **"/vs/[competitor]"** — head-to-head: feature table, pricing table, "choose them if / choose us if" section (genuinely conceding their strengths makes your claimed wins believable), migration guide with code diff.

Add FAQ schema to every one. Refresh pricing quarterly (stale numbers destroy trust). These pages typically become the highest-converting URLs on the entire site — treat them as products, not blog posts.

### 2.4 Free tools — engineering as marketing

The single most effective growth asset in your source posts. Design rules:

- **Zero login.** Friction kills the funnel. Capture email optionally *after* delivering the result ("email me this report").
- **Single-shot version of the paid product.** The tool does once, manually, what the API does programmatically at scale. The result page's CTA writes itself: *"Need this automated? One API call:"* followed by a live snippet with a signup link.
- **Own landing page targeting an informational keyword** with real volume ("free [thing] checker/extractor/generator/preview tool").
- **Shareable output** — a result URL that can be linked/screenshot spreads the tool for you.
- **Each tool is its own launch moment** — submit it separately to directories, PH, relevant subreddits. One product, many launches.

Cadence: one at launch (workflow step GR1), then one per month. Three good free tools within 90 days is a moat: each ranks independently, funnels independently, and earns backlinks independently.

### 2.5 Docs as marketing

Developers judge you by docs before pricing. Your docs are a marketing surface:

- **Quickstart that gets to a successful API call in under 5 minutes** — this is your activation funnel, measure it.
- Copy-paste-runnable examples in Python, JS/Node, and cURL for every endpoint.
- Honest rate-limits and error-code pages (these rank for "[product] rate limit" style searches and reduce support load).
- Public changelog — updated weekly, doubles as content (§3.3) and signals the product is alive, which matters enormously for a solo-operated API.

### 2.6 Communities — Reddit, HN, Indie Hackers, Stack Overflow, Discords

This is where dev-tool buying decisions actually form in 2026 — and where AI assistants harvest their recommendations (§2.7). Rules of engagement:

- **The 10:1 rule.** Ten genuinely helpful, zero-promo contributions for every one that mentions your product. Reddit's immune system detects and destroys anything else.
- **Answer, don't advertise.** Target threads where someone describes the exact problem you solve ("how do I…", "[Competitor] just raised prices", "getting blocked when…"). Give the complete answer *in the comment* — code included — then one line: "I build [product] which does this managed, if you'd rather not maintain it." Disclose affiliation every time.
- **Saved-search monitoring.** Set alerts (F5Bot is free) for your competitors' names + your core problem phrases across Reddit/HN. A thread complaining about a competitor is the warmest lead on the internet — answer within the hour.
- **Your own milestone posts.** The Reddit post that started all this *is that founder's marketing*. Write your own: "I built [X] to $500 MRR in 8 weeks copying proven demand — what worked" posted to r/SaaS / Indie Hackers at real milestones. Radical honesty + real numbers is the format that works.
- Stack Overflow: answer questions in your niche properly; a good answer with a relevant snippet drives qualified traffic for years.

Time-box: 30 minutes per day, in one block. Communities are the channel most likely to eat your whole day.

### 2.7 AEO — get recommended by ChatGPT, Claude, and Perplexity

In 2026 a large share of "best API for X" discovery happens inside AI assistants, not Google. You don't buy this placement — you earn citation. It piggybacks almost entirely on work you're already doing:

- **Be present in what LLMs cite:** Reddit threads (§2.6 answers get quoted), comparison articles (§2.3), directory listings (§2.8), and GitHub (§2.9) are the primary sources assistants pull from for tool recommendations.
- **Structure your own pages for citation:** clear H2/H3 question-shaped headings ("What is the cheapest [thing] API?"), factual density (state your price, limits, and latency as plain declarative facts — LLMs cite specifics, not vibes), a maintained `/llms.txt`, and schema markup.
- **Publish one canonical data page:** "The [niche] API landscape, 2026: pricing and limits compared" — a genuinely comprehensive, honest reference table. Pages like this become *the* cited source for a whole category of AI answers.
- **Track it:** monthly, ask ChatGPT/Claude/Perplexity your 5 money questions ("best [thing] API", "[Competitor] alternatives"…) and log whether you appear. It's your AEO dashboard, costs 10 minutes.

### 2.8 Directories & marketplaces (one afternoon, week 3)

Submit once, benefit forever — backlinks, referral trickle, and AEO source material: RapidAPI (real distribution — API buyers search there with wallets open; accept their rev share for that channel), AlternativeTo (critical — feeds every "alternatives" AI answer), SaaSHub, Product Hunt (as launch, §2.10), G2/Capterra (once you have 5+ users to review you), n8n/Make/Zapier community-integration listings if applicable, plus 5–10 niche dev-tool directories. Keep a spreadsheet; refresh listings when pricing changes.

### 2.9 GitHub as a channel

Publish official SDK wrappers (`yourproduct-python`, `yourproduct-node`) plus 2–3 example repos solving a real task in <50 lines ("Monitor [thing] and post to Slack"). READMEs rank in Google, repos get cited by AI assistants, and devs trust code more than copy. Add the GitHub topic tags for your niche. This is 1–2 days of work that functions as permanent distribution — and the workflow's engineers can generate the SDKs from your OpenAPI spec almost for free.

### 2.10 The launch — Product Hunt + Show HN (week 4–6, not day 1)

Launch *after* the funnel works (docs solid, onboarding smooth, free tool live) — a launch pours water into whatever bucket exists; make sure yours isn't leaking. Structure it with the ORB model:

- **Owned ready first:** email capture live for 2+ weeks pre-launch, launch-day email drafted, site conversion-checked.
- **Borrowed prepared in advance:** PH — real preview assets, first-comment written (your story: "I copied proven demand instead of inventing; here's the method"), 10–15 friends/community contacts pre-warned to engage genuinely in the first 2 hours (engagement velocity decides visibility). Show HN the same week, different day — title format "Show HN: [Product] – [plain description]"; HN rewards technical honesty and punishes marketing-speak.
- **Post-launch 30 days:** this is where launches are won — badge on site, "launch retro with real numbers" post (Indie Hackers + r/SaaS love these), convert launch-day signups with the email sequence, pitch 2–3 niche newsletters with your launch numbers as the hook.

Expect a spike, then a trough. The point of launching isn't the spike — it's backlinks, directory presence, AEO source material, and the retro content.

### 2.11 Email lifecycle (set up once, week 2)

Cheap tool (Resend/Loops/Buttondown tier: $0–20/mo). Two assets:

- **Onboarding sequence (5 emails):** Day 0 welcome + the 5-minute quickstart link; Day 1 the single most valuable use case with complete code; Day 3 "switching from [Competitor]?" migration guide; Day 7 social proof + pricing nudge before trial ends; Day 10 founder email, plain text: "What were you trying to build? I read every reply." (This last one converts *and* is your product-research engine.)
- **Monthly changelog email** to all users + captured leads. Retention is marketing — churn reduction compounds exactly like SEO does.

### 2.12 X build-in-public + LinkedIn (month 2+, 3 posts/week max)

X: the indie SaaS/dev audience lives here. Post revenue milestones with real numbers, mini-lessons from support tickets, before/after code snippets, free-tool launches. It's a slow-compounding credibility asset, not a traffic firehose — treat it as your public track record. LinkedIn: low priority for the dev niches; **primary channel** for the UAE compliance niche (§8).

### 2.13 Paid ads — the gate

Locked until **all three** are true: MRR ≥ $2,000, you know your trial→paid rate, and monthly churn < 8% (so LTV is calculable). Then, and only then: $300/month test on 2–4 *exact-match, bottom-intent* Google Search terms only ("[competitor] alternative", "[thing] api") with a dedicated landing page, and judge on 60 days of data. Never Meta, never display, never "awareness" — at your price point they're bonfires. If the test's CAC > 3 months of revenue, kill it and put the $300 into another free tool. Write this gate down and don't renegotiate it with yourself at 1 a.m.

### 2.14 Support-as-marketing + the proof engine

Both source posts credit support speed as the actual moat. Operationalize it: inbox → phone alert, <5-minute replies during waking hours (UTC+4 is genuinely an advantage — you're awake when US automations break overnight and Asia is working). Then convert every great interaction into proof: after each solved ticket or happy reply, one ask — "mind if I quote that?" or a G2/Trustpilot link. Target: one new piece of social proof per week. A wall of specific, dated, real quotes ("migrated from [Competitor] in 20 minutes, support answered in 4") outperforms any ad you could ever buy.

### 2.15 High-leverage plays (the asymmetric layer)

These sit **on top of** §2.1–2.14 — they are multipliers, and multipliers times zero is zero. Don't reach for these before the base engine (site, SEO, comparison pages, support) is live. Three of the eight are build tasks wired into the Codex workflow directly (steps SDK1, MCP1, LEV1 in `WORKFLOW-proven-demand-api.md`); the other five are ops/content moves you run once the funnel exists.

1. **The marketing page that IS the demo.** Build "live [niche] pricing/data comparison, auto-refreshed daily," powered by your own API, with a visible line saying so. It ranks, feeds AI-assistant answers in the category (§2.7), and demonstrates the product in the same breath — self-referential enough that communities share it unprompted. *(Build task — see workflow step LEV1. The page itself is written up as content once M2's comparison pages exist.)*

2. **Harvest competitor failure moments systematically.** Monitor competitor status pages, pricing pages, and changelogs (a free uptime-monitor + RSS/diff watch is enough). Pre-write the migration guide and the Reddit reply *before* an incident happens. When a competitor hikes prices or goes down, you're in the thread within minutes while everyone else is asleep. Bonus: a public "[Competitor] status & pricing history" page (reuse the free-tool pattern from §2.4) ranks for "[competitor] down" and meets their users at peak frustration. *(Ops move — set up the watch list in week 3–4, alongside the directory blitz.)*

3. **Delete switching cost with a drop-in SDK.** Ship a client library whose interface mirrors the incumbent's — "change one import line, keep your code." Migration friction is most incumbents' only real moat; removing it makes comparison pages convert on contact instead of just informing. *(Build task — see workflow step SDK1.)*

4. **Go agent-native before they do.** Ship an MCP server for your API plus a maintained `llms.txt` and a clean OpenAPI spec. AI agents are a real 2026 buyer persona and MCP directories are still uncrowded — "works natively with Claude/agents" costs about a day of engineering and most incumbents haven't shipped it. *(Build task — see workflow step MCP1.)*

5. **Turn your data exhaust into unfakeable content.** Your API sees things nobody else sees. A quarterly original-data report ("we analyzed 1M [X], here's what changed") earns backlinks and AI citations no competitor can copy, because they don't have your data. *(Content move — first one due around week 12–13, once you have 90 days of usage data.)*

6. **Let users generate your SEO.** Design the free tool (§2.4) so popular results become cached, indexable public pages with unique URLs. Users create programmatic SEO pages for you at a scale you could never write by hand. *(Design decision — bake into GR1's free-tool build, and any month-2+ free tools.)*

7. **Rent trust instead of building audience.** Offer a 25–30% recurring rev-share to n8n/Make template creators and automation-focused YouTubers whose audience is exactly your buyer. You skip years of audience-building and only pay on results. *(Ops move — month 2+, once you have a stable product to point them at.)*

8. **The meta-move.** The Reddit post that started this whole plan *is that founder's marketing* — it worked on you; you're in his funnel right now. Your own documented journey running this exact method is the same weapon. Every milestone post (§3.2 pillar 4) is simultaneously proof, content, and distribution — this isn't a separate task, it's a lens on content you're already producing.

---

## 3. The content engine

### 3.1 The decision rule for every piece

**Searchable** (keyword volume + buyer intent exists) → build it into a cluster, judge on rankings/conversions over months. **Shareable** (no volume, but a distribution hook — real numbers, contrarian take, original data) → plan the launch channel *before* writing, judge on first-week reach. **Both** → best ROI, prioritize. **Neither** → don't write it. Kill any idea that fails this test, however fun it sounds.

### 3.2 Four content pillars

1. **Do the thing** — how-tos and tutorials for your core problem (searchable; Layer 3 keywords; every post ends in your snippet).
2. **Choose the tool** — comparisons, alternatives, the landscape data page (searchable + AEO; highest conversion).
3. **Integrate it** — language/platform/automation-tool guides, programmatic pages (searchable; long tail; high intent).
4. **Behind the business** — build-in-public milestones, launch retros, "what I learned from 100 support tickets" (shareable; drives community reach, links, and trust).

### 3.3 Weekly production cadence — one asset, six outputs

Each week produce ONE primary asset (rotate: pillar-1 tutorial → pillar-2 comparison → pillar-3 integration guide → pillar-4 milestone post → repeat), then run it through the repurposing pipeline the same day:

| Output | Where | Effort |
|---|---|---|
| The post itself | Your blog | The main work |
| X thread (6–10 tweets) | X | 15 min |
| LinkedIn version | LinkedIn | 10 min |
| dev.to / Hashnode crosspost | dev.to (canonical URL → your blog) | 10 min |
| Reddit-ready answer | Saved, deployed when a matching thread appears | 10 min |
| Email snippet | Next changelog/newsletter | 5 min |

The changelog is bonus content that writes itself: every meaningful ship gets 3 lines in `/changelog`, tweeted, and included in the monthly email. Total content time budget: **one focused half-day per week.** If it's taking more, you're polishing instead of publishing.

---

## 4. Launch sequence summary

Pre-launch (weeks 1–3): funnel built, email capture live, borrowed-channel prep. Launch window (weeks 4–6): PH + Show HN in the same week, all owned channels firing, founder in the comments all day. Post-launch (30 days): retro post with numbers, newsletter pitches, convert the spike via email sequence, submit everywhere you haven't yet. Details in §2.10.

---

## 5. The 90-day calendar

Standing weekly cadence from Week 2 onward, non-negotiable: **1 content asset + repurposing (half-day) · 30 min/day community block · support <5 min · Friday 20-min dashboard review (§6).**

| Week | The one move | Also ships via workflow |
|---|---|---|
| 1 | Site + pricing + docs quickstart live, GSC submitted, schema on | M1 |
| 2 | Email capture + onboarding sequence; first blog post | E1 progressing |
| 3 | Directory blitz afternoon (RapidAPI, AlternativeTo, SaaSHub, 5 niche); first 2 comparison pages | M2 |
| 4 | Free tool #1 live with own landing page | GR1 |
| 5 | **Product Hunt + Show HN launch week** | Q1 passed, G3 |
| 6 | Launch retro post (IH + r/SaaS); support alerting hardened | O1/L1 |
| 7 | Comparison pages 3–5; refresh live pricing data | |
| 8 | GitHub: Python + Node SDKs + 1 example repo published | |
| 9 | The landscape/data page ("[niche] APIs compared, 2026") — your AEO anchor | |
| 10 | Free tool #2; submit it everywhere separately | |
| 11 | Programmatic batch #1: 10–15 integration/language pages | |
| 12 | First build-in-public milestone post with real numbers; first AEO check (log AI-assistant answers) | |
| 13 | **Day-90 review (§6.3): double down / adjust / kill decision** | |

### Anti-rabbit-hole guardrails (written for you specifically)

1. Max **2 active channels in the first 30 days.** Every additional channel halves your effectiveness on all of them.
2. The one-week-one-move rule outranks every new idea. New ideas go in a `later.md` file, reviewed monthly, not acted on Tuesday at midnight.
3. **Publish at 80% quality.** A live mediocre page gathers data and can be improved; a perfect draft earns nothing.
4. No new tools, no rebrands, no "quick redesigns," no analytics deep-dives before day 90. These are the classic solo-founder escape hatches from the scary work (talking to strangers and shipping publicly).
5. If you catch yourself researching instead of shipping for more than one day: ship the smallest version of whatever you were researching, that same day.

---

## 6. Measurement

### 6.1 Weekly dashboard (Friday, 20 minutes, one spreadsheet row)

GSC impressions & clicks · site visitors (Plausible/GA4) · email signups · **activations (first successful API call)** · trials started · paid conversions · MRR · churned · median support response time · content shipped Y/N. That's it. Do not build a BI stack; the row is the dashboard.

### 6.2 The metric that matters per phase

Days 0–30: **activation rate** (signup → first successful call). If <40%, fix docs/onboarding before doing any more marketing — you'd be filling a leaking bucket. Days 30–60: **signups/week trend** and which channel drives them (ask "where did you find us?" in onboarding email — one question, priceless attribution). Days 60–90: **trial→paid rate and MRR slope.**

### 6.3 Decision gates (pre-committed, from the workflow's kill criteria)

- **Day 30:** site indexed, ≥8 pieces of content live, ≥1 free tool, launch done or scheduled. If not → the problem is execution, not strategy; recommit to the calendar.
- **Day 60:** ≥1,000 organic impressions/mo trending up, ≥25 total signups. Below both → diagnose (positioning? niche? activation?) with the actual funnel data before changing anything big.
- **Day 90:** ≥25 signups AND ≥500 organic impressions (workflow §6 threshold) → continue and consider the §2.13 paid unlock path. Below → structured review with three options on paper: double down / pivot niche / kill. The review happens with the data in front of you — not as a feeling at 2 a.m.

---

## 7. Budget & tool stack

| Item | Tool | $/mo |
|---|---|---|
| Hosting | Railway | ~$5–20 |
| Domain | Namecheap/Cloudflare | ~$1 |
| Analytics | Plausible ($9) or GA4 ($0) | 0–9 |
| Search consoles | Google + Bing | 0 |
| Email | Resend/Loops/Buttondown free tier | 0–20 |
| Billing | Stripe (% of revenue only) | 0 fixed |
| Support | Plain email + phone push (upgrade to Crisp free tier later) | 0 |
| Community monitoring | F5Bot | 0 |
| Scheduling (optional, month 2) | Buffer free tier | 0 |
| **Total** | | **≈ $15–50/mo** |

Paid ads budget: $0 until the §2.13 gate opens. Design/assets: your existing Canva. Everything else is your time — which is why §5's time-boxing *is* the budget plan.

---

## 8. Niche adaptations

**Scraping/data API or social-posting API:** run this document exactly as written. Weights: SEO 35%, comparison pages 20%, free tools 15%, communities 15%, AEO/GitHub/directories 15%.

**UAE compliance SaaS — significant reweighting:** the buyer is a founder/ops lead, not a developer, and the market is geographic. LinkedIn becomes the primary rented channel (founder-voice posts on regulation changes, deadlines, fines — 3×/week; the compliance calendar IS the content calendar). Cold outreach moves from optional to core: build a list of UAE SMEs/corporate-service providers, 3-touch personalized email sequence, offer a free compliance health-check (that's your "free tool" equivalent — a checker/calculator scoring their exposure). SEO still matters but localizes: "[regulation] deadline 2026", "[requirement] UAE", bilingual en/ar pages. Add: local founder communities (WhatsApp/Telegram groups, in-person events — Abu Dhabi/Dubai's startup scene is small and warm-intro-driven, an unfair advantage you have and global competitors don't). Drop: HN, RapidAPI, most of Reddit. Keep: comparison pages, email lifecycle, support speed, PH launch (still worth it for backlinks), the 90-day cadence structure.

---

## 9. Appendix — templates

**Reddit answer template:** [Direct, complete answer to their actual question, 3–6 sentences] + [working code block if relevant] + "FWIW I build [product] which handles this managed ([one-line what it is]) — but the above works fine if you'd rather roll it yourself." *Never lead with the product. Never post it where the answer doesn't genuinely fit.*

**Cold email (compliance niche), 3 touches:** T1 — "Noticed [company] is [specific observable fact]. [Regulation] applies from [date]; most [type] firms we check are missing [common gap]. Want a free 5-minute check? No call needed — I'll email the result." T2 (+3 days) — the value-only follow-up: one genuinely useful fact about the deadline, no ask. T3 (+4 days) — "Closing the loop — if [problem] is handled, ignore me. If not, here's the check link." Plain text, no images, one link max.

**PH first comment skeleton:** the story (copied proven demand, not a novel idea) → what it does in one line → the honest limitation → what's next → a genuine question to the community. Vulnerability + specificity wins PH comments.

**"Where did you find us?" onboarding question:** one-line reply-to-this email question at the end of the Day-0 welcome email. Tally the answers in your dashboard row. This free attribution beats any tracking pixel you could configure.

**The founder Day-10 email:** "Hey — I'm [name], I built [product]. What were you trying to build when you signed up? I read and answer every reply." Send it plain-text from your real address. It converts fence-sitters, surfaces roadmap gold, and starts the relationships that become testimonials.

---

*Final note: this plan's entire edge is consistency, not cleverness. The operators in your source posts won with boring weekly compounding plus absurd support speed. The strategy is now written; the only remaining variable is whether Week 1 happens this week.*
