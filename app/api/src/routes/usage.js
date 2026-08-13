import { authenticate, makeRateLimiter } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

// Low-cost policy for usage reads: cheap to serve, cheap to abuse. 10 reads
// per minute per key is far beyond dashboard polling needs.
const USAGE_RATE_LIMIT_MAX = 10;

/**
 * Per-API-key usage, aggregated from the metering events in Mongo.
 * All aggregates are bounded to the current UTC calendar month (the quota
 * contract); the legacy `allTime` field name is kept for response
 * compatibility but now reports the monthly count, not lifetime.
 */
export async function usageRoutes(fastify) {
  const rateLimit = makeRateLimiter(fastify, { max: USAGE_RATE_LIMIT_MAX });

  fastify.get(
    '/usage',
    {
      preHandler: [authenticate, rateLimit],
      schema: {
        tags: ['usage'],
        summary: 'Usage metering for the calling API key.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: { $ref: 'UsageReply#' },
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

      const [monthly, today, last30d, byOutcome, recent] = await Promise.all([
        UsageEvent.countDocuments(monthFilter),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: startOfToday } }),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: start30d } }),
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
          // ponytail: legacy field name, value is now the UTC-month count —
          // renaming would break the documented response contract.
          allTime: monthly,
          today,
          last30Days: last30d,
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
