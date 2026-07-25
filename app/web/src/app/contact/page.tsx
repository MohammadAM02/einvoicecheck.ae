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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
        )}
      />

      <section>
        <div className="container legal">
          <h1>Contact</h1>
          <p className="lead">
            einvoicecheck.ae is run by one person, not a support queue. Every email is read and
            answered by the operator.
          </p>

          <div className="notice">
            <strong>The support mailbox is not provisioned yet</strong>
            <p>
              The API is pre-launch and billing is not live. Until the support address is live, the{' '}
                <Link href="/signup">signup form</Link> is the working channel - it reaches the
              operator.
            </p>
          </div>

          <h2>Who operates this service</h2>
          <ul className="clean">
            <li>
              <strong>Operator:</strong> <Todo>{TODO.operatorLegalName}</Todo>. einvoicecheck.ae is
              operated by an individual (sole proprietor) based in the United Arab Emirates. There
              is no registered company, no trade licence number and no VAT registration number to
              publish.
            </li>
            <li>
              <strong>Point of contact:</strong> <Todo>{TODO.contactName}</Todo>
            </li>
            <li>
              <strong>Location:</strong> <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates.
              No public street address is published; a postal address can be provided on request to
              a party with a legitimate legal need.
            </li>
          </ul>

          <h2>How to reach us</h2>
          <table>
            <thead>
              <tr>
                <th>What you need</th>
                <th>Where to send it</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Technical support, API keys, validation results</td>
                <td>
                  <Todo>{TODO.supportEmail}</Todo>
                </td>
                <td>
                  <Todo>{TODO.supportSla}</Todo>
                </td>
              </tr>
              <tr>
                <td>Billing, invoices, receipts, refunds</td>
                <td>
                  Dodo Payments (merchant of record) - see the{' '}
                  <Link href="/legal/refunds">Refund Policy</Link>. You can also write to the
                  support address above and we will escalate.
                </td>
                <td>Per Dodo Payments&apos; own terms</td>
              </tr>
              <tr>
                <td>Privacy, data deletion, data access requests</td>
                <td>
                  <Todo>{TODO.supportEmail}</Todo> - see the{' '}
                  <Link href="/legal/privacy">Privacy Policy</Link>
                </td>
                <td>
                  <Todo>{TODO.supportSla}</Todo>
                </td>
              </tr>
              <tr>
                <td>Pre-launch access</td>
                <td>
                  <Link href="/signup">Sign up for free</Link>
                </td>
                <td>One email when keys are issued</td>
              </tr>
            </tbody>
          </table>

          <h2>What we cannot help with</h2>
          <p>
            We cannot file, transmit or archive your invoices, and we cannot give tax advice. If you
            need an invoice accepted by the FTA, you need an accredited service provider from the
            official Ministry of Finance list. We validate the file before it gets there - that is
            the whole product.
          </p>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
