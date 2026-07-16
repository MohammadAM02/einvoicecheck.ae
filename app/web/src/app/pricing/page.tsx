import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { PRICING, SITE_URL } from '@/lib/site';

// PRIMARY KEYWORD: "UAE e invoicing software" (590/mo, transactional - price comparison intent)
export const metadata = pageMetadata({
  title: 'Pricing - UAE e-invoicing software without the sales call',
  description:
    'Public pricing for UAE e-invoice validation: free trial, $29/mo and $99/mo. Most UAE e-invoicing software is quote-only. Billing is not live yet - join the waitlist.',
  path: '/pricing',
});

const tiers = [PRICING.trial, PRICING.starter, PRICING.growth];

const faqs = [
  {
    q: 'How much does UAE e-invoicing software cost?',
    a: 'Most UAE e-invoicing vendors are quote-led, and buyers report base fees in the thousands of dirhams plus per-document usage. One visible entrant publishes AED 1,470 per year for a 500-document API tier, roughly $33 a month. einvoicecheck.ae publishes its price: free trial, $29/month, or $99/month.',
  },
  {
    q: 'Can I pay today?',
    a: 'No. Billing is not live yet. Payments will run through Dodo Payments once checkout is wired up. Until then, joining the waitlist is the only way to reserve a launch API key, and no card details are collected.',
  },
  {
    q: 'Does the price include transmitting invoices to the FTA?',
    a: 'No. einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival. You pay an accredited provider separately for transmission.',
  },
  {
    q: 'What counts as one validation?',
    a: 'One POST to /v1/validate with one invoice document. Failed validations count the same as passing ones - the work is identical.',
  },
];

const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'einvoicecheck.ae',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (HTTP API)',
  url: `${SITE_URL}/pricing`,
  description:
    'UAE e-invoice preflight validation API with public pricing. Preflight validation only - not FTA-accredited and not a transmission channel.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '99',
    offerCount: 3,
    availability: 'https://schema.org/PreOrder',
    offers: tiers.map((t) => ({
      '@type': 'Offer',
      name: t.name,
      price: String(t.price),
      priceCurrency: 'USD',
      availability: 'https://schema.org/PreOrder',
      url: `${SITE_URL}/waitlist`,
    })),
  },
};

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(offerSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
        )}
      />

      <section>
        <div className="container">
          <h1>UAE e-invoicing software with a price on the page</h1>
          <p className="lead">
            Every other quote in this category starts with a discovery call. Here is the number.
            Pick a tier, validate invoices, keep your accredited provider.
          </p>

          <div className="notice">
            <strong>Billing is not live yet</strong>
            <p>
              You cannot buy a plan today. Checkout will run on Dodo Payments once it is wired up.
              No card details are collected anywhere on this site right now.{' '}
              <Link href="/waitlist">Join the waitlist</Link> and you will get a launch API key and
              locked launch pricing.
            </p>
          </div>

          <div className="grid grid-3" style={{ marginTop: 24 }}>
            {tiers.map((t) => (
              <div key={t.name} className={`card${t.name === 'Starter' ? ' highlight' : ''}`}>
                <h3>{t.name}</h3>
                <div className="price">
                  {t.priceLabel} <span>{t.cadence}</span>
                </div>
                <p style={{ marginTop: 10 }}>
                  <strong>{t.docs}</strong>
                </p>
                <p>{t.blurb}</p>
                <ul className="clean">
                  <li>POST /v1/validate (JSON, envelope, or UBL / PINT AE XML)</li>
                  <li>Per-key usage metering at GET /usage</li>
                  <li>Machine-readable errors with a suggested fix</li>
                  {t.name !== 'Free trial' && <li>Priority email support</li>}
                </ul>
                <div className="cta-row">
                  <Link href="/waitlist" className="btn btn-primary">
                    Join the waitlist
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <GuardrailNotice />
        </div>
      </section>

      <section>
        <div className="container">
          <h2>What you are comparing it against</h2>
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Published price</th>
                <th>Shape</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>einvoicecheck.ae</td>
                <td>$0 trial / $29 / $99 per month</td>
                <td>Self-serve preflight validation API</td>
              </tr>
              <tr>
                <td>
                  <Link href="/alternatives/cleartax">ClearTax UAE</Link>
                </td>
                <td>Contact sales</td>
                <td>Full accredited-provider suite</td>
              </tr>
              <tr>
                <td>
                  <Link href="/alternatives/comarch">Comarch EDI &amp; e-Invoicing</Link>
                </td>
                <td>Contact sales</td>
                <td>Enterprise EDI platform</td>
              </tr>
              <tr>
                <td>
                  <Link href="/alternatives/sovos">Sovos</Link>
                </td>
                <td>Quote only</td>
                <td>Multi-jurisdiction compliance platform</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: 14 }}>
            Those platforms do things this API deliberately does not do - above all, they can
            actually transmit your invoice. This is the cheap linting layer that sits in front of
            them.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>Pricing questions</h2>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginTop: 18 }}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
