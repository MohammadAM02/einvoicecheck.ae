/**
 * Token-skeleton XML generator.
 *
 * Reads a skeleton file with {{TOKEN}} placeholders, substitutes data values
 * with full XML escaping, and returns the generated XML string.
 *
 *   generate(skeletonPath, data) → string
 */

import { readFileSync } from "node:fs";

const TOKEN_RE = /\{\{(\w+)\}\}/g;

/**
 * XML-escape a value for safe inclusion in element text or attribute values.
 * Escapes: & < > " '
 * Attribute-safe: all five characters are escaped regardless of context.
 */
function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate an XML invoice from a skeleton file and a data object.
 *
 * @param {string} skeletonPath - Path to the .skeleton.xml file.
 * @param {Record<string, string|number>} data - Token → value map.
 * @returns {string} The generated XML with all tokens substituted and escaped.
 * @throws {Error} If a token in the skeleton has no entry in data.
 */
export function generate(skeletonPath, data) {
  const template = readFileSync(skeletonPath, "utf8");

  const missing = [];
  const result = template.replace(TOKEN_RE, (match, token) => {
    if (!(token in data)) {
      missing.push(token);
      return match; // leave token in place so we can report all missing
    }
    return xmlEscape(data[token]);
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing data for tokens: ${missing.join(", ")}`
    );
  }

  return result;
}
