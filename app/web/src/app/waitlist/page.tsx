import { GuardrailNotice } from '@/components/Chrome';
import { WaitlistForm } from '@/components/WaitlistForm';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Join the waitlist - get a UAE e-invoice validation API key at launch',
  description:
    'Sign up to get an API key for the UAE e-invoice preflight validator when it opens. Free trial at launch, launch pricing locked, no card details collected.',
  path: '/waitlist',
});

export default function WaitlistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Waitlist', path: '/waitlist' },
          ]),
        )}
      />
      <section>
        <div className="container">
          <h1>Get a key when the API opens</h1>
          <p className="lead">
            The validator is built. Billing is not wired up yet, so nobody can buy it - which means
            everyone on this list starts on the free trial and keeps launch pricing.
          </p>

          <div className="grid grid-2" style={{ marginTop: 24 }}>
            <div className="card">
              <h3>What you get</h3>
              <ul className="clean">
                <li>An API key on the free trial (100 validations) the day keys are issued</li>
                <li>Launch pricing locked: $29 or $99 a month, no onboarding fee</li>
                <li>The first blog post in the eight-week series</li>
                <li>One email. No sequence, no drip, no card details.</li>
              </ul>
            </div>
            <div className="card">
              <h3>Sign up</h3>
              <WaitlistForm source="waitlist-page" />
            </div>
          </div>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
