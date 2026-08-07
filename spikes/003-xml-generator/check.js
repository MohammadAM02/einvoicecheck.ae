/**
 * SPIKE: token-skeleton XML generator — validation check.
 *
 * For each fixture, generates XML from the matching skeleton, then runs
 * BOTH convert() and validateInvoice() from the real engine. Prints a
 * table row and exits 1 if any fixture fails its expectations.
 *
 * Usage: node check.js  (from spikes/003-xml-generator/)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { validateInvoice } from "../../app/api/src/rules/engine.js";
import { convert } from "../../app/api/src/rules/convert/index.js";
import { generate } from "./generator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES = [
  {
    name: "standard-good",
    skeleton: "standard-tax-invoice.skeleton.xml",
    fixture: "fixtures/standard-good.json",
    expect: {
      convertNotRefused: true,          // NOOP or CONVERTED
      xsdIssues: 0,
      valid: true,
    },
  },
  {
    name: "ae-summary-good",
    skeleton: "summary-tax-invoice.skeleton.xml",
    fixture: "fixtures/ae-summary-good.json",
    expect: {
      convertNotRefused: true,          // must not be REFUSED
      xsdIssues: 0,
      valid: true,                      // AE reverse-charge MUST pass
    },
  },
  {
    name: "adversarial",
    skeleton: "standard-tax-invoice.skeleton.xml",
    fixture: "fixtures/adversarial.json",
    expect: {
      convertNotRefused: true,
      xsdIssues: 0,
      valid: true,
      checkEscaping: true,              // verify XML escaping in output
    },
  },
  {
    name: "bad-trn",
    skeleton: "standard-tax-invoice.skeleton.xml",
    fixture: "fixtures/bad-trn.json",
    expect: {
      // The convert pipeline may REFUSE for DATA_SEMANTIC (the bad TRN is
      // a semantic issue, not structural). That's fine — XSD stays clean.
      xsdIssues: 0,
      valid: false,                     // engine MUST catch bad TRN
      errorRulePrefix: "ENG-TRN",       // must have an error starting with this
    },
  },
];

function readJson(p) {
  return JSON.parse(readFileSync(resolve(__dirname, p), "utf8"));
}

/**
 * Well-formedness is inferred from the convert pipeline: if convert refuses
 * with UNREPAIRABLE_FORMAT (the gate at step 3 of the pipeline), the XML
 * was not well-formed. All other statuses mean well-formedness passed.
 */
function isWellFormed(convResult) {
  return !(
    convResult.status === "REFUSED" &&
    convResult.reason === "UNREPAIRABLE_FORMAT"
  );
}

function countXsdIssues(dataIssues) {
  return (dataIssues || []).filter((d) => d.rule && d.rule.startsWith("XSD-")).length;
}

function blockingErrorRules(errors) {
  return (errors || []).filter((e) => e.severity === "error").map((e) => e.rule);
}

// ── Run ────────────────────────────────────────────────────────────────

let failures = 0;
const rows = [];

for (const f of FIXTURES) {
  const data = readJson(f.fixture);
  const skelPath = resolve(__dirname, f.skeleton);

  let generated;
  try {
    generated = generate(skelPath, data);
  } catch (e) {
    rows.push({
      name: f.name,
      wellFormed: "ERROR",
      convertStatus: "-",
      xsdCount: "-",
      valid: "-",
      blocking: e.message,
    });
    console.error(`[${f.name}] generate threw: ${e.message}`);
    failures++;
    continue;
  }

  const convResult = convert(generated, { mode: "full" });
  const wellFormed = isWellFormed(convResult);
  const xsdCount = countXsdIssues(convResult.dataIssues);
  const valResult = validateInvoice(generated, "application/xml");
  const blocking = blockingErrorRules(valResult.errors);

  rows.push({
    name: f.name,
    wellFormed: wellFormed ? "yes" : "NO",
    convertStatus: convResult.status,
    xsdCount,
    valid: valResult.valid ? "yes" : "NO",
    blocking: blocking.length > 0 ? blocking.join(", ") : "(none)",
  });

  // ── Assertions ──────────────────────────────────────────────────

  // 1. Convert must not be REFUSED or ERROR (only if specified)
  if (f.expect.convertNotRefused) {
    if (convResult.status === "REFUSED" || convResult.status === "ERROR") {
      console.error(
        `[${f.name}] FAIL: convert status ${convResult.status} (reason: ${convResult.reason || convResult.detail || "?"})`
      );
      failures++;
    }
  }

  // 2. XSD issues count
  if (f.expect.xsdIssues !== undefined && xsdCount !== f.expect.xsdIssues) {
    console.error(
      `[${f.name}] FAIL: expected ${f.expect.xsdIssues} XSD issues, got ${xsdCount}`
    );
    if (xsdCount > 0) {
      const xsdIssues = (convResult.dataIssues || []).filter((d) => d.rule && d.rule.startsWith("XSD-"));
      xsdIssues.forEach((d) => console.error(`  XSD: ${d.rule} ${d.path}: ${d.message}`));
    }
    failures++;
  }

  // 3. validate.valid
  if (f.expect.valid !== undefined && valResult.valid !== f.expect.valid) {
    console.error(
      `[${f.name}] FAIL: expected valid=${f.expect.valid}, got valid=${valResult.valid}`
    );
    if (!valResult.valid) {
      valResult.errors.filter((e) => e.severity === "error").forEach((e) =>
        console.error(`  Error: ${e.rule} ${e.path}: ${e.message}`)
      );
    }
    failures++;
  }

  // 4. Adversarial: check escaping
  if (f.expect.checkEscaping) {
    if (
      !generated.includes("&amp;") ||
      !generated.includes("&lt;") ||
      !generated.includes("&gt;") ||
      !generated.includes("&quot;")
    ) {
      console.error(`[${f.name}] FAIL: missing expected XML entity escapes in generated output`);
      failures++;
    }
    // Must NOT contain raw unescaped & or < from the input names
    // "Falcon & Sons" → should appear as "Falcon &amp; Sons"
    if (/Falcon\s+&\s+Sons/.test(generated)) {
      console.error(`[${f.name}] FAIL: unescaped '&' found in generated output`);
      failures++;
    }
    if (/<Trading>/.test(generated)) {
      console.error(`[${f.name}] FAIL: unescaped '<' or '>' found in generated output`);
      failures++;
    }
    if (generated.includes(`"LLC"`)) {
      console.error(`[${f.name}] FAIL: unescaped '"' found in generated output`);
      failures++;
    }
  }

  // 5. bad-trn: must have an ENG-TRN error
  if (f.expect.errorRulePrefix) {
    const hasPrefix = blocking.some((r) => r.startsWith(f.expect.errorRulePrefix));
    if (!hasPrefix) {
      console.error(
        `[${f.name}] FAIL: expected error rule starting with "${f.expect.errorRulePrefix}", got: ${blocking.join(", ") || "(none)"}`
      );
      failures++;
    }
  }
}

// ── Print table ────────────────────────────────────────────────────────

console.log();
const headers = ["fixture", "well-formed", "convert.status", "XSD issues", "validate.valid", "blocking errors"];
const widths = headers.map((h, i) =>
  Math.max(h.length, ...rows.map((r) => String(Object.values(r)[i]).length))
);

const pad = (s, w) => String(s).padEnd(w);

// Header
console.log(headers.map((h, i) => pad(h, widths[i])).join("  "));
console.log(headers.map((_, i) => "-".repeat(widths[i])).join("  "));

// Rows
for (const r of rows) {
  console.log(
    [r.name, String(r.wellFormed), r.convertStatus, String(r.xsdCount), String(r.valid), r.blocking]
      .map((v, i) => pad(v, widths[i]))
      .join("  ")
  );
}

console.log();
if (failures > 0) {
  console.log(`${failures} failure(s).`);
  process.exitCode = 1;
} else {
  console.log("All fixtures passed.");
}
