import { mongoIsUp } from '../db/mongoose.js';
import { redisIsUp } from '../db/redis.js';

/**
 * Liveness + readiness. The process being able to answer is liveness; the
 * dependency checks (Mongo + Redis) are readiness. Returns 503 when a
 * dependency is down so orchestrators can gate traffic.
 */
export async function healthRoutes(fastify) {
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['ops'],
        summary: 'Liveness/readiness probe (checks Mongo + Redis connectivity).',
        response: {
          200: { $ref: 'HealthReply#' },
          503: { $ref: 'HealthReply#' },
        },
      },
    },
    async (request, reply) => {
      const [redisOk] = await Promise.all([redisIsUp(fastify.redis)]);
      const mongoOk = mongoIsUp();
      const ready = mongoOk && redisOk;
      const body = {
        status: ready ? 'ok' : 'degraded',
        live: true,
        checks: {
          mongo: mongoOk ? 'up' : 'down',
          redis: redisOk ? 'up' : 'down',
        },
        timestamp: new Date().toISOString(),
      };
      return reply.code(ready ? 200 : 503).send(body);
    }
  );
}
