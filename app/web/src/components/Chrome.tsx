import Link from 'next/link';
import { GUARDRAIL } from '@/lib/site';

/**
 * Renders an unresolved real-world fact as a visible placeholder.
 * Never replace one of these with an invented value.
 */
export function Todo({ children }: { children: string }) {
  return <mark className="todo">{children}</mark>;
}

export function SiteHeader() {
  return (
    <header className="site">
      <div className="container bar">
        <Link href="/" className="brand">
          einvoicecheck<span style={{ color: '#34d399' }}>.ae</span>
        </Link>
        <nav>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/tools/uae-e-invoice-validator">Free tool</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">
            Get an API key
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** The honesty block. Must appear on every page - it is the positioning. */
export function GuardrailNotice() {
  return (
    <div className="notice">
      <strong>What this is not</strong>
      <p>{GUARDRAIL}</p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="container">
        <div className="cols">
          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/docs">API docs</Link>
              </li>
              <li>
                <Link href="/waitlist">Waitlist</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Free tools</h4>
            <ul>
              <li>
                <Link href="/tools/uae-e-invoice-validator">UAE e-invoice validator</Link>
              </li>
              <li>
                <Link href="/tools/pint-ae-validator">PINT AE validator</Link>
              </li>
              <li>
                <Link href="/tools/trn-format-checker">TRN format checker</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Compare</h4>
            <ul>
              <li>
                <Link href="/alternatives/cleartax">ClearTax alternatives</Link>
              </li>
              <li>
                <Link href="/alternatives/comarch">Comarch alternatives</Link>
              </li>
              <li>
                <Link href="/alternatives/sovos">Sovos alternatives</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <Link href="/vs/cleartax">einvoicecheck vs ClearTax</Link>
              </li>
              <li>
                <Link href="/vs/comarch">einvoicecheck vs Comarch</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/legal/terms">Terms of Service</Link>
              </li>
              <li>
                <Link href="/legal/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/legal/refunds">Refund Policy</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="fine">
          Payments are processed by Dodo Payments, which acts as the merchant of record for all
          purchases. Billing is not live yet.
        </p>
        <p className="fine">{GUARDRAIL}</p>
        <p className="fine" style={{ marginTop: 8 }}>
          Before you file anything, check the official Ministry of Finance and Federal Tax Authority
          guidance and use an accredited service provider from the official list.
        </p>
      </div>
    </footer>
  );
}
