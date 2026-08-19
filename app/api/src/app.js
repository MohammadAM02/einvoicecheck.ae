import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { config } from './config/env.js';
import { validateRoutes } from './routes/validate.js';
import { generateRoutes } from './routes/generate.js';
import { healthRoutes } from './routes/health.js';
import { usageRoutes } from './routes/usage.js';

/**
 * Build the Fastify app. Dependencies are injected so tests can pass an
 * in-memory Redis (ioredis-mock) and a mongodb-memory-server-backed mongoose
 * connection without any live infrastructure.
 *
 * @param {object} opts
 * @param {import('ioredis').Redis} opts.redis  ioredis-compatible client (required)
 * @param {object} [opts.logger]  Fastify logger option (default: off)
 */
export async function buildApp({ redis, logger = false } = {}) {
  if (!redis) throw new Error('buildApp requires a redis client (opts.redis)');

  const app = Fastify({
    logger,
    ajv: { customOptions: { allowUnionTypes: true } },
    bodyLimit: 5 * 1024 * 1024, // 5 MB — UBL invoices can be sizeable
  });

  app.decorate('redis', redis);

  // Raw XML bodies (UBL 2.1 / PINT AE) are kept as strings for the parser.
  app.addContentTypeParser(
    ['application/xml', 'text/xml'],
    { parseAs: 'string' },
    (req, body, done) => done(null, body)
  );

  // ---- shared response schemas (referenced by routes, surfaced in OpenAPI) ----
  app.addSchema({
    $id: 'ErrorReply',
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
    },
    required: ['error', 'message'],
  });

  app.addSchema({
    $id: 'HealthReply',
    type: 'object',
    properties: {
      status: { type: 'string' },
      live: { type: 'boolean' },
      checks: {
        type: 'object',
        properties: {
          mongo: { type: 'string', enum: ['up', 'down'] },
          redis: { type: 'string', enum: ['up', 'down'] },
        },
      },
      timestamp: { type: 'string' },
    },
  });

  app.addSchema({
    $id: 'ValidationIssue',
    type: 'object',
    properties: {
      path: { type: 'string' },
      rule: { type: 'string' },
      severity: { type: 'string', enum: ['error', 'warning'] },
      message: { type: 'string' },
      fix: { type: 'string' },
      line: { type: ['integer', 'null'] },
      column: { type: ['integer', 'null'] },
      xmlPath: { type: ['string', 'null'] },
    },
    required: ['path', 'rule', 'severity', 'message'],
  });

  app.addSchema({
    $id: 'LayerResult',
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
      issues: { type: 'array', items: { $ref: 'ValidationIssue#' } },
    },
    required: ['status', 'issues'],
  });

  // Base layered XML result — the shape every existing /v2/validate client
  // already understands. The public XmlValidationResult extends it additively
  // with an optional safeRepair analysis; candidateValidation references this
  // base so the schema stays non-recursive.
  app.addSchema({
    $id: 'BaseXmlValidationResult',
    type: 'object',
    properties: {
      valid: { type: 'boolean' },
      inputFormat: { type: 'string', enum: ['xml'] },
      validationScope: { type: 'string', enum: ['pint-ae-ubl-xml'] },
      invoiceType: { type: ['string', 'null'] },
      schemaVersion: { type: 'string' },
      format: { $ref: 'LayerResult#' },
      structure: { $ref: 'LayerResult#' },
      semantic: { $ref: 'LayerResult#' },
    },
    required: [
      'valid',
      'inputFormat',
      'validationScope',
      'invoiceType',
      'schemaVersion',
      'format',
      'structure',
      'semantic',
    ],
  });

  app.addSchema({
    $id: 'SafeRepairAuditEntry',
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
  });

  app.addSchema({
    $id: 'SafeRepairFinding',
    type: 'object',
    properties: {
      rule: { type: 'string' },
      path: { type: 'string' },
      severity: { type: 'string', enum: ['error', 'warning'] },
      message: { type: 'string' },
      fix: { type: 'string' },
      line: { type: ['integer', 'null'] },
      column: { type: ['integer', 'null'] },
      charIndex: { type: ['integer', 'null'] },
    },
    required: ['rule', 'path', 'severity', 'message'],
  });

  app.addSchema({
    $id: 'SafeRepairAnalysis',
    type: 'object',
    properties: {
      available: { type: 'boolean' },
      originalHash: { type: 'string' },
      findings: { type: 'array', items: { $ref: 'SafeRepairFinding#' } },
      candidate: {
        anyOf: [
          {
            type: 'object',
            properties: {
              originalHash: { type: 'string' },
              candidateHash: { type: 'string' },
              audit: { type: 'array', items: { $ref: 'SafeRepairAuditEntry#' } },
              validation: { $ref: 'BaseXmlValidationResult#' },
              strictEligible: { type: 'boolean' },
            },
            required: [
              'originalHash',
              'candidateHash',
              'audit',
              'validation',
              'strictEligible',
            ],
          },
          { type: 'null' },
        ],
      },
    },
    required: ['available', 'originalHash', 'findings', 'candidate'],
  });

  app.addSchema({
    $id: 'XmlValidationResult',
    type: 'object',
    properties: {
      valid: { type: 'boolean' },
      inputFormat: { type: 'string', enum: ['xml'] },
      validationScope: { type: 'string', enum: ['pint-ae-ubl-xml'] },
      invoiceType: { type: ['string', 'null'] },
      schemaVersion: { type: 'string' },
      format: { $ref: 'LayerResult#' },
      structure: { $ref: 'LayerResult#' },
      semantic: { $ref: 'LayerResult#' },
      safeRepair: { $ref: 'SafeRepairAnalysis#' },
    },
    required: [
      'valid',
      'inputFormat',
      'validationScope',
      'invoiceType',
      'schemaVersion',
      'format',
      'structure',
      'semantic',
    ],
  });

  app.addSchema({
    $id: 'UsageReply',
    type: 'object',
    properties: {
      keyPrefix: { type: 'string' },
      keyName: { type: 'string' },
      totals: {
        type: 'object',
        properties: {
          allTime: { type: 'integer' },
          today: { type: 'integer' },
          last30Days: { type: 'integer' },
        },
      },
      outcomes: {
        type: 'object',
        properties: {
          valid: { type: 'integer' },
          invalid: { type: 'integer' },
          error: { type: 'integer' },
        },
      },
      recent: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            method: { type: 'string' },
            outcome: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  });

  // ---- OpenAPI 3.1 spec (generated from the route schemas) ----
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'UAE e-invoice preflight validation API',
        version: '1.0.0',
        description:
          'Deterministic preflight validation for UAE PINT AE / UBL 2.1 invoices: TRN, required tax fields, ' +
          'line-item and document total arithmetic, VAT category/rate consistency, currency/code-list membership, ' +
          'and invoice-type detection.\n\n' +
          '**Positioning guardrail — preflight validation only.** This API is NOT FTA-accredited, does NOT transmit ' +
          'legal e-invoices, does NOT replace an accredited ASP, and does NOT provide statutory archival.',
      },
      components: {
        securitySchemes: {
          apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
      tags: [
        { name: 'validation', description: 'Invoice preflight validation (incl. Validator-integrated safe repair)' },
        { name: 'generate', description: 'PINT-AE XML invoice generation from form data' },
        { name: 'usage', description: 'Per-key usage metering' },
        { name: 'ops', description: 'Operational probes' },
      ],
    },
  });

  await app.register(healthRoutes);
  await app.register(validateRoutes);
  await app.register(generateRoutes);
  await app.register(usageRoutes);

  await app.ready();
  return app;
}

export { config };
