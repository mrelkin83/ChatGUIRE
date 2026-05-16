import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

interface RateLimitConfig {
  windowMs: number; // window in milliseconds
  max: number;      // max requests per window
  keyPrefix?: string;
}

const DEFAULTS: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  max: 100,
  keyPrefix: 'rl',
};

function getClientKey(request: FastifyRequest): string {
  const ip = request.ip || 'unknown';
  const path = request.url.split('?')[0];
  return `${DEFAULTS.keyPrefix}:${ip}:${path}`;
}

export function setupRateLimit(server: FastifyInstance, config: Partial<RateLimitConfig> = {}): void {
  const cfg = { ...DEFAULTS, ...config };

  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split('?')[0];
    if (!url.startsWith('/api/')) return;

    const key = getClientKey(request);
    const windowSec = Math.ceil(cfg.windowMs / 1000);

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }
      if (current > cfg.max) {
        logger.warn(`Rate limit exceeded for ${key}`);
        reply.header('Retry-After', windowSec);
        return reply.status(429).send({ error: 'Too many requests. Please slow down.' });
      }
      reply.header('X-RateLimit-Limit', cfg.max);
      reply.header('X-RateLimit-Remaining', Math.max(0, cfg.max - current));
    } catch {
      // If Redis is down, allow the request (fail open)
    }
  });
}
