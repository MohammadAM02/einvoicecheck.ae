/**
 * Browser-side application of the Validator's two approved safe repairs.
 *
 * The API never returns repair output: POST /v2/validate attaches an additive
 * `safeRepair` analysis (audit, hashes, full candidate validation verdict) and
 * the repaired XML is materialized here only after an explicit UI action. The
 * two string transforms mirror app/api/src/rules/safe-repair.js exactly, so a
 * locally applied candidate is byte-identical to the server-validated one;
 * when crypto.subtle is available the result is verified against the server's
 * candidateHash before it is presented.
 */

export type SafeRepairAuditEntry = {
  rule: string;
  action: 'rename' | 'replace' | 'add' | 'remove';
  target: string;
  old: string;
  new: string;
  reason: string;
};

const CBC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const INVOICE_NS = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const CREDIT_NOTE_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';
const BOM = String.fromCharCode(0xfeff);

function auditEntry(
  rule: string,
  action: SafeRepairAuditEntry['action'],
  target: string,
  oldValue: string,
  newValue: string,
  reason: string,
): SafeRepairAuditEntry {
  return { rule, action, target, old: oldValue, new: newValue, reason };
}

function getDeclaration(xml: string): string | null {
  const m = xml.match(new RegExp('^(?:' + BOM + ')?\\s*<\\?xml[^?]*\\?>'));
  return m ? m[0] : null;
}

function rootInfo(xml: string): { name: string; defaultNs?: string; openTag: string } | null {
  const m = xml.match(new RegExp(
    '^(?:' + BOM + ')?\\s*(?:<\\?xml[^?]*\\?>\\s*)?<([A-Za-z_][\\w.-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)>'
  ));
  if (!m) return null;
  const name = m[1].split(':').pop() ?? '';
  const attrs = m[2] || '';
  const xmlns = attrs.match(/\bxmlns\s*=\s*(["'])([^"']*)\1/);
  return { name, defaultNs: xmlns ? xmlns[2] : undefined, openTag: m[0] };
}

function withoutCommentsAndCdata(xml: string): string {
  return xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
}

function usedPrefixSpellings(xml: string): Set<string> {
  const scan = withoutCommentsAndCdata(xml);
  const out = new Set<string>();
  for (const m of scan.matchAll(/<[A-Za-z_][\w.-]*:[\w.-]+(?:\s|>|\/)/g)) {
    out.add(m[0].slice(1).split(':')[0]);
  }
  return out;
}

function findBinding(xml: string, prefix: string): string | null {
  const scan = withoutCommentsAndCdata(xml);
  const m = scan.match(new RegExp(`\\bxmlns:${prefix}\\s*=\\s*(["'])([^"']*)\\1`));
  return m ? m[2] : null;
}

/**
 * Apply the two metadata-only repairs. Mirrors the server pipeline:
 *  1. encoding declaration ISO-8859-1 → utf-8 (clean-decode only);
 *  2. missing exact-lowercase cbc/cac declaration on a recognizably UBL root.
 * The result must match the server's candidateHash before the UI presents it.
 */
export function applySafeRepairs(xml: string): { output: string; audit: SafeRepairAuditEntry[] } {
  const audit: SafeRepairAuditEntry[] = [];
  let current = xml;

  // 1. Encoding declaration.
  const decl = getDeclaration(current);
  if (decl) {
    const fixed = decl.replace(
      /encoding\s*=\s*(["'])ISO-8859-1(["'])/i,
      (_, q1: string, q2: string) => `encoding=${q1}utf-8${q2}`,
    );
    if (fixed !== decl) {
      audit.push(auditEntry(
        'FMT-DECL-01', 'replace', '/processing-instruction(xml)',
        decl, fixed,
        'Declared encoding did not match UTF-8.',
      ));
      current = current.replace(decl, fixed);
    }
  }

  // 2. Missing cbc/cac declaration.
  const root = rootInfo(current);
  const official: Record<string, string> = { cbc: CBC_URI, cac: CAC_URI };
  if (root && (root.name === 'Invoice' || root.name === 'CreditNote')) {
    const expectedRootNs = root.name === 'CreditNote' ? CREDIT_NOTE_NS : INVOICE_NS;
    let insert = '';
    for (const [canonical, uri] of Object.entries(official)) {
      for (const spelling of usedPrefixSpellings(current)) {
        if (spelling.toLowerCase() !== canonical) continue;
        if (spelling !== canonical) continue; // aliases are never auto-bound
        if (findBinding(current, spelling) !== null) continue;
        if (root.defaultNs !== expectedRootNs) continue;
        if (/\/>$/.test(root.openTag)) continue;
        insert += ` xmlns:${spelling}="${uri}"`;
        audit.push(auditEntry(
          'FMT-NS-02', 'add', `/${root.name}/@xmlns:${spelling}`,
          '(missing)', uri,
          'Namespace declaration was missing.',
        ));
      }
    }
    if (insert) {
      current = current.replace(root.openTag, root.openTag.replace(/>$/, `${insert}>`));
    }
  }

  return { output: current, audit };
}

/** SHA-256 hex of a UTF-8 string via the WebCrypto API (secure contexts only). */
export async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}
