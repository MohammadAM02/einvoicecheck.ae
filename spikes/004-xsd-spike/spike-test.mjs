// spikes/004-xsd-spike/spike-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const xsdPath = path.join('ubl-2.1', 'xsd', 'maindoc', 'UBL-Invoice-2.1.xsd');
// file:// base URI is REQUIRED so the XSD's relative schemaLocation
// imports (../common/…xsd) resolve against the vendored tree.
const schema = libxmljs.parseXml(fs.readFileSync(xsdPath, 'utf8'), {
  baseUrl: 'file://' + path.resolve(xsdPath).replace(/\\/g, '/'),
});

// Official PINT AE example — valid UBL 2.1 structure
const xml = fs.readFileSync(
  path.join('..', '..', 'app', 'api', 'schematron', 'examples', 'Standard tax invoice.xml'),
  'utf8');
const doc = libxmljs.parseXml(xml);

const ok = doc.validate(schema);
console.log('valid:', ok);
if (!ok) {
  console.log('validation errors:', doc.validationErrors.map((e) => e.message));
}

// Deliberately broken: drop the required cbc:IssueDate element
const broken = xml.replace(/<cbc:IssueDate>.*?<\/cbc:IssueDate>/, '');
const brokenDoc = libxmljs.parseXml(broken);
console.log('broken-valid:', brokenDoc.validate(schema));
console.log('broken errors:', brokenDoc.validationErrors.map((e) => e.message));
