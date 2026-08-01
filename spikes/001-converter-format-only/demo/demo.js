/* einvoicecheck spike-001 demo — shared helpers */
'use strict';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortHash(h, n = 16) {
  return h ? h.slice(0, n) + '…' : '—';
}

async function callConvert(xml, mode) {
  const res = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml, mode }),
  });
  const data = await res.json().catch(() => ({ error: 'Server returned a non-JSON response.' }));
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

async function loadSample(select) {
  const file = select.value;
  if (!file) return '';
  const res = await fetch('/samples/' + file);
  if (!res.ok) throw new Error('Could not load sample ' + file);
  return await res.text();
}

function statusMeta(r) {
  if (r.status === 'CONVERTED') return { cls: 'ok', title: 'Format repair complete' };
  if (r.status === 'NOOP') return { cls: 'neutral', title: 'No changes needed' };
  if (r.status === 'REFUSED' && r.reason === 'DATA_SEMANTIC') return { cls: 'err', title: 'Refused — data errors found' };
  if (r.status === 'REFUSED' && r.reason === 'UNREPAIRABLE_FORMAT') return { cls: 'err', title: 'Refused — structure cannot be repaired' };
  if (r.status === 'ERROR') return { cls: 'err', title: 'Internal guard tripped' };
  return { cls: 'neutral', title: r.status || '—' };
}

function bannerHtml(r) {
  const m = statusMeta(r);
  let detail = r.detail || '';
  if (r.status === 'CONVERTED') {
    detail = `${r.audit.length} change(s) applied and audited. Original input is never mutated — output is a draft for review.`;
  } else if (r.status === 'NOOP') {
    detail = 'Document is already well-formed with correct namespaces and declaration.';
  }
  return `<div class="banner ${m.cls}">
    <div class="t">${escapeHtml(m.title)}</div>
    ${detail ? `<div class="d">${escapeHtml(detail)}</div>` : ''}
  </div>`;
}

function pipelineHtml(r) {
  const blocked = r.blocked ? r.blocked.length : 0;
  const issues = r.dataIssues ? r.dataIssues.length : 0;
  const auditN = r.audit ? r.audit.length : 0;
  const chips = [
    ['Parse', r.status !== 'REFUSED' || r.reason !== 'UNREPAIRABLE_FORMAT' ? 'ok' : 'bad'],
    ['Data check', blocked || issues ? 'bad' : 'ok'],
    ['Repair', auditN ? 'ok' : 'neutral'],
    ['Verify', r.status !== 'ERROR' ? 'ok' : 'bad'],
    ['Fingerprint', r.status !== 'ERROR' ? 'ok' : 'bad'],
  ];
  return '<div class="pipeline">' + chips.map(([label, st]) =>
    `<span class="chip ${st}">${label}<span class="st">${st === 'ok' ? '✓' : st === 'bad' ? '✗' : '·'}</span></span>`
  ).join('') + '</div>';
}

function hashesHtml(r) {
  if (!r.inputHash) return '';
  return `<div class="hashes">
    <span>input&nbsp;<code>${escapeHtml(shortHash(r.inputHash, 24))}</code></span>
    ${r.outputHash ? `<span>output&nbsp;<code>${escapeHtml(shortHash(r.outputHash, 24))}</code></span>` : ''}
    <span>engine&nbsp;<code>${escapeHtml(r.engineVersion || '—')}</code></span>
  </div>`;
}

function auditTableHtml(audit) {
  if (!audit || !audit.length) return '';
  const rows = audit.map((a, i) => `<tr>
    <td class="rule">${escapeHtml(a.rule)}</td>
    <td><code>${escapeHtml(a.action)}</code></td>
    <td><code>${escapeHtml(a.target)}</code></td>
    <td class="oldv">${escapeHtml(truncate(a.old, 40))}</td>
    <td class="newv">${escapeHtml(truncate(a.new, 40))}</td>
    <td>${escapeHtml(a.reason)}</td>
  </tr>`).join('');
  return `<div class="tblwrap"><table class="audit">
    <thead><tr><th>#</th><th>Rule</th><th>Action</th><th>Target</th><th>Old</th><th>New</th><th>Reason</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function truncate(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function blockedTableHtml(blocked) {
  if (!blocked || !blocked.length) return '';
  const rows = blocked.map((b) => `<tr>
    <td class="rule">${escapeHtml(b.rule)}</td>
    <td><code>${escapeHtml(b.path)}</code></td>
    <td>${escapeHtml(b.message)}</td>
  </tr>`).join('');
  return `<div class="tblwrap"><table class="blocked">
    <thead><tr><th>Rule</th><th>Path</th><th>Why it cannot be auto-fixed</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function chipsHtml(arr) {
  if (!arr || !arr.length) return '';
  return '<div class="pipeline">' + arr.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('') + '</div>';
}

function serverDownHtml(err) {
  return `<div class="banner err"><div class="t">Demo server not reachable</div>
    <div class="d">Start it with <code>node demo/server.js</code> from the spike directory, then reload. (${escapeHtml(err.message || err)})</div></div>`;
}
