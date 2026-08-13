import { generateInvoice, TEMPLATES, GENERATOR_VERSION } from '../rules/generate/index.js';
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
 * Write a best-effort usage-metering event. Never throws into the request path.
 */
async function meter(request, statusCode, outcome) {
  try {
    if (!request.apiKey) return;
    await UsageEvent.create({
      keyId: request.apiKey._id,
      endpoint: '/v1/generate',
      method: 'POST',
      statusCode,
      outcome,
    });
  } catch (e) {
    request.log.warn({ err: e }, 'failed to write usage event');
  }
}

/**
 * POST /v1/generate — generate PINT-AE UBL XML invoices from a form data object.
 * Mirrors /v1/convert's security posture: API-key auth, per-key rate limiting,
 * usage metering, no payload persistence.
 */
export async function generateRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify);
  registerQuotaReleaseHook(fastify);

  // Register a shared response schema that includes fieldErrors for 400.
  fastify.addSchema({
    $id: 'GenerateErrorReply',
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      fieldErrors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    required: ['error', 'message'],
  });

  fastify.post(
    '/v1/generate',
    {
      preHandler: [authenticate, rateLimit],
      schema: {
        tags: ['generate'],
        summary: 'Generate a PINT-AE UBL XML invoice from form data.',
        description:
          'Builds a PINT-AE 1.0.4 UBL XML invoice from structured form data using an official-sample ' +
          'skeleton. Structure is XSD-guaranteed at generation time. Totals are computed with the ' +
          'same money.js semantics as the validation engine — generated documents cannot fail ' +
          'arithmetic preflight rules. Preflight only — not FTA-accredited, does not transmit ' +
          'legal e-invoices, and does not provide statutory archival.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        // Body schema is intentionally permissive — all validation happens in
        // the handler so field-level errors can be returned with fieldErrors.
        body: {
          type: 'object',
          properties: {
            template: { type: 'string' },
            data: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              xml: { type: 'string' },
              template: { type: 'string' },
              engineVersion: { type: 'string' },
            },
            required: ['ok', 'xml', 'template', 'engineVersion'],
          },
          400: { $ref: 'GenerateErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const body = request.body || {};

      // Quick guard: missing template or data at the top level
      if (!body.template || !body.data) {
        await meter(request, 400, 'invalid');
        const fieldErrors = [];
        if (!body.template) fieldErrors.push({ field: 'template', message: 'Template is required.' });
        if (!body.data) fieldErrors.push({ field: 'data', message: 'Data is required.' });
        return reply.code(400).send({
          error: 'validation_failed',
          message: 'Request body must include template and data.',
          fieldErrors,
        });
      }

      const quota = await reserveMonthlyQuota(fastify, request);
      if (!quota.ok) return quotaRejectedReply(reply, quota);

      let result;
      try {
        result = generateInvoice({ template: body.template, data: body.data });
      } catch (e) {
        if (e.validationErrors) {
          finalizeMonthlyQuota(request);
          await meter(request, 400, 'invalid');
          return reply.code(400).send({
            error: 'validation_failed',
            message: e.message,
            fieldErrors: e.validationErrors,
          });
        }
        request.log.error({ err: e }, 'generateInvoice threw');
        // Not finalized: the onResponse hook releases the reservation (A-008).
        await meter(request, 500, 'error');
        return reply.code(500).send({
          error: 'generation_failed',
          message: 'An internal error occurred while generating the invoice.',
        });
      }

      finalizeMonthlyQuota(request);
      await meter(request, 200, 'valid');
      return reply.code(200).send({
        ok: true,
        xml: result.xml,
        template: result.template,
        engineVersion: result.engineVersion,
      });
    }
  );
}
