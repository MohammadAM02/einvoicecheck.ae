import { validateInvoice } from '../rules/engine.js';
import { validateXmlDocument } from '../rules/xml-validation.js';
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

/** Flatten the three layered issue arrays into the legacy flat errors[]. */
function flattenIssues(result) {
  return [
    ...result.format.issues,
    ...result.structure.issues,
    ...result.semantic.issues,
  ];
}

/** Parse-failure outcome accounting, shared by all three routes. */
function outcomeFor(errors, valid) {
  return errors.some((e) => e.rule === 'ENG-PARSE-01')
    ? 'error'
    : valid
      ? 'valid'
      : 'invalid';
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

const preflightSchema = {
  type: 'object',
  properties: {
    ...resultSchema.properties,
    validationScope: { type: 'string' },
  },
  required: ['valid', 'invoiceType', 'schemaVersion', 'errors', 'validationScope'],
};

const NOT_XML_V1 =
  'POST /v1/validate accepts UBL 2.1 / PINT AE XML only. For canonical JSON invoice data preflight, use POST /v1/preflight.';
const NOT_XML_V2 =
  'POST /v2/validate accepts UBL 2.1 / PINT AE XML only. For canonical JSON invoice data preflight, use POST /v1/preflight.';
const NOT_JSON_PREFLIGHT =
  'POST /v1/preflight is a canonical-JSON data-preflight endpoint only: it accepts canonical JSON invoice data, not XML. For UBL 2.1 / PINT AE XML validation, use POST /v1/validate.';

const GUARDRAIL =
  'Deterministic preflight validation only. Does NOT transmit a legal e-invoice, is NOT FTA-accredited, and does not replace an accredited ASP or provide statutory archival.';

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
  const xmlOnly = {
    preHandler: [authenticate, rateLimit],
    // Accept an { document: "<xml>" } envelope or raw XML (see the text/xml
    // content-type parser in app.js).
    config: { rawBody: false },
    response: {
      200: { $ref: 'XmlValidationResult#' },
      400: { $ref: 'ErrorReply#' },
      401: { $ref: 'ErrorReply#' },
      429: { $ref: 'ErrorReply#' },
    },
  };

  fastify.post(
    '/v2/validate',
    {
      ...xmlOnly,
      schema: {
        tags: ['validation'],
        summary: 'Strict UBL 2.1 / PINT AE XML validation (layered result).',
        description:
          'Runs the full strict UBL validation pipeline against UBL 2.1 / PINT AE XML: ' +
          'format (well-formedness), structure (XSD), and semantic (rules + Schematron) layers. ' +
          `${GUARDRAIL} Send raw XML with Content-Type application/xml, or an envelope { "document": "<Invoice>..." }.`,
        security: [{ apiKey: [] }, { bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const xml = xmlPayload(request.body);
      if (!xml) {
        return reply.code(400).send({ error: 'invalid_request', message: NOT_XML_V2 });
      }

      const result = validateXmlDocument(xml);
      await meter(request, 200, outcomeFor(flattenIssues(result), result.valid), '/v2/validate');
      return reply.code(200).send(result);
    }
  );

  fastify.post(
    '/v1/validate',
    {
      preHandler: [authenticate, rateLimit],
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'Legacy flat UBL 2.1 / PINT AE XML validation.',
        description:
          'Legacy XML-only contract: validates UBL 2.1 / PINT AE XML and flattens the ' +
          'format / structure / semantic layers into the flat errors[] shape. ' +
          'For canonical JSON invoice data preflight, use POST /v1/preflight. ' +
          `${GUARDRAIL} Send raw XML with Content-Type application/xml, or an envelope { "document": "<Invoice>..." }.`,
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: resultSchema,
          400: { $ref: 'ErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const xml = xmlPayload(request.body);
      if (!xml) {
        return reply.code(400).send({ error: 'invalid_request', message: NOT_XML_V1 });
      }

      // validateXmlDocument owns the whole XML flow (format + structure +
      // semantic); the route never runs Schematron itself, so v1 and v2
      // cannot diverge.
      const result = validateXmlDocument(xml);
      const errors = flattenIssues(result);
      const payload = {
        valid: result.valid,
        invoiceType: result.invoiceType,
        schemaVersion: result.schemaVersion,
        errors,
      };
      await meter(request, 200, outcomeFor(errors, payload.valid), '/v1/validate');
      return reply.code(200).send(payload);
    }
  );

  fastify.post(
    '/v1/preflight',
    {
      preHandler: [authenticate, rateLimit],
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'Canonical JSON invoice data preflight.',
        description:
          'Runs the deterministic semantic rule engine against a canonical JSON invoice DTO. ' +
          `${GUARDRAIL} Send canonical JSON only; UBL 2.1 / PINT AE XML goes to POST /v1/validate or POST /v2/validate.`,
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: preflightSchema,
          400: { $ref: 'ErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const contentType = request.headers['content-type'] || '';
      if (xmlPayload(request.body)) {
        return reply.code(400).send({ error: 'invalid_request', message: NOT_JSON_PREFLIGHT });
      }

      const result = validateInvoice(request.body, contentType);
      const payload = { ...result, validationScope: 'canonical-json-data-preflight' };
      await meter(request, 200, outcomeFor(result.errors, result.valid), '/v1/preflight');
      return reply.code(200).send(payload);
    }
  );
}
