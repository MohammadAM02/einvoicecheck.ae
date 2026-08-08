# EInvoiceCheck live design, UX and SEO audit

**Audit date:** 7 August 2026  
**Live surface tested:** `https://einvoicecheck.ae/`, `/tools/xml-generator`, `/pricing`, `/docs`, `/tools/xml-repairer`, `/signup`, `/login`, `/contact`, and public legal pages.  
**Audit viewport:** 1363 × 936 desktop in the live browser. PageSpeed Insights supplied an emulated mobile lab run and desktop lab run. This browser did not expose viewport resizing, so a manual 375 px / 768 px interaction pass is explicitly not claimed.

## 1. Executive summary

1. **Fix malformed-XML handling before anything else.** A deliberately malformed XML document was reported as `0 Format`, `0 Structure`, and `13 Semantic` errors instead of receiving a syntax/format failure. That makes the validator’s most basic diagnosis wrong. **Severity 4.**
2. **Take the unfinished public trust pages down or noindex them today.** `/contact` says the support mailbox is not provisioned; Privacy, Terms, and Refunds say they are drafts awaiting legal review. They are indexable. That is poison for a compliance-adjacent product asking users to enter invoice data and pay. **Severity 3.**
3. **Make the live validation scope internally consistent.** The live `/docs` page says full PINT-AE XSD/Schematron validation is not included; Google’s indexed `/docs` result says an official Schematron gate runs first. Both cannot be true. **Severity 4.**
4. **Repair form accessibility in the XML Generator.** The first eight inputs/selects have no `id`, no associated `<label>`, and no ARIA name. Visible text exists, but assistive technology has no programmatic field relationship. **Severity 3.**
5. **Give results their own layout.** After validation, the live result card stays 452 px wide on the right while most of the desktop viewport remains empty and the original hero heading is pushed beneath it. The content is good; the container is wasting it. **Severity 2.**
6. **Add a canonical URL to the homepage and noindex public drafts.** Every sampled product page except the homepage exposed a canonical tag. Public legal drafts are indexable and already appear in Google. **Severity 3.**
7. **Keep the performance work boring. It is working.** PSI returned 96 mobile and 100 desktop performance. Mobile LCP is 2.482 s, barely inside Google’s 2.5 s good threshold. Deal with its 290 ms render-blocking opportunity; do not turn this into a rewrite. **Severity 1.**
8. **Add standards authority, not more generic product copy.** The live site has one minimal `SoftwareApplication` JSON-LD object and no visible official-source citations. Adjacent tools expose rule sets, source links, error references, batch workflows, and substantive resource content. **Severity 2.**

## 2. Scorecard

| Phase | Score /10 | Why |
|---|---:|---|
| Visual design | 7 | Clear restrained system and strong contrast; result and generator desktop states waste critical space. |
| UX / usability | 4 | Human-readable semantic errors are strong; malformed XML is routed to the wrong validation layer. |
| Content & messaging | 5 | Core purpose reads immediately; scope and public trust content contradict or undermine it. |
| Technical performance | 9 | Excellent lab performance; mobile LCP has only 18 ms of headroom and PSI flags small, specific waste. |
| SEO | 5 | Indexable, titled pages exist; homepage canonical is missing, legal drafts are indexed, schema is thin, and authority content is weak. |
| Accessibility | 6 | Contrast, focus, and keyboard navigation look solid; generator field names are not programmatically associated. |
| Competitive benchmark | 5 | The focused, private preflight position is clean, but the site visibly trails adjacent tools on conformance transparency and search-content depth. |
| Business-impact readiness | 3 | A compliance tool cannot afford incorrect format diagnosis, indexed legal drafts, or contradictory scope claims. |

## 3. Phase 0 — Reconnaissance

### What loaded

- The public app loads as a Next.js application (`/_next/static/...` bundles in rendered source).
- Google returns indexed results for the homepage, `/docs`, `/pricing`, and the public legal pages. It cannot confirm index coverage, canonical selection, or rankings without Search Console.
- Live language is English only: `html[lang="en"]`, no `hreflang` alternates, and no Arabic route was found.
- The browser could not open `/robots.txt` or `/sitemap.xml`: `net::ERR_BLOCKED_BY_CLIENT`. A second public fetch path also failed safe-URL validation. Their actual contents are **unverified**.

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| Public `/contact` says “The support mailbox is not provisioned yet.” `/legal/privacy`, `/legal/terms`, and `/legal/refunds` say “Draft — not reviewed by a lawyer” and instruct the operator to complete/review them before paid subscriptions. All three legal routes expose `robots: index, follow`. | [Opinion, compliance-trust risk] The site asks users to submit invoice data and presents paid plans; public unfinished legal and support copy directly contradicts readiness. | 3 | Put every draft legal/support page behind `noindex` immediately. Remove paid-plan CTAs until the operator identity, support channel, effective dates, sub-processors, retention, and payment/refund terms are final. | S for containment; M for final content/legal review |

## 4. Phase 1 — Visual design

**Verified strength:** the sampled palette passes normal-text contrast on its main surfaces: `#102A43` on `#F7F8F5` = **13.74:1**; `#18324A` on `#F7F8F5` = **12.36:1**; `#48647A` on `#F7F8F5` = **5.83:1**; green primary action `#087F6B` on white = **4.93:1**. The primary CTA is visually unmistakable above the fold.

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| In the completed error state, screenshot 03 shows a 452 px results panel at x=767 on a 1363 px viewport. The left side is mostly blank and the original hero headline sits below the results. The user’s attention is split between an old marketing hero and an active error list. | [Opinion] **Nielsen heuristic 8, Aesthetic and minimalist design**: the active task should carry the page hierarchy. | 2 | Add a `results-mode` layout: hide or collapse the hero copy; give the result panel a 760–880 px reading width; retain only a compact product header and a “Validate another file” action. | M |
| Screenshot 04 shows the desktop XML Generator using a narrow single form column with a large unused right half. The form is long and its totals/output are below the first viewport. | [Opinion] **Nielsen heuristic 6, Recognition rather than recall**: keep running totals and the next action visible while users enter line items. | 2 | At desktop widths, use a two-column layout: left = form; right = sticky totals, field-check summary, and generated XML preview/download area. Collapse to one column below tablet width. | M |

## 5. Phase 2 — UX / usability / information architecture

### Nielsen heuristic pass

| Heuristic | Severity | Live evidence |
|---|---:|---|
| Visibility of system status | 2 | The validator shows “Running UAE preflight checks…” and disables controls, but it gives no phase/timing cue; results then jump into a narrow right-side panel. |
| Match between system and real world | 4 | Invalid XML is described as missing business fields, not an XML syntax failure. |
| User control and freedom | 1 | Result state provides “Validate another file”; no clear undo concern was found. |
| Consistency and standards | 1 | “API” and “Documentation” both route to `/docs`. |
| Error prevention | 4 | No well-formedness gate appears before semantic validation. |
| Recognition rather than recall | 2 | Generator totals are far below the initial fields, leaving users to remember what they entered. |
| Flexibility and efficiency | 2 | Samples help, but core public validation is limited to 20 checks/hour and the limit appears only after validation. |
| Aesthetic and minimalist design | 2 | Result state preserves a large inactive hero/blank area. |
| Help users recognize, diagnose, recover | 4 | Semantic fixes are plain and actionable; malformed XML is diagnosed as the wrong problem. |
| Help and documentation | 2 | Docs are substantial for API users, but publicly contradict the search-indexed scope claim. |

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| Test input `<Invoice><cbc:ID>INV-TEST</cbc:ID></Invoicee>` has mismatched closing tags. The live result says `Preflight failed`, **0 Format**, **0 Structure**, and **13 Semantic** errors, beginning with a missing issue date. It never identifies an XML parse error. Screenshot 06 captures the malformed input and the observed result DOM. | **Nielsen heuristic 9** (recognize, diagnose, recover) and [WCAG 2.2 SC 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html): detected input errors need an accurate identity and description. | 4 | Parse XML before normalization or semantic checks. On parser failure: return one `Format` blocking issue with line/column, parser message, and a short “Fix the malformed XML before running PINT-AE checks” instruction; do not fabricate semantic findings. Add regression tests for mismatched tags, unbound prefixes, bad declarations, and invalid characters. | S |
| XML Generator control inspection found the template select plus invoice number, dates, supplier/customer TRNs, and company-name inputs have `id: null`, `labels: []`, and `aria: null`. Only the line-item controls have ARIA names. | [WCAG 2.2 SC 1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships) and [SC 3.3.2](https://www.w3.org/TR/UNDERSTANDING-WCAG20/minimize-error-cues.html): relationships and labels must be programmatically available. | 3 | Give every field a stable `id` and a `<label for>`; use `<fieldset><legend>` for Document, Parties, Lines, and Totals. Keep placeholders as examples only, never as labels. | S |
| Header links “API” and “Documentation” both send users to `/docs`. | **Nielsen heuristic 4, Consistency and standards**. Two different labels promise two different destinations. | 1 | Rename both to “API docs” or remove one. | S |

## 6. Phase 3 — Content & messaging

**Five-second test:** above the fold clearly communicates the basic promise: “Check your UAE e-invoice before your ASP does,” a direct validator, PINT-AE XML/canonical JSON, and “not persisted.” That part works.

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| Live `/docs` says: “Full PINT AE XSD and Schematron conformity validation is not currently included.” Google’s indexed `/docs` result says an “official Schematron gate” runs first and fatal structural errors stop the business checks. | **Nielsen heuristic 4, Consistency and standards**. A compliance product’s scope must be identical across public representations. | 4 | Pick the technically true statement. Publish it on homepage, docs, pricing, API responses, and metadata. Remove stale indexed claims by updating the page and requesting recrawl in Search Console. Do not use “PINT-AE validator” without an explicit qualifier while full conformance is absent. | S |
| The homepage puts “Current limitations” in a collapsed, below-the-fold details section. Pricing and docs disclose incomplete conformity more directly. | **Nielsen heuristic 2, Match between system and real world**. Material limits should appear before a user treats a pass as compliance approval. | 3 | Add a one-sentence scope label directly below the validator: “Checks XML well-formedness plus the listed preflight rules; not a guarantee of PINT-AE/ASP acceptance.” Link to a full rule/scope page. | S |
| Public legal/support pages communicate unfinished operations, while the price page says paid plans are processed “securely through PayPal.” | [Opinion, trust contradiction] The purchase page and legal/support pages cannot signal different readiness levels. | 3 | Resolve the operational facts before selling: operator entity, support email, data handling, refunds, retention, and payment timing. Until then, make the product clearly beta/free and remove payment language. | M |

## 7. Phase 4 — Technical performance

PageSpeed Insights returned **lab** data only: its field-data panel says **No Data**, so INP and real-user Core Web Vitals are unavailable.

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| PSI mobile: Performance **96**, FCP **1.057 s**, LCP **2.482 s**, TBT **23 ms** (display rounds to 1.1 s / 2.5 s / 20 ms), CLS **0**, Speed Index **3.683 s**. LCP is inside but only 18 ms below Google’s good threshold. | [Google Core Web Vitals](https://web.dev/articles/vitals): LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. | 1 | Preserve the current critical-path budget. Remove the mobile render-blocking opportunity before adding new visual effects or third-party scripts. | S |
| PSI flags estimated **290 ms** render-blocking savings on mobile (**40 ms** desktop), **12 KiB** legacy JavaScript, **20 KiB** unused JavaScript on mobile, and one long main-thread task. Desktop score is 100 with LCP 0.503 s and TBT 1 ms. | PSI live report, 7 Aug 2026. | 1 | Audit the CSS/JS that blocks first paint; split or defer non-critical code. Do not chase a full framework migration—the current scores do not justify it. | S |

**Unverified in this audit:** total transferred bytes, per-resource weight breakdown, response headers, image compression byte sizes, and production font strategy beyond visible source hints (three preloaded WOFF2 fonts and a preloaded SVG logo). PSI’s API endpoint was blocked in this browser, so no made-up weight table appears here.

## 8. Phase 5 — SEO

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| Homepage head exposes no canonical URL. Sampled `/tools/xml-generator`, `/pricing`, `/docs`, `/tools/xml-repairer`, `/contact`, and public legal routes do expose self-canonicals. | [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): specify the canonical in HTML source when needed. | 2 | Add `<link rel="canonical" href="https://einvoicecheck.ae/">` to the homepage metadata and verify it is server-rendered. | S |
| Google returns `/legal/privacy`, `/legal/terms`, and `/legal/refunds`; live pages admit they are drafts. | **Google Search Essentials / trust hygiene** plus the live facts. Indexing unfinished legal content creates bad branded results. | 3 | Add `noindex, nofollow` and remove them from the sitemap until final. When final, publish one complete legal set with effective date and operator information. | S |
| Homepage source contains only `SoftwareApplication` JSON-LD with `name` and `applicationCategory`. The Schema Markup Validator fetched that source but did not present a usable validation summary in this browser. No Organization, WebApplication detail, or item-level `description`, `url`, `offers`, or `operatingSystem` properties were observed. | [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication) defines the application type; sparse markup is not a rich-result strategy. | 2 | Expand the application entity with `url`, `description`, `applicationSubCategory`, `operatingSystem: "Web"`, `offers` where truthful, and a linked Organization entity. Do not add fake review/testimonial markup. | S |
| On-page titles/descriptions are present and sensible, but the site has no visible official-source citations or resource hub. Peppol Validator visibly publishes a rule reference, country guides, and standards links; OrchidaTax visibly explains field-level terms and the workflow. | [Google Search quality / helpful-content principle](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): first-hand, substantiated material earns confidence better than thin marketing pages. | 2 | Publish a compact UAE PINT-AE resource set: timeline, ERP-to-ASP workflow, complete rule scope, test-file guide, and error reference. Cite official MoF/FTA/OpenPeppol sources at the claim level. | L |

### On-page metadata audit

| Route | Title (characters) | Meta description (characters) | Canonical | Indexing | H1 |
|---|---|---|---|---|---|
| `/` | `UAE E-Invoice Preflight Validator \| einvoicecheck.ae` (52) | `Test ERP-generated PINT-AE XML and find validation, mapping and invoice data errors before submission to your ASP.` (113) | **Missing** | default indexable (no robots meta) | Check your UAE e-invoice before your ASP does |
| `/tools/xml-generator` | `Free UAE e-invoice XML generator — build PINT-AE XML from a form` (66) | 174 | Present | `index, follow` | XML Generator |
| `/pricing` | `Pricing — UAE e-invoice preflight validation` (44) | 139 | Present | `index, follow` | UAE e-invoice preflight checks with a price on the page |
| `/docs` | `UAE e-invoicing API docs - POST /v1/validate` (45) | 123 | Present | `index, follow` | UAE e-invoice preflight API |
| `/signup` | `Create an account` (17) | Not captured | Missing | `noindex, nofollow` | Create your account |

Title guidance is practical, not a hard ranking rule. The generator title is slightly long; do not cut it at the expense of clarity unless SERP testing shows truncation damage.

## 9. Phase 6 — Accessibility (WCAG 2.2 AA)

| Observation | Standard or source | Severity | Fix | Effort |
|---|---|---:|---|---|
| Generator labels are visually adjacent but not associated in the DOM; see Phase 2 finding U-02. | [WCAG 2.2 SC 1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships) and [SC 3.3.2](https://www.w3.org/TR/UNDERSTANDING-WCAG20/minimize-error-cues.html). | 3 | Implement programmatic labels, groups, and descriptions. | S |

**Verified passes, not a compliance certification:**

- Sampled text/button pairs meet [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) with ratios from 4.76:1 to 13.74:1.
- Keyboard tabbing reached the brand link, validation link, then XML Generator in logical order. The active XML Generator link had a visible `3px solid #102A43` outline, matching [WCAG 2.2 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).
- The live DOM provides landmarks, buttons, headings, and a focusable drop zone. Lighthouse returned 100 accessibility in both lab runs.

**Not verified:** screen-reader output, every control state, mobile touch target sizes at 375 px, tablet reflow, and the file-chooser path. No WCAG conformance claim is justified from this pass.

## 10. Phase 7 — Competitive benchmark

This is a narrow product-pattern benchmark, not an endorsement or verification of competitors’ marketing claims.

| Comparator | Directly observed pattern | EInvoiceCheck gap or advantage | Action |
|---|---|---|---|
| [Sorgera PINT AE validator](https://services.sorgera.com/peppol/xml-validator) | Its live page states **PINT AE 1.0.4**, “EN16931 Compliant,” “Peppol BIS 3.0,” and “multi-color highlighting”; it starts with one file upload. | EInvoiceCheck’s interface is cleaner and more human-readable after semantic errors. Its live docs, however, state full XSD/Schematron conformance is absent, and malformed XML is not correctly classified. | Do not imitate Sorgera’s visual clutter. Match the verification order: parse → structure/conformance → semantics, then show human fixes. |
| [Peppol Validator](https://peppolvalidator.com/) | Its live page visibly explains the rule layers, offers a sample, batch validation, shareable result links, a 311-rule reference, and country/standards content. | EInvoiceCheck already has a clean sample-driven validator and exact fixes. It lacks a public source/rule library and substantive discoverability content. | Add a scope-and-rules page before adding batch or sharing features. It is the smallest authority gain. |
| [OrchidaTax PINT-AE Converter & Validator](https://orchidatax.com/pint-ae-pint-ae-schema-converter-validator/) | Its live tool exposes structured form, JSON/CSV modes, field-level BT/BG labels, validation rules, privacy-by-architecture copy, and explanatory workflow. | EInvoiceCheck’s generator is visually calmer, but its first fields have no programmatic labels and its scope copy is weaker/contradictory. | Borrow the explicit field terminology and validation-scope transparency. Do not copy its overloaded page or unverified social proof. |

## 11. Phase 8 — Business-impact synthesis

| Finding | Likely business impact | Evidence basis |
|---|---|---|
| Malformed XML is misdiagnosed | Highest risk: user follows false fixes, loses confidence, and treats a core validation engine as unreliable. | Live reproduction; Nielsen heuristic 9; WCAG error-identification standard. |
| Draft legal/support pages are public and indexable | Strong trust and conversion drag for people deciding whether to upload financial documents or pay. | Live pages and Google results. |
| Scope conflict between live docs and Google result | Compliance buyers will see contradictory product capability claims; this creates support burden and reputational risk. | Live DOM and Google indexed result for same route. |
| Unlabelled generator fields | Blocks or degrades assistive-tech use of the creation flow, including a core task path. | Live DOM inspection; WCAG 1.3.1/3.3.2. |
| Result state remains inside hero layout | Slower diagnosis and lower perceived competence during the product’s moment of truth. | Screenshot 03; [opinion] grounded in task hierarchy. |
| No homepage canonical | Preventable duplicate/canonical ambiguity. | Live head inspection; Google canonical documentation. |
| Thin schema and resource authority | Smaller organic surface area around PINT-AE and weaker explanation of why users should trust the rule set. | Live source and direct competitor content. |
| Mobile LCP at 2.482 s | It currently passes the 2.5 s line but has no margin for added scripts, images, or animated background experiments. | PSI mobile lab and Google CWV threshold. |

## 12. Prioritized roadmap

### Quick wins — under a week

1. **F-01:** Add the XML well-formedness parser gate; short-circuit on syntax failure; add regression cases.
2. **F-02:** Add correct `<label>`/`id` associations to every Generator control.
3. **F-03:** Put public legal/support drafts behind `noindex`; remove payment language until they are final.
4. **F-04:** Reconcile homepage, docs, pricing, metadata, and Google’s cached copy to one truthful validation-scope statement.
5. **F-05:** Add homepage canonical and expand minimal schema with truthful application/organization properties.
6. **F-06:** Rename duplicate header destination labels and state the free 20/hour limit before a user validates.

### Mid-term — design + dev cycle

1. **F-07:** Build a results-mode layout that lets users read/fix errors without an inactive hero competing for the screen.
2. **F-08:** Make the Generator two-column at desktop with sticky totals, live checks, and the generated XML output.
3. **F-09:** Publish a single rule/scope page that names validation layers, rule IDs, versions, and what is deliberately out of scope.

### Strategic — structural / content investment

1. **F-10:** Decide the actual product promise. Either implement verified format/structure/conformance layers and document the versions, or position it only as a semantic ERP preflight. Half-saying both is nonsense.
2. **F-11:** Build a cited UAE PINT-AE resource library: implementation timeline, ERP export checklist, test XML pack, rule/error glossary, and ASP hand-off guide.
3. **F-12:** Add real-user performance monitoring before adding motion/texture or growth scripts. Lab scores are not field data.

## 13. Appendix — raw data

### PageSpeed Insights

| Strategy | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index | Field data |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Mobile, Lighthouse 13.4.1 / emulated Moto G Power / Slow 4G | 96 | 100 | 100 | 100 | 1.057 s | 2.482 s | 23 ms | 0 | 3.683 s | No Data |
| Desktop, Lighthouse 13.4.1 / emulated desktop | 100 | 100 | 100 | 100 | 0.249 s | 0.503 s | 1 ms | 0 | 0.562 s | No Data |

### Schema found

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "einvoicecheck.ae UAE E-Invoice Preflight Validator",
  "applicationCategory": "BusinessApplication"
}
```

### Crawl files

- `https://einvoicecheck.ae/robots.txt`: unverified; browser returned `net::ERR_BLOCKED_BY_CLIENT`.
- `https://einvoicecheck.ae/sitemap.xml`: unverified; browser returned `net::ERR_BLOCKED_BY_CLIENT`.

### Console and broken-link checks

- Sampled homepage, Generator, and Pricing console logs only contained a cloud-browser extension error (`chrome-extension://...`), not a site-origin console error.
- Tested public nav/footer routes listed in Phase 0 loaded route content. No public 404 was observed in that sample.

### Screenshots captured and inspected

1. `01-home-desktop.jpg` — homepage above fold.
2. `02-validation-failed.jpg` — in-progress broken sample state.
3. `03-validation-results.jpg` — completed semantic-error result state.
4. `04-generator-desktop.jpg` — XML Generator above fold.
5. `05-pricing-desktop.jpg` — pricing above fold.
6. `06-malformed-xml-result.jpg` — malformed XML test and resulting wrong-layer diagnosis.

