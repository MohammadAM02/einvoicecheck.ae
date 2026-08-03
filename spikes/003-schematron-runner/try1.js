// Spike 003 — can SaxonJS run the official precompiled Schematron XSLT in Node?
const fs = require('fs');
const SaxonJS = require('saxon-js');

const xml = fs.readFileSync('sample-valid.xml', 'utf8');
const xslt = fs.readFileSync('PINT-UBL-validation-preprocessed.xslt', 'utf8');

// Try 1: raw .xslt as stylesheetLocation (SaxonJS usually requires .sef.json)
try {
  const result = SaxonJS.transform({
    stylesheetLocation: 'PINT-UBL-validation-preprocessed.xslt',
    sourceText: xml,
  }, 'async');
  result.then((r) => {
    console.log('STYLESHEET-LOCATION OK, output length:', (r.principalResult || '').length);
    console.log(String(r.principalResult).slice(0, 400));
  }).catch((e) => console.log('STYLESHEET-LOCATION FAIL:', e.message));
} catch (e) {
  console.log('STYLESHEET-LOCATION THREW:', e.message);
  // Try 2: raw XSLT as a string stylesheet (SaxonJS "transpile" needs .sef, but test)
  try {
    SaxonJS.transform({
      stylesheetText: xslt,
      sourceText: xml,
      destination: 'stdout',
    }, 'async').then(() => console.log('STYLESHEET-TEXT OK'))
      .catch((e) => console.log('STYLESHEET-TEXT FAIL:', e.message));
  } catch (e2) {
    console.log('STYLESHEET-TEXT THREW:', e2.message);
  }
}
