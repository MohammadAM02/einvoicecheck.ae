import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL, TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Contact einvoicecheck.ae - support, billing and legal enquiries',
  description:
    'How to reach einvoicecheck.ae: support for the UAE e-invoice validation API, billing questions (handled by Dodo Payments as merchant of record), and legal or privacy enquiries.',
  path: '/contact',
});

const contactSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  url: `${SITE_URL}/contact`,
  name: 'Contact einvoicecheck.ae',
  about: { '@id': `${SITE_URL}/#organization` },
};

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(contactSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]))} />

      <div className="section">
        <div className="container legal">
          <div className="section-label">Contact</div>
          <h1 style={{ marginBottom: 12 }}>Contact</h1>
          <p className="lead" style={{ marginBottom: 24 }}>
            einvoicecheck.ae is run by one person, not a support queue. Every email is read and
            answered by the operator.
          </p>

          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>The support mailbox is not provisioned yet</strong>
            <p style={{ marginTop: 4 }}>
              The API is pre-launch and billing is not live. Until the support address is live, the{' '}
              <Link href="/signup" style={{ color: 'var(--accent)' }}>signup form</Link> is the working channel - it reaches the operator.
            </p>
          </div>

          <h2 style={{ marginBottom: 8 }}>Who operates this service</h2>
          <ul className="clean" style={{ marginBottom: 24 }}>
            <li><strong>Operator:</strong> <Todo>{TODO.operatorLegalName}</Todo>. einvoicecheck.ae is operated by an individual (sole proprietor) based in the United Arab Emirates. There is no registered company, no trade licence number and no VAT registration number to publish.</li>
            <li><strong>Point of contact:</strong> <Todo>{TODO.contactName}</Todo></li>
            <li><strong>Location:</strong> <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates. No public street address is published; a postal address can be provided on request to a party with a legitimate legal need.</li>
          </ul>

          <h2 style={{ marginBottom: 8 }}>How to reach us</h2>
          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>What you need</th><th>Where to send it</th><th>Response</th></tr>
            </thead>
            <tbody>
              <tr><td>Technical support, API keys, validation results</td><td><Todo>{TODO.supportEmail}</Todo></td><td><Todo>{TODO.supportSla}</Todo></td></tr>
              <tr><td>Billing, invoices, receipts, refunds</td><td>Dodo Payments (merchant of record) - see the <Link href="/legal/refunds" style={{ color: 'var(--accent)' }}>Refund Policy</Link>. You can also write to the support address above and we will escalate.</td><td>Per Dodo Payments&apos; own terms</td></tr>
              <tr><td>Privacy, data deletion, data access requests</td><td><Todo>{TODO.supportEmail}</Todo> - see the <Link href="/legal/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link></td><td><Todo>{TODO.supportSla}</Todo></td></tr>
              <tr><td>Pre-launch access</td><td><Link href="/signup" style={{ color: 'var(--accent)' }}>Sign up for free</Link></td><td>One email when keys are issued</td></tr>
            </tbody>
          </table>

          <h2 style={{ marginBottom: 8 }}>What we cannot help with</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            We cannot file, transmit or archive your invoices, and we cannot give tax advice. If you
            need an invoice accepted by the FTA, you need an accredited service provider from the
            official Ministry of Finance list. We validate the file before it gets there - that is
            the whole product.
          </p>

          <GuardrailNotice />
        </div>
      </div>
    </>
  );
}
