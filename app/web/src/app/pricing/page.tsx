import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import { PricingClient } from './PricingClient';

export const metadata = pageMetadata({
  title: 'Pricing — UAE e-invoice preflight validation',
  description: 'Public pricing for UAE e-invoice preflight validation: free access, $29/month and $99/month. Paid subscriptions are processed securely by PayPal.',
  path: '/pricing',
});

const tiers = [
  { name: 'Free trial', price: 0 },
  { name: 'Starter', price: 29 },
  { name: 'Pro', price: 99 },
];

const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'einvoicecheck.ae',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (HTTP API)',
  url: `${SITE_URL}/pricing`,
  description: 'UAE e-invoice semantic preflight validation API. Not FTA-accredited, not a transmission channel, and not full XSD or Schematron conformity validation.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '99',
    offerCount: 3,
    offers: tiers.map((tier) => ({ '@type': 'Offer', name: tier.name, price: String(tier.price), priceCurrency: 'USD', url: `${SITE_URL}/signup` })),
  },
};

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(offerSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }]))} />
      <PricingClient />
    </>
  );
}
