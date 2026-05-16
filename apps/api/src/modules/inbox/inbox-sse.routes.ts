import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InboxStreamService } from './inbox-stream.service';
import { logger } from '../../lib/logger';
import type { JWTPayload } from '../../plugins/auth';

const streamService = InboxStreamService.getInstance();

/**
 * GET /api/inbox/stream
 *
 * Server-Sent Events para inbox en tiempo real.
 *
 * Auth: JWT via query param ?token=<accessToken>
 * (EventSource del navegador no soporta custom headers)
 *
 * Eventos: connection | message | status | typing | ping
 */
export async function inboxSSERoutes(server: FastifyInstance) {
  server.get(
    '/inbox/stream',
    {
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        const token = (request.query as Record<string, string>).token;
        if (!token) {
          return reply.status(401).send({ error: 'Unauthorized: token requerido' });
        }
        try {
          const payload = server.jwt.verify<JWTPayload>(token);
          request.user = payload;
        } catch {
          return reply.status(401).send({ error: 'Unauthorized: token inválido' });
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as JWTPayload;
      const conversationId = (request.query as Record<string, string>).conversationId;

      // Hijack para que Fastify no interfiera con la respuesta streaming
      reply.hijack();

      const raw = reply.raw;
      raw.setHeader('Content-Type', 'text/event-stream');
      raw.setHeader('Cache-Control', 'no-cache');
      raw.setHeader('Connection', 'keep-alive');
      raw.setHeader('X-Accel-Buffering', 'no'); // Desactiva buffering en Nginx
      raw.flushHeaders?.();

      const clientId = streamService.register({
        userId: user.userId,
        tenantId: user.tenantId,
        conversationId: conversationId || undefined,
        response: raw,
      });

      logger.info(`[SSE] Client connected: ${clientId} (user=${user.userId}, tenant=${user.tenantId})`);

      raw.write(`event: connection\n`);
      raw.write(`data: ${JSON.stringify({ clientId, connectedAt: new Date().toISOString() })}\n\n`);

      const keepAlive = setInterval(() => {
        if (raw.writableEnded) {
          clearInterval(keepAlive);
          return;
        }
        raw.write(`event: ping\n`);
        raw.write(`data: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
      }, 30_000);

      request.raw.on('close', () => {
        clearInterval(keepAlive);
        streamService.unregister(clientId);
        logger.info(`[SSE] Client disconnected: ${clientId}`);
      });

      request.raw.on('error', (err) => {
        clearInterval(keepAlive);
        streamService.unregister(clientId);
        logger.error(`[SSE] Client error: ${clientId} — ${err.message}`);
      });
    },
  );
}
