import Link from 'next/link';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { POSTS } from '@/lib/posts';

// SUPPORTING HUB for "e invoicing UAE" - the blog is the informational cluster.
export const metadata = pageMetadata({
  title: 'UAE e-invoicing blog - rules, errors and developer guides',
  description:
    'Practical writing on UAE e-invoicing: PINT AE rules, TRN formats, the errors that get invoices rejected, and how to validate them before you submit.',
  path: '/blog',
});

const published = POSTS.filter((p) => p.status === 'published');
const planned = POSTS.filter((p) => p.status === 'planned');

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
          ]),
        )}
      />

      <section>
        <div className="container">
          <h1>The UAE e-invoicing blog</h1>
          <p className="lead">
            No thought leadership. Just the rules that reject invoices, the fields that break, and
            the code that catches them first.
          </p>

          {published.length === 0 && (
            <div className="notice">
              <strong>Nothing published yet</strong>
              <p>
                The editorial calendar below is the real one - one post a week for eight weeks,
                starting at launch. Want the first one in your inbox?{' '}
                <Link href="/signup">Sign up for free</Link>.
              </p>
            </div>
          )}

          {published.length > 0 && (
            <div className="grid grid-2" style={{ marginTop: 24 }}>
              {published.map((p) => (
                <article key={p.slug} className="card">
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="container">
          <h2>Coming up</h2>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Post</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {planned.map((p) => (
                <tr key={p.slug}>
                  <td>{p.week}</td>
                  <td>
                    <strong>{p.title}</strong>
                    <br />
                    {p.summary}
                  </td>
                  <td>Planned</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
