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
import { campaignAdvRoutes } from './modules/api/campaigns-adv.routes';
import { inboxSSERoutes } from './modules/inbox/inbox-sse.routes';
import { integrationRoutes } from './modules/api/integrations.routes';
import { superadminRoutes } from './modules/api/superadmin.routes';
import { botMenuRoutes } from './modules/api/bot-menu.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { setupAuthGuard } from './plugins/auth';
import { setupErrorHandler } from './plugins/error-handler';
import { setupRateLimit } from './plugins/rate-limit';
import { pollInstagramMessages } from './jobs/instagram-poller.job';
import { pollTikTokComments } from './jobs/tiktok-scraper.job';
import { sendAppointmentReminders } from './jobs/reminder.job';
import { expireStalePayments } from './jobs/payment-checker.job';
import { processDueCampaigns } from './jobs/campaign-sender.job';
import { expireDemoTenants } from './jobs/demo-expiration-checker.job';
import { processUnansweredQueries } from './jobs/ai-learning.job';
import { aggregateDailyAnalytics } from './jobs/analytics-aggregator.job';
import { redis } from './lib/redis';

const server = Fastify({ logger: false });

server.addHook('onRequest', (request, reply, done) => {
  logger.info({ method: request.method, url: request.url }, 'incoming request');
  done();
});

// Capture raw body before JSON parsing (needed for Wompi webhook signature verification)
server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    (req as any).rawBody = body.toString('utf8');
    done(null, JSON.parse((req as any).rawBody));
  } catch (err: any) {
    done(err, undefined);
  }
});

async function main() {
  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.WEB_BASE_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  await server.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── AUTH / JWT ────────────────────────────────────────────────────────────
  await server.register(multipart);
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET no configurado'); })(),
  });

  // ── GLOBAL AUTH GUARD (applies to all /api/* except public paths) ─────────
  setupAuthGuard(server);

  // ── RATE LIMITING (Redis-backed, 100 req/min per IP+path) ────────────────
  setupRateLimit(server);

  // ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
  setupErrorHandler(server);

  // ── ROUTES ───────────────────────────────────────────────────────────────
  await server.register(authRoutes, { prefix: '/api' });
  await server.register(webhookRoutes, { prefix: '/api/webhooks' });
  await server.register(channelsPlugin, { prefix: '/api' });
  await server.register(apiRoutes, { prefix: '/api' });
  await server.register(departmentRoutes, { prefix: '/api' });
  await server.register(kanbanRoutes, { prefix: '/api' });
  await server.register(campaignRoutes, { prefix: '/api' });
  await server.register(integrationRoutes, { prefix: '/api' });
  await server.register(superadminRoutes, { prefix: '/api' });
  await server.register(botMenuRoutes, { prefix: '/api' });
  await server.register(campaignAdvRoutes, { prefix: '/api' });
  await server.register(inboxSSERoutes, { prefix: '/api' });

  // ── BACKGROUND JOBS ───────────────────────────────────────────────────────
  let igInterval: ReturnType<typeof setInterval> | null = null;
  let ttInterval: ReturnType<typeof setInterval> | null = null;
  let reminderInterval: ReturnType<typeof setInterval> | null = null;
  let paymentInterval: ReturnType<typeof setInterval> | null = null;
  let campaignInterval: ReturnType<typeof setInterval> | null = null;
  let demoInterval: ReturnType<typeof setInterval> | null = null;
  let aiLearningInterval: ReturnType<typeof setInterval> | null = null;
  let analyticsInterval: ReturnType<typeof setInterval> | null = null;

  if (process.env.NODE_ENV !== 'test') {
    igInterval = setInterval(pollInstagramMessages, (Number(process.env.IG_POLL_INTERVAL_SECONDS) || 30) * 1000);
    ttInterval = setInterval(pollTikTokComments, (Number(process.env.TT_POLL_INTERVAL_SECONDS) || 60) * 1000);
    reminderInterval = setInterval(sendAppointmentReminders, 60 * 60 * 1000);
    paymentInterval = setInterval(expireStalePayments, 15 * 60 * 1000);
    campaignInterval = setInterval(processDueCampaigns, 60 * 1000);
    // Check for expired demo accounts every hour
    demoInterval = setInterval(expireDemoTenants, 60 * 60 * 1000);
    // Process unanswered queries for AI learning every 30 minutes
    aiLearningInterval = setInterval(processUnansweredQueries, 30 * 60 * 1000);
    // Aggregate yesterday's analytics once per day at startup (then every 24h)
    analyticsInterval = setInterval(aggregateDailyAnalytics, 24 * 60 * 60 * 1000);
    aggregateDailyAnalytics().catch((err) => logger.error(`Initial analytics aggregation failed: ${err.message}`));
  }

  // ── HEALTH ────────────────────────────────────────────────────────────────
  server.get('/health', async () => {
    let dbOk = false;
    let redisOk = false;

    try {
      await redis.ping();
      redisOk = true;
    } catch {}

    try {
      const { db, sql } = await import('@saas/db');
      await (db as any).execute(sql`SELECT 1`);
      dbOk = true;
    } catch {}

    const status = dbOk && redisOk ? 'ok' : 'degraded';
    return { status, uptime: process.uptime(), db: dbOk ? 'ok' : 'error', redis: redisOk ? 'ok' : 'error' };
  });

  // ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (igInterval) clearInterval(igInterval);
    if (ttInterval) clearInterval(ttInterval);
    if (reminderInterval) clearInterval(reminderInterval);
    if (paymentInterval) clearInterval(paymentInterval);
    if (campaignInterval) clearInterval(campaignInterval);
    if (demoInterval) clearInterval(demoInterval);
    if (aiLearningInterval) clearInterval(aiLearningInterval);
    if (analyticsInterval) clearInterval(analyticsInterval);

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

    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => { logger.error({ err: reason }, 'unhandledRejection'); });
  process.on('uncaughtException', (err) => { logger.error({ err }, 'uncaughtException'); process.exit(1); });

  const port = Number(process.env.API_PORT) || 3001;
  const host = process.env.API_HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
