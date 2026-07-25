import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="section">
      <div className="container" style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>That page does not exist</h1>
        <p className="lead" style={{ margin: '0 auto' }}>
          Try the <Link href="/docs" style={{ color: 'var(--accent)' }}>API docs</Link>, the <Link href="/pricing" style={{ color: 'var(--accent)' }}>pricing page</Link>,
          or <Link href="/" style={{ color: 'var(--accent)' }}>start over</Link>.
        </p>
      </div>
    </div>
  );
}
