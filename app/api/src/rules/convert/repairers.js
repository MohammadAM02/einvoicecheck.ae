import { DOMParser } from '@xmldom/xmldom';
import { auditEntry } from './audit.js';

export const CBC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
export const CAC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

const CORRECT_NS = { cbc: CBC_URI, cac: CAC_URI };
const PREFIX_CASE = { Cbc: 'cbc', CBC: 'cbc', Cac: 'cac', CAC: 'cac' };
const ILLEGAL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

// ---------------------------------------------------------------------------
// String-level repairers (must run BEFORE any DOM parse: illegal chars break
// parsing; the encoding declaration lives in the prolog, which the DOM does
// not expose well; and @xmldom/xmldom REJECTS unbound prefixes at parse time
// with NamespaceError, so a missing xmlns declaration has to be added to the
// raw text first — verified against @xmldom/xmldom 0.9.10).
// ---------------------------------------------------------------------------

/** FMT-CHARS-01 — strip illegal XML 1.0 characters. Returns the new string. */
export function sanitizeChars(xml, audit) {
  const hits = xml.match(ILLEGAL_CHARS);
  if (!hits) return xml;
  const out = xml.replace(ILLEGAL_CHARS, '');
  audit.push(auditEntry(
    'FMT-CHARS-01', 'remove', '/text()',
    JSON.stringify(hits.slice(0, 3)), '',
    'Control characters are not allowed in XML 1.0. Removed them.'
  ));
  return out;
}

/** FMT-DECL-01 — encoding declaration ISO-8859-1 → utf-8. Returns the new string. */
export function fixEncodingDecl(xml, audit) {
  const decl = xml.match(/^<\?xml[^?]*\?>/);
  if (!decl) return xml;
  const after = decl[0].replace(/encoding="ISO-8859-1"/i, 'encoding="utf-8"');
  if (after === decl[0]) return xml;
  audit.push(auditEntry(
    'FMT-DECL-01', 'replace', '/processing-instruction(xml)',
    decl[0], after,
    'Declared encoding did not match UTF-8.'
  ));
  return xml.replace(decl[0], after);
}

/**
 * FMT-NS-02 — add a missing xmlns declaration when a prefix is used anywhere
 * in the document but not declared on the root. No content is invented — the
 * binding is pure format. Runs on the raw string (not the DOM) because
 * @xmldom/xmldom throws NamespaceError on unbound prefixes before a DOM can
 * exist to repair. The used prefix is bound verbatim (any case); the DOM
 * repairers normalize the spelling afterwards.
 */
export function addMissingNsDecl(xml, audit) {
  const rootMatch = xml.match(/<([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/);
  if (!rootMatch) return xml;
  const rootOpen = rootMatch[0];
  const attrs = rootMatch[2] || '';

  const used = new Set();
  for (const m of xml.matchAll(/<\/([A-Za-z_][\w.-]*):/g)) used.add(m[1]);
  for (const m of xml.matchAll(/<([A-Za-z_][\w.-]*):/g)) used.add(m[1]);

  let insert = '';
  for (const usedPrefix of used) {
    // Bind EVERY distinct prefix spelling that is used (Cbc: and cbc: are
    // different prefixes in XML — each needs its own declaration).
    const canonical = Object.keys(CORRECT_NS).find(
      (k) => k.toUpperCase() === usedPrefix.toUpperCase()
    );
    if (!canonical) continue;
    if (new RegExp(`xmlns:${usedPrefix}=`).test(attrs)) continue; // this spelling is declared
    const uri = CORRECT_NS[canonical];
    insert += ` xmlns:${usedPrefix}="${uri}"`;
    audit.push(auditEntry(
      'FMT-NS-02', 'add', `/Invoice/@xmlns:${usedPrefix}`,
      '(missing)', uri,
      'Namespace declaration was missing.'
    ));
  }
  if (!insert) return xml;
  return xml.replace(rootOpen, rootOpen.replace(/>$/, `${insert}>`));
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** Recursively collect every element node under root. */
function allElements(root) {
  const out = [];
  const walk = (el) => {
    out.push(el);
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes.item(i);
      if (child.nodeType === 1) walk(child);
    }
  };
  walk(root);
  return out;
}

/** Best-effort XPath (qualified names + same-name sibling index) for audits. */
function getXPath(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.nodeType === 1) {
    let index = 1;
    let sibling = cur.previousSibling;
    while (sibling) {
      if (sibling.nodeType === 1 && sibling.tagName === cur.tagName) index++;
      sibling = sibling.previousSibling;
    }
    parts.unshift(index > 1 ? `${cur.tagName}[${index}]` : cur.tagName);
    cur = cur.parentNode;
  }
  return `/${parts.join('/')}`;
}

// ---------------------------------------------------------------------------
// DOM repairers — each mutates the Document in place and returns
// { changed, audit } with one AuditEntry per affected node (per-node audit,
// unlike the spike's aggregated regex rows).
// ---------------------------------------------------------------------------

/**
 * FMT-PREFIX-01 — rename wrong-case prefixes (Cbc:/CBC:/Cac:/CAC: → cbc:/cac:)
 * on elements and on xmlns declaration attributes. Elements are recreated
 * bound to the CORRECT namespace URI for the lowercase prefix so the final
 * serialization carries one clean declaration.
 */
export function rPrefix(doc) {
  const audit = [];
  let changed = false;
  const elements = allElements(doc.documentElement);

  for (const [from, to] of Object.entries(PREFIX_CASE)) {
    // 1. Rename namespace declaration attributes (xmlns:Cbc → xmlns:cbc).
    for (const el of elements) {
      const attr = el.getAttributeNode(`xmlns:${from}`);
      if (attr) {
        el.removeAttribute(`xmlns:${from}`);
        el.setAttribute(`xmlns:${to}`, attr.value);
        audit.push(auditEntry(
          'FMT-PREFIX-01', 'rename', `${getXPath(el)}/@xmlns:${from}`,
          `xmlns:${from}`, `xmlns:${to}`,
          'Prefix case did not match the UBL convention.'
        ));
        changed = true;
      }
    }

    // 2. Rename elements with the wrong-case prefix. DOM Level 2 has no
    //    renameNode — reconstruct the element and move attributes + children.
    for (const el of elements) {
      if (el.prefix !== from) continue;
      const newEl = doc.createElementNS(CORRECT_NS[to], `${to}:${el.localName}`);
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes.item(i);
        newEl.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
      }
      while (el.firstChild) newEl.appendChild(el.firstChild);
      el.parentNode.replaceChild(newEl, el);
      audit.push(auditEntry(
        'FMT-PREFIX-01', 'rename', getXPath(newEl),
        `${from}:${el.localName}`, `${to}:${el.localName}`,
        'Prefix case did not match the UBL convention.'
      ));
      changed = true;
    }
  }

  return { changed, audit };
}

/** FMT-NS-01 — fix wrong namespace URIs on the root xmlns declarations. */
export function rNsUri(doc) {
  const audit = [];
  let changed = false;
  const root = doc.documentElement;
  for (const [prefix, uri] of Object.entries(CORRECT_NS)) {
    const attrName = `xmlns:${prefix}`;
    const current = root.getAttribute(attrName);
    if (current && current !== uri) {
      root.setAttribute(attrName, uri);
      audit.push(auditEntry(
        'FMT-NS-01', 'replace', `${getXPath(root)}/@${attrName}`,
        current, uri,
        'Namespace URI did not match the UBL 2.1 schema.'
      ));
      changed = true;
    }
  }
  return { changed, audit };
}

/** DOM repairers in pipeline order (prefix case → URI). */
export const DOM_REPAIRERS = [rPrefix, rNsUri];

/**
 * dryRun(xml) → unique rule IDs that WOULD change. Throwaway parse used by the
 * REFUSED(DATA_SEMANTIC) path to report what a conversion would have fixed
 * (no partial repair is ever applied).
 */
export function dryRun(xml) {
  try {
    const audit = [];
    let current = sanitizeChars(xml, audit);
    current = fixEncodingDecl(current, audit);
    current = addMissingNsDecl(current, audit);
    const doc = new DOMParser().parseFromString(current, 'text/xml');
    if (!doc || !doc.documentElement || doc.documentElement.tagName === 'parsererror') {
      return [...new Set(audit.map((a) => a.rule))];
    }
    for (const repairer of DOM_REPAIRERS) {
      const { audit: next } = repairer(doc);
      audit.push(...next);
    }
    return [...new Set(audit.map((a) => a.rule))];
  } catch {
    return [];
  }
}

