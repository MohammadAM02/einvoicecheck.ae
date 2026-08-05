import { validateInvoice } from '../rules/engine.js';
import { validateSchematron } from '../schematron-interpreter.js';
import { looksLikeXml } from '../rules/xml.js';
import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

/**
 * Extract the raw XML string from a request body when the payload is XML:
 * a raw XML body (application/xml / text/xml) or an { document } envelope.
 * Returns null for canonical JSON payloads.
 */
function xmlPayload(body) {
  if (typeof body === 'string' && looksLikeXml(body)) return body;
  if (body && typeof body.document === 'string' && looksLikeXml(body.document)) {
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

      // Raw UBL / PINT AE XML payloads: also run the full Schematron
      // interpreter on the XML string. The canonical adapter (ENG-SCH-01)
      // yields its ibr-073 date check for XML (see schematron.js) so one
      // defect is not reported twice; its IBR-CO-11 check has no .sch
      // equivalent and still runs on the canonical model. Documents that
      // failed to parse have nothing for the interpreter to check.
      const xml = xmlPayload(request.body);
      if (xml && !result.errors.some((e) => e.rule === 'ENG-PARSE-01')) {
        const sch = validateSchematron(xml);
        if (sch.evalErrors.length > 0) {
          request.log.warn(
            { count: sch.evalErrors.length, evalErrors: sch.evalErrors },
            'schematron assert evaluation errors');
        }
        result.errors.push(...sch.errors);
        // Warnings must not invalidate the document — only severity 'error'.
        result.valid = result.valid && !sch.errors.some((e) => e.severity === 'error');
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
