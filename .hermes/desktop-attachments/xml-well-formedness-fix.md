# XML Well-Formedness Gate — Fix Applied

## Finding (from original review)

`parseUblInvoice` in `xml.js` called `XMLParser.parse()` directly. `fast-xml-parser` is lenient — it parses `<Invoice>...</Invocie>` and returns a tree with `tree.Invoice` populated. Field extraction succeeds, the document passes. Malformed XML was accepted silently.

## Root cause

No `XMLValidator.validate()` call before `parser.parse()`. The converter pipeline already had this gate; the main validator path didn't.

## Change

**File:** `packages/rules/src/xml.js` (canonical), synced to `app/api/src/rules/xml.js` + `app/web/src/lib/rules/xml.js`

**Diff (+7 lines):**

```js
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// ...

export function parseUblInvoice(xmlString) {
  const gate = XMLValidator.validate(xmlString);
  if (gate !== true) {
    const e = new Error(gate?.err?.msg || 'Document is not well-formed XML');
    e.code = 'BAD_XML_WELLFORMED';
    throw e;
  }
  const tree = parser.parse(xmlString);
  // ... rest unchanged
```

`normalizeInput` already wraps `parseUblInvoice` in try/catch, so the thrown error surfaces as `ENG-PARSE-01` with the parser's actual line/column detail.

## What gets rejected now

- Mismatched closing tags (`<Invoice>...</Invocie>`)
- Unclosed tags
- Garbage/non-XML input
- Any other well-formedness violation `XMLValidator` catches

## What still works

- All existing valid XML fixtures
- Both suites green: API 104/104, web 101/101
- Byte-identical across all three copies (packages + api + web)

## Not done

- No new dependency (XMLValidator is in already-installed `fast-xml-parser`; converter uses it too)
- No API shape change

## Regression test added

`app/api/test/validate.test.js` — "malformed XML (mismatched closing tag) hits the well-formedness gate": mutates `validUblXml()` by replacing `</Invoice>` with `</Invocie>`, asserts `ENG-PARSE-01` fires and the message includes the parser detail.
