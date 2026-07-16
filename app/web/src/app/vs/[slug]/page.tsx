import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GuardrailNotice } from '@/components/Chrome';
import {
  COMPETITORS,
  MOF_ASP_LIST_URL,
  SOURCES_FETCHED_ON,
  VS_SLUGS,
} from '@/lib/competitors';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { GUARDRAIL, PRICING, type CompetitorSlug } from '@/lib/site';

/**
 * M2 head-to-head page. Supports "UAE e invoicing software" comparison intent.
 * Only competitors with vs_page set in handoffs/V1/decision.json get a page here -
 * Sovos is vs_page: null, so /vs/sovos does not exist and is not in the sitemap.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return VS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = COMPETITORS[slug as CompetitorSlug];
  if (!c || !c.hasVsPage) {
    return pageMetadata({ title: 'Compare', description: 'Not found', path: '/vs', noindex: true });
  }
  return pageMetadata({
    title: `einvoicecheck.ae vs ${c.shortName} - UAE e-invoicing software compared (2026)`,
    description: `${c.shortName} is an accredited UAE service provider at a ${c.pricingShort} price. einvoicecheck.ae is a $29/mo preflight validator that does not transmit, archive, or replace it. Side by side, with sources.`,
    path: `/vs/${slug}`,
  });
}

export default async function VsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = COMPETITORS[slug as CompetitorSlug];
  if (!c || !c.hasVsPage) notFound();

  const faqs = [
    {
      q: `Is einvoicecheck.ae a replacement for ${c.name}?`,
      a: `No, and choosing us instead of an accredited provider would leave you non-compliant. ${GUARDRAIL} ${c.shortName} is on the UAE Ministry of Finance pre-approved list; we are not. The honest comparison is "both", not "either".`,
    },
    {
      q: `Then why would I pay for both?`,
      a: `Because the two do different jobs. ${c.shortName} transmits and archives. einvoicecheck.ae stops a malformed invoice reaching it - in your CI pipeline, before submission - for $29 a month. If your ERP export is what keeps breaking, that is the $29.`,
    },
    {
      q: `What does ${c.name} cost?`,
      a: `${c.pricing}. ${c.pricingEvidence} We publish ours: free tier, then $29 or $99 a month.`,
    },
    {
      q: `Is einvoicecheck.ae FTA-accredited?`,
      a: `No. We are not on the UAE Ministry of Finance list of pre-approved e-invoicing service providers, we do not transmit legal e-invoices, and we do not provide statutory archival. Anyone telling you a validator can do those things is wrong.`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/vs' },
            { name: `einvoicecheck.ae vs ${c.shortName}`, path: `/vs/${slug}` },
          ]),
        )}
      />

      <section>
        <div className="container">
          <nav aria-label="Breadcrumb" className="source" style={{ marginBottom: 12 }}>
            <Link href="/">Home</Link> / Compare / einvoicecheck.ae vs {c.shortName}
          </nav>

          <span className="badge">All sources fetched {SOURCES_FETCHED_ON}</span>
          <h1>einvoicecheck.ae vs {c.shortName}</h1>
          <p className="lead">
            This is not a fair fight and it is not meant to be one. {c.shortName} can file your
            invoice with the tax authority. <strong>We cannot, and never will.</strong> What we do is
            stop the invoice being wrong before it gets there - for{' '}
            {PRICING.starter.priceLabel} a month, with no sales call.
          </p>

          <GuardrailNotice />

          <div className="claim">
            <p>
              <strong>The gap we are aiming at:</strong> {c.gap}
            </p>
            <p className="caveat">
              {c.reviewClaim.text}{' '}
              <a href={c.reviewClaim.url} rel="nofollow noopener" target="_blank">
                {c.reviewClaim.label}
              </a>
              {c.reviewClaim.caveat ? ` - ${c.reviewClaim.caveat}` : null}
            </p>
          </div>

          <h2 style={{ marginTop: 32 }}>Side by side</h2>
          <table className="compare" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th className="rowhead"></th>
                <th>einvoicecheck.ae</th>
                <th>{c.name}</th>
              </tr>
            </thead>
            <tbody>
              {c.featureRows.map((row) => (
                <tr key={row.feature}>
                  <th className="rowhead">{row.feature}</th>
                  <td className="us">{row.us}</td>
                  <td className={row.advantageThem ? 'them-wins' : undefined}>
                    {row.them}
                    {row.advantageThem ? ' (they win this row)' : ''}
                  </td>
                </tr>
              ))}
              <tr>
                <th className="rowhead">Free tier</th>
                <td className="us">
                  {PRICING.trial.priceLabel} - {PRICING.trial.docs}, no card.
                </td>
                <td>Not published on their page (checked {SOURCES_FETCHED_ON}).</td>
              </tr>
            </tbody>
          </table>
          <p className="source">
            {c.shortName} pricing:{' '}
            <a href={c.pricingSource} rel="nofollow noopener" target="_blank">
              {c.pricingSourceLabel}
            </a>
            , fetched {SOURCES_FETCHED_ON}. Accreditation:{' '}
            <a href={MOF_ASP_LIST_URL} rel="nofollow noopener" target="_blank">
              UAE Ministry of Finance pre-approved provider list
            </a>
            , checked {SOURCES_FETCHED_ON}.
          </p>

          <h2 style={{ marginTop: 32 }}>The honest recommendation</h2>
          <p>
            If you have to choose one, <strong>choose {c.shortName}</strong> - or another provider
            from the official list. You legally need someone who can transmit and archive. We are not
            that, and a comparison page that implied otherwise would be lying to you.
          </p>
          <p>
            Buy einvoicecheck.ae <em>as well</em>, and only if the thing costing you time is
            rejected files: TRN formats, missing tax categories, totals that do not add up, code
            lists that drifted. That is a $29 problem, and it should not take a quote request to
            fix.
          </p>

          <h2 style={{ marginTop: 32 }}>Common questions</h2>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginTop: 18 }}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <div className="cta-row">
            <Link href="/waitlist" className="btn btn-primary">
              Start free - join the waitlist
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              See pricing
            </Link>
            <Link href={`/alternatives/${slug}`} className="btn btn-ghost">
              {c.shortName} alternatives
            </Link>
          </div>
          <p className="source">
            Free tier: {PRICING.trial.docs}, no card. Billing is not live yet, so the waitlist is the
            way in.
          </p>
        </div>
      </section>
    </>
  );
}
