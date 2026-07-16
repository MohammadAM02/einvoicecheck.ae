import type { CompetitorSlug } from './site';

/**
 * Competitor facts for /alternatives/[slug] and /vs/[slug] (step M2).
 *
 * RULES FOR EDITING THIS FILE
 * 1. Every claim carries a source URL and the date the source was fetched.
 * 2. Pricing is copied from the vendor's own live page. If the vendor does not
 *    publish a price, the value is the literal string "no public price -
 *    contact sales", never an invented number.
 * 3. Review-derived observations are attributed, never quoted verbatim and
 *    never accompanied by invented review counts.
 * 4. Accreditation status is taken from the official UAE Ministry of Finance
 *    list of pre-approved e-invoicing service providers, not from marketing copy.
 */

/** Date every source below was fetched. */
export const SOURCES_FETCHED_ON = '14 July 2026';

export const MOF_ASP_LIST_URL =
  'https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/';

export type SourcedClaim = {
  /** The observation, stated plainly. */
  text: string;
  /** Where it came from. */
  url: string;
  /** Human label for the link. */
  label: string;
  /** Optional caveat about the source itself. */
  caveat?: string;
};

export type FeatureRow = {
  feature: string;
  /** einvoicecheck.ae */
  us: string;
  /** the competitor */
  them: string;
  /** true when the competitor genuinely does more than we do */
  advantageThem?: boolean;
};

export type Competitor = {
  name: string;
  shortName: string;
  /** Vendor's own published price, verbatim in spirit. Never invented. */
  pricing: string;
  /** Short form used inside sentences, e.g. "contact-sales". */
  pricingShort: string;
  pricingSource: string;
  pricingSourceLabel: string;
  /** What we actually saw on the pricing/product page today. */
  pricingEvidence: string;
  /** On the MoF pre-approved e-invoicing service provider list? */
  accredited: boolean;
  accreditationNote: string;
  shape: string;
  /** The gap the page leads with - sourced, attributed, no disparagement. */
  gap: string;
  /** Review-derived observation from V1 research. Attributed. */
  reviewClaim: SourcedClaim;
  /** Live structural observation we verified ourselves today. */
  liveClaim: SourcedClaim;
  featureRows: FeatureRow[];
  hasVsPage: boolean;
};

/** What we are, on every page, in one row. Never edited to sound better. */
const ASP_ROWS = (them: string, accredited: boolean): FeatureRow[] => [
  {
    feature: 'Transmits legal e-invoices to the UAE tax authority',
    us: 'No. Never. We are not in the transmission path.',
    them: accredited
      ? `Yes - ${them} is on the UAE Ministry of Finance pre-approved list.`
      : `${them} sells clearance/transmission in the markets it covers.`,
    advantageThem: true,
  },
  {
    feature: 'FTA-accredited / UAE-accredited service provider (ASP)',
    us: 'No.',
    them: accredited
      ? 'Yes - listed by the Ministry of Finance.'
      : 'Not listed on the UAE Ministry of Finance pre-approved list at the date we checked.',
    advantageThem: accredited,
  },
  {
    feature: 'Statutory archival (5-year UAE retention)',
    us: 'No. We store nothing for you.',
    them: 'Yes - archival is part of the platform.',
    advantageThem: true,
  },
];

export const COMPETITORS: Record<CompetitorSlug, Competitor> = {
  cleartax: {
    name: 'ClearTax UAE',
    shortName: 'ClearTax',
    pricing: 'No public price - contact sales',
    pricingShort: 'contact-sales',
    pricingSource: 'https://www.cleartax.com/ae/e-invoicing-software',
    pricingSourceLabel: 'cleartax.com/ae/e-invoicing-software',
    pricingEvidence:
      'We fetched the ClearTax UAE e-invoicing page on 14 July 2026. It publishes no price, in any currency, on any tier. The calls to action are "Get in touch", "Book a Demo" and "Request a Demo". You cannot find out what it costs without talking to a salesperson.',
    accredited: true,
    accreditationNote:
      'ClearTax (Defmacro Software DMCC) appears on the UAE Ministry of Finance list of pre-approved e-invoicing service providers. Its own page describes it as an FTA-approved Accredited Service Provider and an open Peppol Access Point.',
    shape:
      'A full accredited service provider: PINT AE generation, transmission via Peppol, 5-year archival, ERP and POS connectors, and a cloud invoice management portal.',
    gap: 'You cannot start without a sales call, and you cannot see a price before you have one.',
    reviewClaim: {
      text: 'A UAE small-business thread cited in our V1 research reports high onboarding fees for smaller buyers and frustration with support responsiveness.',
      url: 'https://www.reddit.com/r/SmallBusinessUAE/comments/1rf5kq9/any_uae_einvoicing_asp_member_here/',
      label: 'r/SmallBusinessUAE - "Any UAE e-invoicing ASP member here?"',
      caveat:
        'This is a small number of self-reported buyer comments, not a survey. Reddit blocks automated fetching, so we link the thread rather than re-quote it; read it yourself and weigh it accordingly.',
    },
    liveClaim: {
      text: 'Verified by us on 14 July 2026: the ClearTax UAE e-invoicing page carries no price and no self-serve signup - only "Book a Demo" and "Get in touch".',
      url: 'https://www.cleartax.com/ae/e-invoicing-software',
      label: 'ClearTax UAE e-invoicing page',
    },
    featureRows: [
      {
        feature: 'Preflight validation against PINT AE / UBL 2.1',
        us: 'Yes - it is the entire product. POST an invoice, get a field-level error list back.',
        them: 'Yes - real-time validation is bundled inside the platform, per its product page.',
      },
      ...ASP_ROWS('ClearTax', true),
      {
        feature: 'Published price you can read without a sales call',
        us: '$0 trial / $29 / $99 per month, on the pricing page.',
        them: 'No public price. CTAs are "Get in touch" and "Book a Demo" (checked 14 July 2026).',
      },
      {
        feature: 'Self-serve start',
        us: 'Sign up, get a key, POST an invoice. No call.',
        them: 'Demo request first, per the CTAs on the page.',
      },
      {
        feature: 'Runs in CI before anything leaves your network',
        us: 'Yes - that is the design. Fail the build on a malformed invoice.',
        them: 'Validation happens inside the platform, as part of the submission flow.',
      },
      {
        feature: 'Works alongside your existing ASP',
        us: 'Yes - we assume you already have one, or will need one.',
        them: 'It is the ASP.',
        advantageThem: true,
      },
    ],
    hasVsPage: true,
  },

  comarch: {
    name: 'Comarch EDI and e-Invoicing',
    shortName: 'Comarch',
    pricing: 'No public price - contact sales (Professional and Enterprise tiers)',
    pricingShort: 'contact-sales',
    pricingSource: 'https://www.comarch.com/trade-and-services/data-management/e-invoicing/',
    pricingSourceLabel: 'comarch.com - e-invoicing',
    pricingEvidence:
      'We fetched Comarch\'s e-invoicing product page on 14 July 2026. It publishes no figures. It describes a "transparent cost calculation" driven by monthly document volume, number of countries and integration complexity - which is a quote, not a price. The CTAs are "Book a Demo" and "Contact us".',
    accredited: true,
    accreditationNote:
      'Comarch Middle East FZ LLC appears on the UAE Ministry of Finance list of pre-approved e-invoicing service providers. Comarch also states Peppol Access Point certification and direct integration with the UAE EIS platform.',
    shape:
      'A broad enterprise EDI and e-invoicing suite: EDIFACT, XML, UBL, IDOC, X12, ZUGFeRD and PDF, 60+ countries, direct integrations with national platforms, plus a separate e-archive module.',
    gap: 'The unit of sale is a multi-country EDI programme. There is no small UAE-only thing you can buy today with a credit card.',
    reviewClaim: {
      text: 'G2 review synthesis for Comarch EDI and e-Invoicing, cited in our V1 research, reports that pricing is complex - particularly for smaller companies.',
      url: 'https://www.g2.com/de/products/comarch-edi-and-e-invoicing/reviews',
      label: 'G2 - Comarch EDI and e-Invoicing reviews',
      caveat:
        'G2 blocks automated fetching (HTTP 403 when we tried on 14 July 2026), so we link the review page rather than re-verify it line by line. Read it yourself.',
    },
    liveClaim: {
      text: 'Verified by us on 14 July 2026: Comarch publishes no price. Cost is calculated per deal from document volume, country count and integration complexity.',
      url: 'https://www.comarch.com/trade-and-services/data-management/e-invoicing/',
      label: 'Comarch e-invoicing page',
    },
    featureRows: [
      {
        feature: 'Preflight validation against PINT AE / UBL 2.1',
        us: 'Yes - narrow, UAE-only, field-level errors with the rule id.',
        them: 'Format handling and conversion across many standards, inside the EDI platform.',
      },
      ...ASP_ROWS('Comarch', true),
      {
        feature: 'Published price you can read without a sales call',
        us: '$0 trial / $29 / $99 per month, on the pricing page.',
        them: 'No public price. Cost is quoted per deal (checked 14 July 2026).',
      },
      {
        feature: 'Scope',
        us: 'One country, one job: UAE invoice preflight.',
        them: '60+ countries, EDI, orders, despatch advice, archival. Far more product than we have.',
        advantageThem: true,
      },
      {
        feature: 'Self-serve start',
        us: 'Sign up, get a key, POST an invoice.',
        them: 'Demo and scoping conversation.',
      },
      {
        feature: 'Runs in CI before anything leaves your network',
        us: 'Yes - fail the build on a malformed invoice.',
        them: 'Validation sits inside the managed integration flow.',
      },
    ],
    hasVsPage: true,
  },

  sovos: {
    name: 'Sovos',
    shortName: 'Sovos',
    pricing: 'No public price - "custom pricing based on your company and needs"',
    pricingShort: 'quote-only',
    pricingSource: 'https://sovos.com/vat/products/einvoice/',
    pricingSourceLabel: 'sovos.com - eInvoice',
    pricingEvidence:
      'We fetched the Sovos eInvoice product page on 14 July 2026. It states that pricing is custom, based on your company and needs. No figure is published. The CTAs are "Request Your Personalized Demo", "Talk to a Compliance Expert" and "Book a Call".',
    accredited: false,
    accreditationNote:
      'We checked the UAE Ministry of Finance list of pre-approved e-invoicing service providers on 14 July 2026. Sovos was not on it. That is an observation about one list on one date, not a judgement about the product - Sovos may work through a partner, and the list changes. Verify against the official list before you buy, exactly as you should for us.',
    shape:
      'A multi-jurisdiction indirect-tax and e-invoicing compliance platform: clearance and transmission across 65+ countries, e-archiving, real-time VAT/GST determination, native SAP and Oracle integration.',
    gap: 'It is bought as an enterprise compliance programme. There is no lightweight UAE-only tier you can adopt in an afternoon.',
    reviewClaim: {
      text: 'G2 review synthesis for Sovos, cited in our V1 research, reports a complex UI and heavy customization, with a review-derived implementation time of roughly four months.',
      url: 'https://www.g2.com/products/sovos/reviews',
      label: 'G2 - Sovos reviews',
      caveat:
        'G2 blocks automated fetching (HTTP 403 when we tried on 14 July 2026), so we link the review page rather than re-verify it line by line. "Roughly four months" is derived from reviewer-reported implementation times, not published by Sovos.',
    },
    liveClaim: {
      text: 'Verified by us on 14 July 2026: Sovos publishes no price - the eInvoice page says pricing is custom to your company and needs, and every CTA is a demo or a call.',
      url: 'https://sovos.com/vat/products/einvoice/',
      label: 'Sovos eInvoice product page',
    },
    featureRows: [
      {
        feature: 'Preflight validation against PINT AE / UBL 2.1',
        us: 'Yes - UAE-only, field-level, returned in the API response.',
        them: 'Validation is part of the clearance workflow across the countries it covers.',
      },
      ...ASP_ROWS('Sovos', false),
      {
        feature: 'Published price you can read without a sales call',
        us: '$0 trial / $29 / $99 per month, on the pricing page.',
        them: 'None. Pricing is custom per company (checked 14 July 2026).',
      },
      {
        feature: 'Jurisdictions covered',
        us: 'One: the UAE.',
        them: '65+ countries, B2B, B2G and B2C mandates. Vastly broader than us.',
        advantageThem: true,
      },
      {
        feature: 'Time to first useful result',
        us: 'Minutes - one API key, one POST.',
        them: 'An implementation project. Reviewers report months, not minutes.',
      },
      {
        feature: 'Works alongside your accredited provider',
        us: 'Yes - we run before it, never instead of it.',
        them: 'It aims to be the compliance platform of record.',
        advantageThem: true,
      },
    ],
    hasVsPage: false,
  },
};

/** Slugs that get a /vs/ page. V1 sets vs_page: null for Sovos - respect it. */
export const VS_SLUGS = (Object.keys(COMPETITORS) as CompetitorSlug[]).filter(
  (slug) => COMPETITORS[slug].hasVsPage,
);
