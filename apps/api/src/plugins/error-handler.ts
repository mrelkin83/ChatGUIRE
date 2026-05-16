import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger';

export function setupErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const isProd = process.env.NODE_ENV === 'production';
    const statusCode = error.statusCode ?? 500;

    logger.error(
      { err: error, method: request.method, url: request.url },
      'Request error'
    );

    if (statusCode >= 500) {
      return reply.status(statusCode).send({
        error: isProd ? 'Internal Server Error' : error.message,
        ...(isProd ? {} : { stack: error.stack }),
      });
    }

    return reply.status(statusCode).send({ error: error.message });
  });
}
