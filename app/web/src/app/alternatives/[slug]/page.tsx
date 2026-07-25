import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GuardrailNotice } from '@/components/Chrome';
import { COMPETITORS, MOF_ASP_LIST_URL, SOURCES_FETCHED_ON } from '@/lib/competitors';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { COMPETITOR_SLUGS, GUARDRAIL, type CompetitorSlug } from '@/lib/site';

/**
 * M2 comparison page.
 * PRIMARY KEYWORD: "FTA approved accounting software in UAE" (480/mo, transactional)
 * plus the exact-match "[competitor] alternative" query.
 *
 * Honesty rules enforced here:
 * - Every competitor claim links to the page it came from and states the fetch date.
 * - Competitors that ARE accredited service providers do more than we do. The feature
 *   table says so in their column, in plain language.
 * - No invented prices. If a vendor is contact-sales, the table says contact-sales.
 */

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = COMPETITORS[slug as CompetitorSlug];
  if (!c) {
    return pageMetadata({
      title: 'Alternatives',
      description: 'Not found',
      path: '/alternatives',
      noindex: true,
    });
  }
  return pageMetadata({
    title: `${c.shortName} alternative for UAE e-invoicing (2026) - honest comparison`,
    description: `Looking for a ${c.shortName} alternative? ${c.shortName} is ${c.pricingShort}. einvoicecheck.ae is a $29/mo preflight validator - it is NOT an accredited service provider and does not transmit invoices. What that means, with sources.`,
    path: `/alternatives/${slug}`,
  });
}

export default async function AlternativesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = COMPETITORS[slug as CompetitorSlug];
  if (!c) notFound();

  const faqs = [
    {
      q: `Is ${c.name} FTA-approved?`,
      a: c.accredited
        ? `Yes - ${c.shortName} appears on the UAE Ministry of Finance list of pre-approved e-invoicing service providers (checked ${SOURCES_FETCHED_ON}). einvoicecheck.ae does not, and does not claim to. Accreditation applies to service providers that transmit invoices; we are a preflight validator that runs before one.`
        : `We checked the UAE Ministry of Finance list of pre-approved e-invoicing service providers on ${SOURCES_FETCHED_ON} and did not find ${c.shortName} on it. Check the official list yourself before you buy - and note einvoicecheck.ae is not on it either, because we are a preflight validator, not a service provider.`,
    },
    {
      q: `What does ${c.name} cost?`,
      a: `${c.pricing}. ${c.pricingEvidence} We will not guess at a number on their behalf. einvoicecheck.ae publishes $0 (free tier) / $29 / $99 per month.`,
    },
    {
      q: `Can einvoicecheck.ae replace ${c.name}?`,
      a: `No. ${GUARDRAIL} If ${c.shortName} is your accredited service provider, you still need it. What we replace is the part where malformed invoices reach it in the first place.`,
    },
    {
      q: `So what is einvoicecheck.ae actually for?`,
      a: `Catching a bad UAE e-invoice before you submit it: PINT AE / UBL 2.1 structure, TRN format, required tax fields, totals arithmetic and code lists. Self-serve, in CI, at a published price. That is the whole job.`,
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
            { name: 'Alternatives', path: '/alternatives' },
            { name: `${c.shortName} alternative`, path: `/alternatives/${slug}` },
          ]),
        )}
      />

      <section>
        <div className="container">
          <nav aria-label="Breadcrumb" className="source" style={{ marginBottom: 12 }}>
            <Link href="/">Home</Link> / Alternatives / {c.shortName} alternative
          </nav>

          <span className="badge">All sources fetched {SOURCES_FETCHED_ON}</span>
          <h1>{c.shortName} alternative for UAE e-invoicing</h1>
          <p className="lead">
            The gap, first: <strong>{c.gap}</strong> Verified on their own page, not inferred -{' '}
            {c.liveClaim.text.replace(/^Verified by us on [^:]+: /, '')}{' '}
            <a href={c.liveClaim.url} rel="nofollow noopener" target="_blank">
              [{c.liveClaim.label}]
            </a>
          </p>

          <div className="claim">
            <p>{c.reviewClaim.text}</p>
            <p className="caveat">
              Source:{' '}
              <a href={c.reviewClaim.url} rel="nofollow noopener" target="_blank">
                {c.reviewClaim.label}
              </a>
              {c.reviewClaim.caveat ? ` - ${c.reviewClaim.caveat}` : null}
            </p>
          </div>

          <GuardrailNotice />

          <h2 style={{ marginTop: 32 }}>
            Before anything else: what &quot;FTA approved&quot; actually covers
          </h2>
          <p>
            Accreditation in the UAE applies to <strong>service providers</strong> on the official
            Ministry of Finance list - the parties that transmit your invoice - not to every tool in
            your invoicing chain.
          </p>
          <p>{c.accreditationNote}</p>
          <p>
            <strong>einvoicecheck.ae is not on that list and never claims to be.</strong> If you are
            shopping for an accredited provider, {c.accredited ? `${c.shortName} is one and we are not` : 'go to the official list'}
            . Read it here:{' '}
            <a href={MOF_ASP_LIST_URL} rel="nofollow noopener" target="_blank">
              UAE Ministry of Finance - pre-approved e-invoicing service providers
            </a>{' '}
            (checked {SOURCES_FETCHED_ON}).
          </p>

          <h2 style={{ marginTop: 32 }}>{c.shortName} vs einvoicecheck.ae, feature by feature</h2>
          <p className="source">
            Rows where {c.shortName} genuinely does more than we do are marked. There are several.
            That is not a concession, it is the point: we are a smaller tool doing a narrower job.
          </p>
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
            </tbody>
          </table>
          <p className="source">
            {c.shortName} pricing:{' '}
            <a href={c.pricingSource} rel="nofollow noopener" target="_blank">
              {c.pricingSourceLabel}
            </a>
            , fetched {SOURCES_FETCHED_ON}. Accreditation status:{' '}
            <a href={MOF_ASP_LIST_URL} rel="nofollow noopener" target="_blank">
              UAE Ministry of Finance list
            </a>
            , checked {SOURCES_FETCHED_ON}. Our pricing:{' '}
            <Link href="/pricing">einvoicecheck.ae pricing</Link>.
          </p>

          <h2 style={{ marginTop: 32 }}>
            When {c.shortName} is the right answer and we are not
          </h2>
          <ul className="clean">
            <li>
              You need to actually file. {c.accredited
                ? `${c.shortName} is on the Ministry of Finance pre-approved list; we are not.`
                : 'You need an accredited service provider from the official Ministry of Finance list. We are not one.'}
            </li>
            <li>You need 5-year statutory archival. We store nothing for you.</li>
            <li>You need multi-country coverage, EDI, or a managed integration programme.</li>
            <li>You want one vendor to own end-to-end compliance and are happy to buy that way.</li>
          </ul>

          <h2 style={{ marginTop: 32 }}>When einvoicecheck.ae is worth $29</h2>
          <ul className="clean">
            <li>
              Your ERP export is the thing that keeps failing, and you want to catch it in CI before
              it ever reaches your provider.
            </li>
            <li>You want a price on a page and an API key in five minutes, not a demo call.</li>
            <li>
              You already have (or will have) an accredited provider and just need the file to be
              right before it goes.
            </li>
          </ul>

          <h2 style={{ marginTop: 32 }}>Common questions</h2>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginTop: 18 }}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <div className="cta-row">
            <Link href="/signup" className="btn btn-primary">
              Start free - sign up now
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              See the $29 price
            </Link>
            {c.hasVsPage && (
              <Link href={`/vs/${slug}`} className="btn btn-ghost">
                einvoicecheck.ae vs {c.shortName}
              </Link>
            )}
          </div>
          <p className="source">
            The free tier is 100 validations, no card. Sign up to get started immediately.
          </p>
        </div>
      </section>
    </>
  );
}
