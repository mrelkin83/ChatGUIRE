import { FastifyInstance } from 'fastify';
import { evolutionWebhookHandler } from './evolution.webhook';
import { wompiWebhookHandler } from './wompi.webhook';
import { wahaWebhookHandler } from './waha.webhook';
import { integrationWebhookHandler } from './integration.webhook';

export async function webhookRoutes(server: FastifyInstance) {
  server.post('/evolution', evolutionWebhookHandler);
  server.post('/wompi', wompiWebhookHandler);
  server.post('/waha', wahaWebhookHandler);
  server.post('/integration/:tenantId', integrationWebhookHandler);
}
