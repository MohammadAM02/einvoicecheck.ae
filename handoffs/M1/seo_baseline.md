# SEO baseline - einvoicecheck.ae (step M1)

Niche: UAE e-invoice preflight validation API (see `handoffs/V1/decision.json`).
Positioning guardrail enforced in copy on every page: **preflight validation only** -
not FTA-accredited, does not transmit legal e-invoices, does not replace an accredited
service provider, no statutory archival.

Cluster total: **2,370 est. monthly searches** across 5 keywords. Low volume, high intent,
deadline-driven. Strategy: own the exact-match pages, then expand the informational cluster
via the blog and the free tool.

---

## 1. Keyword -> page map (all 5 keywords)

| # | Keyword | Est. vol/mo | Intent (V1) | Primary page | H1 / angle | Supporting pages |
|---|---------|-------------|-------------|--------------|-----------|------------------|
| 1 | `e invoicing UAE` | 1,000 | commercial (broadest, research-stage) | `/` (homepage) | "E-invoicing in the UAE breaks at the file, not at the filing." | `/blog` hub, `/tools/uae-e-invoice-validator`, blog wk1/wk2/wk7 |
| 2 | `UAE e invoicing software` | 590 | transactional | `/pricing` | "UAE e-invoicing software with a price on the page" | `/vs/cleartax`, `/vs/comarch`, `/vs/sovos`, blog wk6 |
| 3 | `FTA approved accounting software in UAE` | 480 | transactional (public_exact) | `/alternatives/[slug]` (cleartax, comarch, sovos) | "X alternatives for UAE e-invoicing" - opens by explaining that accreditation applies to *service providers*, not every tool | blog wk3, homepage FAQ |
| 4 | `UAE e invoicing API` | 210 | transactional_developer | `/docs` | "UAE e-invoicing API - POST /v1/validate" | blog wk5, wk8 |
| 5 | `PINT AE validation` | 90 | transactional_technical | `/tools/pint-ae-validator` | "PINT AE validation, in the browser" | `/docs`, blog wk4 |

Deliberate non-overlap: each keyword owns exactly one primary page. The homepage does
*not* try to rank for the API or pricing terms; the pricing page does *not* chase the
developer term. Internal links push authority from the homepage down to `/pricing`,
`/docs`, `/tools/*` and `/alternatives/*`.

### Per-page SEO assets shipped
Every page has: unique `<title>`, unique meta description, canonical URL, OG + Twitter
tags (via `src/lib/seo.ts`), and JSON-LD.

| Page | JSON-LD |
|------|---------|
| all pages (root layout) | `Organization`, `WebSite` |
| `/` | `SoftwareApplication` (with $29 / $99 PreOrder offers), `FAQPage` (5 Qs) |
| `/pricing` | `SoftwareApplication` + `AggregateOffer` (0/29/99), `FAQPage`, `BreadcrumbList` |
| `/docs` | `FAQPage`, `BreadcrumbList` |
| `/blog` | `BreadcrumbList` |
| `/waitlist` | `BreadcrumbList` |
| `/tools/[slug]` | `SoftwareApplication` (free), `BreadcrumbList` |
| `/alternatives/[slug]` | `FAQPage`, `BreadcrumbList` |
| `/vs/[slug]` | `BreadcrumbList` |

`sitemap.xml` (Next `app/sitemap.ts`) and `robots.txt` (`app/robots.ts`) are generated at
build time; `robots.txt` disallows `/api/` and points at `https://einvoicecheck.ae/sitemap.xml`.

---

## 2. The informational keyword GR1 should target

> ## `e invoicing UAE` - 1,000 est. searches/month
>
> **This is the single highest-volume informational/research-stage keyword in the cluster
> and the one GR1's free tool must target.**

Honest caveat, stated so GR1 does not mis-scope: V1 labels this keyword `commercial`, not
strictly `informational`. It is nonetheless the *only* research-stage query in the five -
the other four are explicitly transactional (`software`, `API`, `PINT AE validation`) or
vendor-selection (`FTA approved accounting software`). At 1,000/mo it is 1.7x the next
keyword and ~11x the exact-match technical term.

**Recommendation for GR1:**
- Build the free tool at **`/tools/uae-e-invoice-validator`** (route reserved and live,
  metadata + JSON-LD + waitlist capture already in place - drop the interactive tool into
  the `TODO(GR1)` slot in `src/app/tools/[slug]/page.tsx`). This page targets
  `e invoicing UAE` / "check my UAE e-invoice".
- **`/tools/pint-ae-validator`** (reserved, live) is the exact-match secondary for
  `PINT AE validation` (90/mo, technical, high conversion).
- **`/tools/trn-format-checker`** (reserved, live) is the long-tail feeder off blog wk7.
- All three tool pages already funnel to `/waitlist`.

---

## 3. Eight-week content plan (1 post/week, real titles)

Source of truth in code: `app/web/src/lib/posts.ts` (rendered on `/blog` as a "Coming up"
table; nothing is faked as published). Cadence starts the week the site goes live.

| Week | Post title | Target keyword | Intent | Internal link target |
|------|-----------|----------------|--------|----------------------|
| 1 | **E-invoicing in the UAE: what actually changes for your finance system** | `e invoicing UAE` | informational (pillar) | `/`, `/tools/uae-e-invoice-validator` |
| 2 | **The 12 UAE e-invoice errors that get files rejected (and how to fix each one)** | `e invoicing UAE` | informational | `/tools/uae-e-invoice-validator`, `/docs` |
| 3 | **"FTA approved accounting software in UAE": what that phrase does and does not mean** | `FTA approved accounting software in UAE` | commercial | `/alternatives/cleartax` |
| 4 | **PINT AE validation rules, explained field by field** | `PINT AE validation` | informational | `/tools/pint-ae-validator`, `/docs` |
| 5 | **How to validate a UAE e-invoice in your CI pipeline (GitHub Actions example)** | `UAE e invoicing API` | transactional | `/docs`, `/pricing` |
| 6 | **What UAE e-invoicing software actually costs in 2026** | `UAE e invoicing software` | commercial | `/pricing`, `/vs/cleartax` |
| 7 | **UAE TRN format: how to validate a Tax Registration Number before you invoice** | `e invoicing UAE` (long tail) | informational | `/tools/trn-format-checker` |
| 8 | **Preflight vs transmission: why your accredited provider is not enough on its own** | `UAE e invoicing API` | commercial (positioning) | `/pricing`, `/waitlist` |

Rules for whoever writes these: every post repeats the guardrail sentence, every post links
to exactly one primary money page, and no post claims accreditation, transmission, or
archival capability.

---

## 4. Baseline metrics (all zero - nothing is live yet)

| Metric | Value at M1 |
|--------|-------------|
| Indexed pages | 0 (site not deployed) |
| GSC property | not verified - see `handoffs/M1/gsc_submission.md` |
| Sitemap submitted | NO |
| Backlinks | 0 |
| Ranking keywords | 0 |

First measurable checkpoint: 14 days after the sitemap is submitted, check GSC Pages
report for indexation of the 5 primary pages and impressions on the 5 keywords.
