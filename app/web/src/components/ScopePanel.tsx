const INCLUDED = [
  'Invoice type and required terms',
  'Supplier and buyer UAE TRN format',
  'Currency and code-list membership',
  'VAT category and rate consistency',
  'Line arithmetic, tax breakdown and totals',
];

const EXCLUDED = [
  'Complete official XSD or Schematron conformity',
  'FTA registration lookup',
  'Legal transmission, filing or archival',
  'Guaranteed ASP or authority acceptance',
];

function DisclosureList({ items }: { items: string[] }) {
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function ScopePanel() {
  return (
    <section id="scope" className="container disclosure-section">
      <header className="section-header">
        <h2 className="section-title">Details, when you need them.</h2>
      </header>
      <div className="disclosure-list">
        <details className="disclosure-item">
          <summary>What we check</summary>
          <DisclosureList items={INCLUDED} />
        </details>
        <details className="disclosure-item">
          <summary>Current limitations</summary>
          <DisclosureList items={EXCLUDED} />
          <p>Preflight only. Your accredited provider still handles legal transmission.</p>
        </details>
        <details className="disclosure-item">
          <summary>Privacy and data handling</summary>
          <p>Submitted content is validated in memory and is not persisted by the application, database or rate-limit store.</p>
        </details>
      </div>
    </section>
  );
}
