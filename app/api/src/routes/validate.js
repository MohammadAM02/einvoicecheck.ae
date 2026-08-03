import { validateInvoice } from '../rules/engine.js';
import { validateSchematron } from '../rules/schematron-interpreter.js';
import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

/** The raw XML string of an accepted payload, or null when the input is JSON.
 * Duplicates normalizeInput's XML detection: the engine (and its vendored web
 * copy) must stay byte-identical, so the PINT AE wiring lives in this file. */
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

/** /v1/validate/pint — interpreter errors plus engine errors, kept apart. */
const pintResultSchema = {
  type: 'object',
  properties: {
    valid: { type: 'boolean' },
    invoiceType: { type: ['string', 'null'] },
    schemaVersion: { type: 'string' },
    evaluated: { type: 'integer' },
    totalAsserts: { type: 'integer' },
    errors: { type: 'array', items: errorObjectSchema },
    semantic: { type: 'array', items: errorObjectSchema },
  },
  required: ['valid', 'invoiceType', 'schemaVersion', 'evaluated', 'totalAsserts', 'errors', 'semantic'],
};

/**
 * Write a best-effort usage-metering event. Never throws into the request path.
 */
async function meter(request, statusCode, outcome, endpoint) {
  try {
    if (!request.apiKey) return;
    await UsageEvent.create({
      keyId: request.apiKey._id,
      endpoint,
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
          'Send a canonical JSON invoice, an envelope { "document": "<Invoice>..." }, or raw UBL/PINT AE XML with Content-Type application/xml. ' +
          'For full PINT AE Schematron conformance of XML documents, use POST /v1/validate/pint.',
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
      const outcome = result.errors.some((e) => e.rule === 'ENG-PARSE-01')
        ? 'error'
        : result.valid
          ? 'valid'
          : 'invalid';
      await meter(request, 200, outcome, '/v1/validate');
      return reply.code(200).send(result);
    }
  );

  // Full PINT AE Schematron conformance for XML documents. The interpreter's
  // ibr-* / aligned-* failures live in `errors`; the engine's ENG-* failures
  // on the mapped model live in `semantic` — the two rule vocabularies never
  // mix. The engine adapter's ENG-SCH-01/IBR-073 (date format) is dropped from
  // `semantic` because the interpreter's ibr-073 covers the same rule on raw
  // XML; the prepaid check (ENG-SCH-01/IBT-113-LE-IBT-115) stays — no PINT AE
  // assert covers it.
  fastify.post(
    '/v1/validate/pint',
    {
      preHandler: [authenticate, rateLimit],
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'PINT AE conformance report for a UBL 2.1 / PINT AE XML document.',
        description:
          'Runs the vendored PINT AE Schematron ruleset (301 asserts) over the raw XML document. ' +
          'Does NOT transmit a legal e-invoice, is NOT FTA-accredited, and does not replace an accredited ASP or provide statutory archival. ' +
          'Send raw UBL/PINT AE XML with Content-Type application/xml or an envelope { "document": "<Invoice>..." }.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: pintResultSchema,
          400: { $ref: 'ErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const rawXml = rawXmlOf(request.body);
      if (!rawXml) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'PINT AE conformance requires a UBL 2.1 / PINT AE XML document.',
        });
      }

      const sch = validateSchematron(rawXml);
      for (const e of sch.evalErrors) {
        // An assert whose XPath cannot evaluate on this document: partial
        // coverage must not surface internals — log server-side only.
        request.log.warn({ rule: e.rule }, 'schematron assert failed to evaluate');
      }

      const engine = validateInvoice(rawXml, 'application/xml');
      const semantic = engine.errors.filter((e) => e.rule !== 'ENG-SCH-01/IBR-073');
      const valid =
        !sch.errors.some((e) => e.severity === 'error') &&
        !semantic.some((e) => e.severity === 'error');

      const result = {
        valid,
        invoiceType: engine.invoiceType,
        schemaVersion: engine.schemaVersion,
        evaluated: sch.evaluated,
        totalAsserts: sch.totalAsserts,
        errors: sch.errors,
        semantic,
      };

      const outcome = result.errors.some((e) => e.rule === 'ENG-PARSE-01')
        ? 'error'
        : valid
          ? 'valid'
          : 'invalid';
      await meter(request, 200, outcome, '/v1/validate/pint');
      return reply.code(200).send(result);
    }
  );
}
