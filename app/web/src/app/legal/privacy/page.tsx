import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'What einvoicecheck.ae does with the invoice payloads you submit for validation, the API-key hashes and usage events stored in MongoDB, and the rate-limit counters held in Redis. Payments are handled by Dodo Payments.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Privacy Policy', path: '/legal/privacy' },
          ]),
        )}
      />

      <section>
        <div className="container legal">
          <h1>Privacy Policy</h1>
          <p className="meta">
            Effective date: <Todo>{TODO.legalEffectiveDate}</Todo>
          </p>

          <div className="notice">
            <strong>Draft - not reviewed by a lawyer</strong>
            <p>
              This document has not been reviewed by qualified legal counsel or a data protection
              specialist. Highlighted items are facts that have not been decided yet - most
              importantly, retention periods. They are left blank rather than invented.
            </p>
          </div>

          <h2>1. Who controls the data</h2>
          <p>
            The service is operated by <Todo>{TODO.operatorLegalName}</Todo>, an individual (sole
            proprietor) resident in <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates. There
            is no registered company. Contact for any privacy request:{' '}
            <Todo>{TODO.supportEmail}</Todo>.
          </p>

          <h2>2. What we actually receive and store</h2>
          <p>This is the complete list. There is no analytics vendor, no ad pixel, no CRM.</p>

          <h3>a. Invoice payloads you submit for validation</h3>
          <p>
            When you POST an invoice to <code>/v1/validate</code>, we receive the document you send:
            JSON, an envelope, or UBL 2.1 / PINT AE XML. <strong>These payloads routinely contain
            personal and commercial data</strong> - supplier and buyer names, Tax Registration
            Numbers, addresses, contact names, line items and amounts. We process them for one
            purpose only: to run the validation rules and return the error list to you.
          </p>
          <ul>
            <li>We do not sell them, share them, or use them to train models.</li>
            <li>
              We do not forward them to any tax authority, accredited service provider or third
              party. The service is preflight validation only - it transmits nothing.
            </li>
            <li>
              Retention: <Todo>{TODO.payloadRetention}</Todo>. Until this is fixed and published,
              assume a payload may persist transiently in server memory and in ordinary
              infrastructure logs; do not submit data you are not comfortable transmitting to us.
            </li>
            <li>
              If you need certainty today, redact or synthesise the sensitive fields before
              validating. Validation rules operate on structure and format, so most checks work on
              redacted values.
            </li>
          </ul>

          <h3>b. API keys and usage metering (MongoDB)</h3>
          <ul>
            <li>
              We store a <strong>hash</strong> of your API key, never the key itself in plain text.
            </li>
            <li>
              We store <strong>usage-metering events</strong> per key: timestamp, endpoint, whether
              the request was accepted, and counters used to enforce your plan quota. These are what{' '}
              <code>GET /usage</code> reports back to you.
            </li>
            <li>
              We store the email address you gave us when you created your account, so we can send
              you the key and service notices.
            </li>
            <li>
              Retention: usage events and request logs - <Todo>{TODO.logRetention}</Todo>.
            </li>
          </ul>

          <h3>c. Rate limiting (Redis)</h3>
          <p>
            We keep short-lived counters in Redis to enforce rate limits. These are keyed to your
            API key hash and/or requesting IP address and expire automatically within the rate-limit
            window. They are not used for profiling.
          </p>

          <h3>d. Payments</h3>
          <p>
            <strong>We never see your card details.</strong> Dodo Payments is the merchant of record
            and processes all payments. Card numbers, CVCs and bank details are collected and stored
            by Dodo Payments under their own privacy policy, not by us. This website has no payment
            form. Billing is not live yet, so at present no payment data exists at all.
          </p>

          <h2>3. Legal basis and purpose</h2>
          <ul>
            <li>
              <strong>Performing the contract:</strong> we cannot validate an invoice without
              receiving it, or meter a plan without counting requests.
            </li>
            <li>
              <strong>Legitimate interest:</strong> rate limiting and abuse prevention, keeping the
              service up.
            </li>
            <li>
              <strong>Consent:</strong> product and service emails. Every email has a way to stop
              them.
            </li>
          </ul>

          <h2>4. Who else touches the data</h2>
          <p>
            Sub-processors used to run the service: our hosting/infrastructure provider, our
            MongoDB and Redis hosts, our transactional email provider, and Dodo Payments for
            billing. We do not use advertising or analytics trackers on this site. A definitive
            named sub-processor list will be published here before billing goes live:{' '}
            <Todo>[OPERATOR TO COMPLETE: named sub-processor list (hosting, MongoDB host, Redis host, email provider)]</Todo>
            .
          </p>

          <h2>5. Where the data lives</h2>
          <p>
            The operator is in the UAE, and infrastructure may be hosted outside the UAE. This means
            invoice payloads you submit may be processed outside the UAE.{' '}
            <Todo>[OPERATOR TO COMPLETE: hosting region(s) for API, MongoDB and Redis]</Todo>. If
            data residency matters to your compliance position, confirm this before sending real
            invoices.
          </p>

          <h2>6. Your rights</h2>
          <p>
            You can ask us what we hold about you, ask for a copy, ask us to correct it, or ask us
              to delete it - including deleting your key and your usage history. Write to{' '}
              <Todo>{TODO.supportEmail}</Todo>. We will respond within{' '}
          </p>

          <h2>7. Security</h2>
          <p>
            Traffic is served over TLS. API keys are stored hashed. Access to production
            infrastructure is limited to the operator. We do not claim any security certification -
            there is no SOC 2, no ISO 27001, and no independent audit of this service.
          </p>

          <h2>8. Children</h2>
          <p>This is a developer tool for businesses. It is not directed at children.</p>

          <h2>9. Changes</h2>
          <p>
            Changes are published on this page with a new effective date. Material changes to how we
            handle invoice payloads will be emailed to active key holders.
          </p>

          <h2>10. Contact</h2>
          <p>
            Privacy questions and deletion requests: <Todo>{TODO.supportEmail}</Todo>. Other
            channels are on the <Link href="/contact">contact page</Link>.
          </p>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
