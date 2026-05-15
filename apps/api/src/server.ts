import './load-env';
import Fastify from 'fastify';
import { logger } from './lib/logger';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { webhookRoutes } from './modules/webhooks/webhooks.routes';
import { channelsPlugin } from './modules/channels/channels.plugin';
import { apiRoutes } from './modules/api/api.routes';
import { departmentRoutes } from './modules/api/departments.routes';
import { kanbanRoutes } from './modules/api/kanban.routes';
import { campaignRoutes } from './modules/api/campaigns.routes';
import { integrationRoutes } from './modules/api/integrations.routes';
import { superadminRoutes } from './modules/api/superadmin.routes';
import { botMenuRoutes } from './modules/api/bot-menu.routes';
import { pollInstagramMessages } from './jobs/instagram-poller.job';
import { pollTikTokComments } from './jobs/tiktok-scraper.job';
import { redis } from './lib/redis';

const server = Fastify({
  logger: false,
});

server.addHook('onRequest', (request, reply, done) => {
  logger.info({ method: request.method, url: request.url }, 'incoming request');
  done();
});

async function main() {
  await server.register(cors);
  await server.register(multipart);
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
  });

  await server.register(webhookRoutes, { prefix: '/api/webhooks' });
  await server.register(channelsPlugin, { prefix: '/api' });
  await server.register(apiRoutes, { prefix: '/api' });
  await server.register(departmentRoutes, { prefix: '/api' });
  await server.register(kanbanRoutes, { prefix: '/api' });
  await server.register(campaignRoutes, { prefix: '/api' });
  await server.register(integrationRoutes, { prefix: '/api' });
  await server.register(superadminRoutes, { prefix: '/api' });
  await server.register(botMenuRoutes, { prefix: '/api' });

  let igInterval: ReturnType<typeof setInterval> | null = null;
  let ttInterval: ReturnType<typeof setInterval> | null = null;

  if (process.env.NODE_ENV !== 'test') {
    igInterval = setInterval(pollInstagramMessages, (Number(process.env.IG_POLL_INTERVAL_SECONDS) || 30) * 1000);
    ttInterval = setInterval(pollTikTokComments, (Number(process.env.TT_POLL_INTERVAL_SECONDS) || 60) * 1000);
  }

  server.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  const port = Number(process.env.API_PORT) || 3001;
  const host = process.env.API_HOST || '0.0.0.0';

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (igInterval) clearInterval(igInterval);
    if (ttInterval) clearInterval(ttInterval);

    try {
      await server.close();
      logger.info('Fastify server closed');
    } catch (err: any) {
      logger.error(`Error closing Fastify: ${err.message}`);
    }

    try {
      await redis.quit();
      logger.info('Redis connection closed');
    } catch (err: any) {
      logger.error(`Error closing Redis: ${err.message}`);
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'uncaughtException');
    process.exit(1);
  });

  try {
    await server.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
