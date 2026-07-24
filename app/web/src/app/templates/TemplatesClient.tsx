'use client';

import { useCallback, useEffect, useState } from 'react';

type TemplateMeta = {
  filename: string;
  name: string;
  description: string;
};

/**
 * Client component that fetches the template list from /api/templates and
 * renders a responsive grid of cards. Each card shows the template name,
 * a description, and a download button.
 */
export function TemplatesClient() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/templates');
        const body = await res.json();
        if (!res.ok || body.ok !== true) {
          if (!cancelled) setError(body.error ?? 'Failed to load templates.');
          return;
        }
        if (!cancelled) setTemplates(body.templates);
      } catch {
        if (!cancelled) setError('Could not reach the server. Check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDownload = useCallback((filename: string) => {
    const a = document.createElement('a');
    a.href = `/templates/${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Group templates into categories for visual organisation
  const categorized = groupByCategory(templates);

  if (loading) {
    return (
      <div className="templates-loading">
        <p className="muted">Loading templates…</p>
      </div>
    );
  }

  if (error) {
    return <p className="form-msg err">{error}</p>;
  }

  if (templates.length === 0) {
    return <p className="muted">No templates available yet.</p>;
  }

  return (
    <div className="templates-page">
      {Object.entries(categorized).map(([category, items]) => (
        <div key={category} className="template-category">
          <h2 className="template-category-title">{category}</h2>
          <div className="template-grid">
            {items.map((t) => (
              <div key={t.filename} className="template-card card">
                <div className="template-card-body">
                  <h3 className="template-name">{t.name}</h3>
                  <p className="template-desc">{t.description}</p>
                </div>
                <div className="template-card-footer">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(t.filename)}
                  >
                    Download XML
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Group templates into logical categories based on filename patterns.
 */
function groupByCategory(templates: TemplateMeta[]): Record<string, TemplateMeta[]> {
  const categories: Record<string, TemplateMeta[]> = {
    'Core Invoices': [],
    'Special Scenarios': [],
    'References': [],
  };

  for (const t of templates) {
    const fn = t.filename.toLowerCase();
    if (fn.startsWith('standard') || fn.startsWith('summary') || fn.startsWith('commercial')) {
      categories['Core Invoices'].push(t);
    } else if (
      fn.includes('extensive') ||
      fn.includes('mandatory') ||
      fn.includes('predefined')
    ) {
      categories['References'].push(t);
    } else {
      categories['Special Scenarios'].push(t);
    }
  }

  // Remove empty categories
  const result: Record<string, TemplateMeta[]> = {};
  for (const [key, value] of Object.entries(categories)) {
    if (value.length > 0) result[key] = value;
  }
  return result;
}
