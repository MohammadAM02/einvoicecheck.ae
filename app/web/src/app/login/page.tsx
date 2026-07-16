import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your einvoicecheck.ae dashboard.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1>Sign in</h1>
        <AuthForm mode="login" />
        <p className="muted" style={{ marginTop: 16 }}>
          No account yet? <Link href="/signup">Create one</Link>.
        </p>
      </div>
    </section>
  );
}
