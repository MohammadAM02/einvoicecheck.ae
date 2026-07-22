import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import { PricingClient } from './PricingClient';

// PRIMARY KEYWORD: "UAE e invoicing software" (590/mo, transactional)
export const metadata = pageMetadata({
  title: 'Pricing — UAE e-invoicing software without the sales call',
  description:
    'Public pricing for UAE e-invoice validation: free trial, $29/mo and $99/mo. Most UAE e-invoicing software is quote-only. Pay via Dodo Payments or Lemon Squeezy.',
  path: '/pricing',
});

const tiers = [
  { name: 'Free trial', price: 0, priceLabel: '$0', cadence: 'for 14 days' },
  { name: 'Starter', price: 29, priceLabel: '$29', cadence: 'per month' },
  { name: 'Growth', price: 99, priceLabel: '$99', cadence: 'per month' },
];

const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'einvoicecheck.ae',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (HTTP API)',
  url: `${SITE_URL}/pricing`,
  description:
    'UAE e-invoice preflight validation API with public pricing. Preflight validation only — not FTA-accredited and not a transmission channel.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
        )}
      />
      <PricingClient />
    </>
  );
}
