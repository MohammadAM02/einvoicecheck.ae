import { validateInvoice } from '../rules/engine.js';
import { validateXmlDocument } from '../rules/xml-validation.js';
import { looksLikeXml } from '../rules/xml.js';
import {
  authenticate,
  makeRateLimiter,
  registerQuotaReleaseHook,
  reserveMonthlyQuota,
  finalizeMonthlyQuota,
  quotaRejectedReply,
} from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

/**
 * Extract a valid XML document from a raw body or the legacy document envelope.
 * The v2 route uses isRawXml() instead so its canonical contract stays raw XML.
 */
function xmlPayload(body) {
  if (typeof body === 'string' && looksLikeXml(body)) return body;
  if (body && typeof body.document === 'string' && looksLikeXml(body.document)) {
    return body.document;
  }
  return null;
}

/** Flatten the layered XML result into the legacy errors[] response shape. */
function flattenIssues(result) {
  return [
    ...result.format.issues,
    ...result.structure.issues,
    ...result.semantic.issues,
  ];
}

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

const NOT_XML_V2 =
  'POST /v2/validate accepts raw UBL 2.1 / PINT AE XML only. For canonical JSON invoice data preflight, use POST /v1/preflight.';
const NOT_JSON_PREFLIGHT =
  'POST /v1/preflight is a canonical-JSON data-preflight endpoint only: it accepts canonical JSON invoice data, not XML. For UBL 2.1 / PINT AE XML validation, use POST /v2/validate.';
const GUARDRAIL =
  'Deterministic preflight validation only. Does NOT transmit a legal e-invoice, is NOT FTA-accredited, and does not replace an accredited ASP or provide statutory archival.';

async function meter(request, endpoint, statusCode, outcome) {
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

function contentType(request) {
  return (request.headers['content-type'] || '').toLowerCase().split(';', 1)[0];
}

function isRawXml(body, type) {
  return (type === 'application/xml' || type === 'text/xml')
    && typeof body === 'string'
    && looksLikeXml(body);
}

function isCanonicalJson(body, type) {
  return type !== 'application/xml'
    && type !== 'text/xml'
    && body !== null
    && typeof body === 'object'
    && !Array.isArray(body)
    && !Object.prototype.hasOwnProperty.call(body, 'document')
    && !Object.prototype.hasOwnProperty.call(body, 'invoice');
}

function legacyXmlResponse(result) {
  return {
    valid: result.valid,
    invoiceType: result.invoiceType,
    schemaVersion: result.schemaVersion,
    errors: flattenIssues(result),
  };
}

export async function validateRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify);
  registerQuotaReleaseHook(fastify);

  fastify.post(
    '/v2/validate',
    {
      preHandler: [authenticate, rateLimit],
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'Strict UBL 2.1 / PINT AE XML validation (layered result).',
        description:
          'Preferred canonical XML integration. Runs format, structure and semantic layers over raw UBL 2.1 / PINT AE XML. ' +
          `${GUARDRAIL} Send raw XML with Content-Type application/xml or text/xml.`,
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: { $ref: 'XmlValidationResult#' },
          400: { $ref: 'ErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const type = contentType(request);
      if (!isRawXml(request.body, type)) {
        return reply.code(400).send({ error: 'invalid_request', message: NOT_XML_V2 });
      }

      const quota = await reserveMonthlyQuota(fastify, request);
      if (!quota.ok) return quotaRejectedReply(reply, quota);

      const result = validateXmlDocument(request.body);
      finalizeMonthlyQuota(request);
      await meter(request, '/v2/validate', 200, outcomeFor(flattenIssues(result), result.valid));
      return reply.code(200).send(result);
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
          'Preferred canonical JSON integration. Runs the deterministic semantic rule engine against a bare canonical JSON invoice DTO. ' +
          `${GUARDRAIL} XML goes to POST /v2/validate.`,
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
      const type = contentType(request);
      if (!isCanonicalJson(request.body, type)) {
        return reply.code(400).send({ error: 'invalid_request', message: NOT_JSON_PREFLIGHT });
      }

      const quota = await reserveMonthlyQuota(fastify, request);
      if (!quota.ok) return quotaRejectedReply(reply, quota);

      const result = validateInvoice(request.body, type);
      finalizeMonthlyQuota(request);
      const payload = { ...result, validationScope: 'canonical-json-data-preflight' };
      await meter(request, '/v1/preflight', 200, outcomeFor(result.errors, result.valid));
      return reply.code(200).send(payload);
    }
  );

  fastify.post(
    '/v1/validate',
    {
      preHandler: [authenticate, rateLimit],
      config: { rawBody: false },
      schema: {
        tags: ['validation'],
        summary: 'Legacy validation compatibility endpoint (JSON or XML).',
        description:
          `${GUARDRAIL} Preserves existing canonical JSON, { "invoice": { ... } }, { "document": "<Invoice>..." }, and raw XML forms. ` +
          'New integrations should use POST /v2/validate for XML or POST /v1/preflight for canonical JSON.',
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
      const type = contentType(request);
      const xml = xmlPayload(request.body);
      const quota = await reserveMonthlyQuota(fastify, request);
      if (!quota.ok) return quotaRejectedReply(reply, quota);

      let payload;
      if (xml) {
        const result = validateXmlDocument(xml);
        payload = legacyXmlResponse(result);
      } else {
        payload = validateInvoice(request.body, type);
      }
      finalizeMonthlyQuota(request);
      await meter(request, '/v1/validate', 200, outcomeFor(payload.errors, payload.valid));
      return reply.code(200).send(payload);
    }
  );
}
