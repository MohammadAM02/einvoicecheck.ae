import { validateInvoice } from '../rules/engine.js';
import { validateSchematron } from '../rules/schematron-interpreter.js';
import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

/** The raw XML string of an accepted payload, or null when the input is JSON.
 * Duplicates normalizeInput's XML detection: the engine (and its vendored web
 * copy) must stay byte-identical, so the interpreter wiring lives here. */
function rawXmlOf(body) {
  if (typeof body === 'string') return body.trimStart().startsWith('<') ? body : null;
  if (body && typeof body.document === 'string' && body.document.trimStart().startsWith('<')) {
    return body.document;
  }
  return null;
}

const errorObjectSchema = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    rule: { type: 'string' },
    severity: { type: 'string', enum: ['error', 'warning'] },
    message: { type: 'string' },
    fix: { type: 'string' },
  },
  required: ['path', 'rule', 'severity', 'message'],
};

const resultSchema = {
  type: 'object',
  properties: {
    valid: { type: 'boolean' },
    invoiceType: { type: ['string', 'null'] },
    schemaVersion: { type: 'string' },
    errors: { type: 'array', items: errorObjectSchema },
  },
  required: ['valid', 'invoiceType', 'schemaVersion', 'errors'],
};

/**
 * Write a best-effort usage-metering event. Never throws into the request path.
 */
async function meter(request, statusCode, outcome) {
  try {
    if (!request.apiKey) return;
    await UsageEvent.create({
      keyId: request.apiKey._id,
      endpoint: '/v1/validate',
      method: 'POST',
      statusCode,
      outcome,
    });
  } catch (e) {
    request.log.warn({ err: e }, 'failed to write usage event');
  }
}

export async function validateRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify);

  fastify.post(
    '/v1/validate',
    {
      preHandler: [authenticate, rateLimit],
      // Accept JSON canonical invoices, an { document: "<xml>" } envelope,
      // or raw XML (see the text/xml content-type parser in app.js).
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'Preflight-validate a UAE invoice (JSON or UBL 2.1 / PINT AE XML).',
        description:
          'Deterministic preflight validation only. Does NOT transmit a legal e-invoice, is NOT FTA-accredited, and does not replace an accredited ASP or provide statutory archival. ' +
          'Send a canonical JSON invoice, an envelope { "document": "<Invoice>..." }, or raw UBL/PINT AE XML with Content-Type application/xml.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: resultSchema,
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const contentType = request.headers['content-type'] || '';
      const result = validateInvoice(request.body, contentType);

      // XML input additionally runs the full PINT AE Schematron interpreter
      // (301 asserts over the raw document); JSON stays on the engine rules.
      const rawXml = rawXmlOf(request.body);
      if (rawXml) {
        const sch = validateSchematron(rawXml);
        for (const e of sch.evalErrors) {
          // An assert whose XPath cannot evaluate on this document: partial
          // coverage must not surface internals — log server-side only.
          request.log.warn({ rule: e.rule }, 'schematron assert failed to evaluate');
        }
        // The interpreter's ibr-073 covers the date-format rule on raw XML;
        // the engine adapter's ENG-SCH-01/IBR-073 is its JSON-path twin —
        // dropping it here prevents double-reporting the same defect.
        result.errors = [
          ...result.errors.filter((e) => e.rule !== 'ENG-SCH-01/IBR-073'),
          ...sch.errors,
        ];
        result.valid = !result.errors.some((e) => e.severity === 'error');
      }

      const outcome = result.errors.some((e) => e.rule === 'ENG-PARSE-01')
        ? 'error'
        : result.valid
          ? 'valid'
          : 'invalid';
      await meter(request, 200, outcome);
      return reply.code(200).send(result);
    }
  );
}
