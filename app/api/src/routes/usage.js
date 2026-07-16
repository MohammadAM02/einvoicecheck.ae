import { authenticate } from '../plugins/security.js';
import { UsageEvent } from '../models/UsageEvent.js';

/**
 * Per-API-key usage, aggregated from the metering events in Mongo.
 * Returns lifetime + trailing-30-day + today counts, an outcome breakdown,
 * and the most recent events.
 */
export async function usageRoutes(fastify) {
  fastify.get(
    '/usage',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['usage'],
        summary: 'Usage metering for the calling API key.',
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        response: {
          200: { $ref: 'UsageReply#' },
          401: { $ref: 'ErrorReply#' },
        },
      },
    },
    async (request, reply) => {
      const keyId = request.apiKey._id;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [total, today, last30d, byOutcome, recent] = await Promise.all([
        UsageEvent.countDocuments({ keyId }),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: startOfToday } }),
        UsageEvent.countDocuments({ keyId, timestamp: { $gte: start30d } }),
        UsageEvent.aggregate([
          { $match: { keyId } },
          { $group: { _id: '$outcome', count: { $sum: 1 } } },
        ]),
        UsageEvent.find({ keyId }).sort({ timestamp: -1 }).limit(10).lean(),
      ]);

      const outcomes = { valid: 0, invalid: 0, error: 0 };
      for (const row of byOutcome) {
        if (row._id in outcomes) outcomes[row._id] = row.count;
      }

      return reply.code(200).send({
        keyPrefix: request.apiKey.prefix,
        keyName: request.apiKey.name,
        totals: { allTime: total, today, last30Days: last30d },
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
