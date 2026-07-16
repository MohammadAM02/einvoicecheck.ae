import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section>
      <div className="container">
        <h1>That page does not exist</h1>
        <p className="lead">
          Try the <Link href="/docs">API docs</Link>, the <Link href="/pricing">pricing page</Link>,
          or <Link href="/">start over</Link>.
        </p>
      </div>
    </section>
  );
}
