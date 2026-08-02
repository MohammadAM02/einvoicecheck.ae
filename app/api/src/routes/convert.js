import { convert } from '../rules/convert/index.js';
import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

const auditEntrySchema = {
  type: 'object',
  properties: {
    rule: { type: 'string' },
    action: { type: 'string', enum: ['rename', 'replace', 'add', 'remove'] },
    target: { type: 'string' },
    old: { type: 'string' },
    new: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['rule', 'action', 'target', 'old', 'new', 'reason'],
};

const blockedIssueSchema = {
  type: 'object',
  properties: {
    rule: { type: 'string' },
    path: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['rule', 'path', 'message'],
};

const convertResultSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['CONVERTED', 'NOOP', 'REFUSED', 'ERROR'] },
    reason: { type: 'string', enum: ['UNREPAIRABLE_FORMAT', 'DATA_SEMANTIC', 'DATA_CHANGED'] },
    detail: { type: 'string' },
    parseHint: { type: 'string' },
    inputHash: { type: 'string' },
    outputHash: { type: 'string' },
    audit: { type: 'array', items: auditEntrySchema },
    blocked: { type: 'array', items: blockedIssueSchema },
    dataIssues: { type: 'array', items: blockedIssueSchema },
    wouldFix: { type: 'array', items: { type: 'string' } },
    output: { type: 'string' },
    engineVersion: { type: 'string' },
    convertedAt: { type: 'string' },
  },
  required: ['status', 'inputHash', 'audit', 'blocked', 'dataIssues', 'engineVersion', 'convertedAt'],
};

/**
 * Write a best-effort usage-metering event. Never throws into the request path.
 * Outcome mirrors the validate route: converted/no-op counts as valid usage,
 * refusals as invalid, internal guards as error.
 */
async function meter(request, statusCode, outcome) {
  try {
    if (!request.apiKey) return;
    await UsageEvent.create({
      keyId: request.apiKey._id,
      endpoint: '/v1/convert',
      method: 'POST',
      statusCode,
      outcome,
    });
  } catch (e) {
    request.log.warn({ err: e }, 'failed to write usage event');
  }
}

/**
 * POST /v1/convert — format-only repair with audit trail and refusal
 * guardrails. Mirrors /v1/validate's security posture: API-key auth, per-key
 * rate limiting, usage metering, no payload persistence.
 *
 * Accepts JSON { xml, mode? } or raw UBL/PINT AE XML with
 * Content-Type: application/xml (string parser registered in app.js).
 */
export async function convertRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify);

  fastify.post(
    '/v1/convert',
    {
      preHandler: [authenticate, rateLimit],
      schema: {
        tags: ['convert'],
        summary: 'Format-only repair of a UAE invoice XML with audit trail and refusal guardrails.',
        description:
          'Repairs FORMAT defects only (illegal characters, prefix case, namespace URIs, missing namespace ' +
          'declarations, encoding declaration). Never invents or alters data: invoices with data-semantic ' +
          'errors are refused (full mode) or returned as warnings (format mode), and a data-integrity ' +
          'fingerprint aborts with ERROR if any repairer changed a value. Preflight only — not FTA-accredited, ' +
          'does not transmit legal e-invoices, and does not provide statutory archival. ' +
          'Send { "xml": "<Invoice>..." } (JSON) or raw UBL/PINT AE XML with Content-Type application/xml.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        body: {
          // Union: JSON { xml, mode? } OR a raw XML string (application/xml / text/xml).
          type: ['object', 'string'],
          properties: {
            xml: { type: 'string', minLength: 1, description: 'UBL 2.1 / PINT AE invoice XML.' },
            mode: { type: 'string', enum: ['format', 'full'], default: 'full' },
          },
          required: ['xml'],
          additionalProperties: false,
        },
        response: {
          200: convertResultSchema,
          400: { $ref: 'ErrorReply#' },
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      let xml;
      let mode;
      if (typeof body === 'string') {
        // Raw XML body (Content-Type: application/xml / text/xml).
        xml = body;
      } else if (body && typeof body === 'object' && typeof body.xml === 'string') {
        xml = body.xml;
        mode = body.mode;
      } else {
        return reply.code(400).send({
          error: 'invalid_request',
          message: 'Send { "xml": "<Invoice>..." } (JSON) or raw UBL/PINT AE XML with Content-Type application/xml.',
        });
      }

      const result = convert(xml, mode ? { mode } : {});
      const outcome =
        result.status === 'ERROR' ? 'error' : result.status === 'REFUSED' ? 'invalid' : 'valid';
      await meter(request, 200, outcome);
      return reply.code(200).send(result);
    }
  );
}

