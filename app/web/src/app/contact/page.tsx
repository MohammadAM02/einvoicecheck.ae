import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL, TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Contact einvoicecheck.ae - support, billing and legal enquiries',
  description: 'How to reach einvoicecheck.ae for API support, PayPal subscription questions, refunds, privacy and legal enquiries.',
  path: '/contact',
  noindex: true,
});

const contactSchema = { '@context': 'https://schema.org', '@type': 'ContactPage', url: `${SITE_URL}/contact`, name: 'Contact einvoicecheck.ae', about: { '@id': `${SITE_URL}/#organization` } };

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(contactSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]))} />
      <div className="section"><div className="container legal">
        <div className="section-label">Contact</div><h1 style={{ marginBottom: 12 }}>Contact</h1>
        <p className="lead" style={{ marginBottom: 24 }}>einvoicecheck.ae is run by one person, not a support queue. Every email is read by the operator.</p>
        <div className="notice" style={{ marginBottom: 24 }}><strong>The support mailbox is not provisioned yet</strong><p style={{ marginTop: 4 }}>Until it is live, the <Link href="/signup" style={{ color: 'var(--accent)' }}>signup form</Link> is the working channel.</p></div>
        <h2>Who operates this service</h2>
        <ul className="clean"><li><strong>Operator:</strong> <Todo>{TODO.operatorLegalName}</Todo></li><li><strong>Point of contact:</strong> <Todo>{TODO.contactName}</Todo></li><li><strong>Location:</strong> <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates.</li></ul>
        <h2>How to reach us</h2>
        <table><thead><tr><th>What you need</th><th>Where to send it</th><th>Response</th></tr></thead><tbody>
          <tr><td>Technical support and API keys</td><td><Todo>{TODO.supportEmail}</Todo></td><td><Todo>{TODO.supportSla}</Todo></td></tr>
          <tr><td>Billing, receipts and refunds</td><td><Todo>{TODO.supportEmail}</Todo> — include the email used for PayPal. See the <Link href="/legal/refunds">Refund Policy</Link>.</td><td><Todo>{TODO.supportSla}</Todo></td></tr>
          <tr><td>Privacy and deletion</td><td><Todo>{TODO.supportEmail}</Todo> — see the <Link href="/legal/privacy">Privacy Policy</Link>.</td><td><Todo>{TODO.supportSla}</Todo></td></tr>
        </tbody></table>
        <p className="muted">We cannot file, transmit or archive invoices, and cannot give tax advice.</p>
        <GuardrailNotice />
      </div></div>
    </>
  );
}
