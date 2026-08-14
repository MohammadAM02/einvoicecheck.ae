import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

// Low-cost policy for usage reads: cheap to serve, cheap to abuse. 10 reads
// per minute per key is far beyond dashboard polling needs. Uses a separate
// Redis bucket from paid validation/conversion/generation traffic (A-019).
const USAGE_RATE_LIMIT_MAX = 10;

const usageReplySchema = {
  type: 'object',
  properties: {
    keyPrefix: { type: 'string' },
    keyName: { type: 'string' },
    totals: {
      type: 'object',
      properties: {
        // Documented lifetime field — true lifetime count, kept for
        // compatibility (A-020). Uses the existing keyId index only.
        allTime: { type: 'integer' },
        today: { type: 'integer' },
        last30Days: { type: 'integer' },
        // Explicit current UTC calendar month — the quota contract. Used for
        // quota/outcome/recent calculations; no unbounded aggregation.
        currentMonth: { type: 'integer' },
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
};

/**
 * Per-API-key usage, aggregated from the metering events in Mongo.
 * All quota/outcome/recent work is bounded to the current UTC calendar month
 * (the quota contract); `totals.allTime` keeps its documented lifetime
 * meaning (A-020). No unbounded aggregation beyond the indexed lifetime count.
 */
export async function usageRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify, {
    max: USAGE_RATE_LIMIT_MAX,
    namespace: 'usage',
  });

  fastify.get(
    '/usage',
    {
      preHandler: [authenticate, rateLimit],
      schema: {
        tags: ['usage'],
        summary: 'Usage metering for the calling API key.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: usageReplySchema,
          401: { $ref: 'ErrorReply#' },
          429: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const keyId = request.apiKey._id;
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthFilter = { keyId, timestamp: { $gte: startOfMonth } };

      const [monthly, today, last30d, lifetime, byOutcome, recent] = await Promise.all([
        UsageEvent.countDocuments(monthFilter),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: startOfToday } }),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: start30d } }),
        UsageEvent.countDocuments({ keyId }),
        UsageEvent.aggregate([
          { $match: monthFilter },
          { $group: { _id: '$outcome', count: { $sum: 1 } } },
        ]),
        UsageEvent.find(monthFilter).sort({ timestamp: -1 }).limit(10).lean(),
      ]);

      const outcomes = { valid: 0, invalid: 0, error: 0 };
      for (const row of byOutcome) {
        if (row._id in outcomes) outcomes[row._id] = row.count;
      }

      return reply.code(200).send({
        keyPrefix: request.apiKey.prefix,
        keyName: request.apiKey.name,
        totals: {
          allTime: lifetime,
          today,
          last30Days: last30d,
          currentMonth: monthly,
        },
        outcomes,
        recent: recent.map((e) => ({
          endpoint: e.endpoint,
          method: e.method,
          outcome: e.outcome,
          statusCode: e.statusCode,
          timestamp: e.timestamp,
        })),
      });
    }
  );
}
