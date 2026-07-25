import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { GuardrailNotice } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Create an einvoicecheck.ae account. You get an API key immediately and 100 free validations on the trial plan.',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className="section">
      <div className="container narrow">
        <h1 style={{ marginBottom: 12 }}>Create your account</h1>
        <p className="lead" style={{ marginBottom: 24 }}>
          You get an API key the moment the account exists — no sales call, no waiting. The free
          trial covers 100 validations.
        </p>
        <GuardrailNotice />
        <AuthForm mode="signup" />
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>.
        </p>
      </div>
    </div>
  );
}
