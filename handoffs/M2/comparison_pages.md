# M2 - comparison pages (competitor search capture)

Site: `app/web` (Next.js 15 App Router). Routes reserved by M1 were extended, not replaced.
Source of competitor facts in code: `app/web/src/lib/competitors.ts`.
**All competitor sources fetched 14 July 2026.** Nothing is deployed; there is no live URL.

---

## 1. The 5 pages

| # | URL (path, not live) | Target keyword | Gap it leads with (sourced) | Source of the gap |
|---|---|---|---|---|
| 1 | `/alternatives/cleartax` | `FTA approved accounting software in UAE` (480/mo, exact) + "ClearTax alternative" | You cannot see a price, or start, without a sales call. Buyers in a UAE small-business thread additionally report high onboarding fees and support frustration. | [cleartax.com/ae/e-invoicing-software](https://www.cleartax.com/ae/e-invoicing-software) (fetched 14 Jul 2026, no price, CTAs are "Book a Demo" / "Get in touch"); review claim attributed to [r/SmallBusinessUAE thread](https://www.reddit.com/r/SmallBusinessUAE/comments/1rf5kq9/any_uae_einvoicing_asp_member_here/) |
| 2 | `/alternatives/comarch` | `FTA approved accounting software in UAE` + "Comarch alternative" | The unit of sale is a multi-country EDI programme; there is no small UAE-only thing you can buy today. | [comarch.com e-invoicing](https://www.comarch.com/trade-and-services/data-management/e-invoicing/) (fetched 14 Jul 2026: no figures, cost calculated from volume / country count / integration complexity); review claim attributed to [G2 - Comarch EDI and e-Invoicing](https://www.g2.com/de/products/comarch-edi-and-e-invoicing/reviews) |
| 3 | `/alternatives/sovos` | `FTA approved accounting software in UAE` + "Sovos alternative" | Bought as an enterprise compliance programme; no lightweight UAE-only tier. Also: Sovos was **not on** the MoF pre-approved provider list when we checked. | [sovos.com/vat/products/einvoice](https://sovos.com/vat/products/einvoice/) (fetched 14 Jul 2026: "custom pricing based on your company and needs"); [MoF pre-approved list](https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/) (checked 14 Jul 2026); review claim attributed to [G2 - Sovos](https://www.g2.com/products/sovos/reviews) |
| 4 | `/vs/cleartax` | `UAE e invoicing software` (590/mo, transactional) | Same gap, framed head-to-head: ClearTax files, we do not; we stop the file being wrong for $29. | as row 1 |
| 5 | `/vs/comarch` | `UAE e invoicing software` | Enterprise EDI suite + quoted pricing vs a narrow $29 UAE developer API. | as row 2 |

`/vs/sovos` **does not exist and is not in the sitemap** - `decision.json` sets `vs_page: null` for Sovos. Enforced in code: `vs/[slug]/page.tsx` has `dynamicParams = false` and generates params only from `VS_SLUGS`.

All 5 URLs are in `app/sitemap.ts` output (verified in the built `sitemap.xml` - see `build_report.md`).

---

## 2. Live pricing actually verified (fetched 14 July 2026)

| Vendor | What is published | Verified how | Verdict |
|---|---|---|---|
| **ClearTax UAE** | **No price of any kind.** CTAs: "Get in touch", "Book a Demo", "Request a Demo". Page claims FTA-approved ASP, open Peppol Access Point, 100% PINT AE, 5-year archival, ERP/POS integration. | WebFetch of [cleartax.com/ae/e-invoicing-software](https://www.cleartax.com/ae/e-invoicing-software), 14 Jul 2026 | **Contact-sales. No number invented.** |
| **Comarch** | **No price.** Describes a "transparent cost calculation" driven by monthly document volume, number of countries and integration complexity - i.e. a quote. 60+ countries, EDIFACT/XML/UBL/IDOC/X12/ZUGFeRD, Peppol AP, UAE EIS integration, separate e-archive module. | WebFetch of [comarch.com/trade-and-services/data-management/e-invoicing/](https://www.comarch.com/trade-and-services/data-management/e-invoicing/), 14 Jul 2026 | **Contact-sales. No number invented.** |
| **Sovos** | **No price.** States pricing is *custom, based on your company and needs*. CTAs: "Request Your Personalized Demo", "Talk to a Compliance Expert", "Book a Call". 65+ countries, e-archiving, SAP/Oracle native. | WebFetch of [sovos.com/vat/products/einvoice/](https://sovos.com/vat/products/einvoice/), 14 Jul 2026 (the URL in decision.json, `sovos.com/products/e-invoicing/`, 404s today) | **Quote-only. No number invented.** |
| *Market price anchor (not a competitor page)* | TronStride publishes AED 1,470/yr for 500 docs incl. API, up to AED 39,690/yr for 120,000 docs; free tier of 100 docs/yr. | WebFetch of [tronstride.com/pricing](https://www.tronstride.com/pricing/), 14 Jul 2026 | Confirms UAE buyers will pay published prices for API-enabled tiers. Used for context only; not on the pages. |
| **einvoicecheck.ae (us)** | $0 free tier (100 validations) / $29 / $99 per month, on `/pricing`. Billing not live - waitlist only. | `src/lib/site.ts` | Published. |

**Net:** all three competitors are contact-sales / quote-only. **Zero prices were invented.** Every feature table row for pricing says exactly that, with the fetch date and a link.

### Accreditation, verified against the official list (14 July 2026)
Fetched [MoF pre-approved e-invoicing service providers](https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/):

- **ClearTax** - listed (entry: Defmacro Software DMCC). It is an accredited ASP. **It genuinely does more than we do.**
- **Comarch** - listed (Comarch Middle East FZ LLC). Accredited ASP. **Also genuinely does more than we do.**
- **Sovos** - **not** on the list on that date. Stated on the page as an observation about one list on one date, with the caveat that Sovos may operate via a partner and the list changes.
- **einvoicecheck.ae - not on the list, and we say so on every page.**

---

## 3. Sources that could NOT be re-fetched today (stated honestly, not hidden)

| Source | What happened | How the pages handle it |
|---|---|---|
| [G2 - Comarch reviews](https://www.g2.com/de/products/comarch-edi-and-e-invoicing/reviews) | HTTP 403 - G2 blocks automated fetching | The review-derived observation (pricing complexity, especially for smaller companies) is **attributed to G2 with a link**, and the page prints the caveat that we could not re-verify it line by line and the reader should look themselves. |
| [G2 - Sovos reviews](https://www.g2.com/products/sovos/reviews) | HTTP 403 | Same: "complex UI, heavy customization, review-derived implementation time of roughly four months" is attributed, linked, and explicitly labelled as *reviewer-derived, not published by Sovos*. |
| [r/SmallBusinessUAE thread](https://www.reddit.com/r/SmallBusinessUAE/comments/1rf5kq9/any_uae_einvoicing_asp_member_here/) | Reddit blocks automated fetching | The ClearTax onboarding-fee / support observation is attributed and linked, with a printed caveat that it is a handful of self-reported comments, not a survey. |

No verbatim review quotes appear anywhere. No review counts, star ratings, or "customers say" statistics are stated. Nothing is claimed as first-hand that we did not fetch first-hand.

---

## 4. The ASP / preflight guardrail (the non-negotiable)

`GUARDRAIL` (`src/lib/site.ts`) is rendered via `<GuardrailNotice />` on **all 5 pages**:

> einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival.

Beyond the notice block, each page hard-codes the asymmetry:

- Every feature table opens with three rows where **the competitor wins**: transmission, accreditation, statutory archival. Those cells are visually marked "(they win this row)".
- Each `/alternatives/*` page has a section "When [competitor] is the right answer and we are not".
- Each `/vs/*` page has a section titled **"The honest recommendation"** which says: if you have to pick one, pick the accredited provider - you legally need someone who can transmit and archive; buy us *as well*, not *instead*.
- FAQ on every page includes "Can einvoicecheck.ae replace [competitor]?" -> "No."

## 5. Per-page SEO assets

All 5 pages ship: unique `<title>`, unique meta description, canonical, OG + Twitter (via `pageMetadata()` in `src/lib/seo.ts`), **`FAQPage` JSON-LD** (4 Qs each - `/vs/*` now has FAQ JSON-LD, which it lacked at M1), `BreadcrumbList` JSON-LD + a visible breadcrumb, and a CTA to the free tier / waitlist ("Start free - join the waitlist"). No Tailwind; styles are the existing `globals.css` classes plus a small `.claim` / `.source` / `table.compare` addition.

## 6. Compliance checks

- **Billing is Dodo Payments.** The name of the forbidden competing payment processor appears nowhere in the site source or in these handoffs - verified by case-insensitive ripgrep over `app/web/src` and `handoffs/M2`: 0 matches. No payment SDK is embedded at all (billing is not live; every CTA points at the free tier / waitlist).
- **No deploy, no fabricated URL.** Proof of work is the real `npm run build` (exit 0) in `handoffs/M2/build_report.md`.

## 7. Still PENDING on the human

- Deploy (no credentials in this environment).
- Sitemap submission to GSC (blocked on deploy; see `handoffs/M1/gsc_submission.md`).
- Optional: re-check the MoF pre-approved list before publishing - it changes, and the Sovos "not listed" observation is date-stamped for exactly that reason.
