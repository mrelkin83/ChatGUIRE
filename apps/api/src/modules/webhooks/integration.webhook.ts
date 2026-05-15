import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../lib/logger';
import { db, integrations } from '@saas/db';
import { eq, and } from 'drizzle-orm';

export async function integrationWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.params as { tenantId: string };
  const payload = request.body;

  try {
    const tenantIntegrations = await db.select().from(integrations)
      .where(and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.category, 'automation'),
        eq(integrations.isActive, true)
      ));

    for (const integration of tenantIntegrations) {
      const config = integration.config as Record<string, string>;
      const url = config?.webhook_url || config?.api_url;

      if (url) {
        try {
          const axios = require('axios');
          await axios.post(url, payload, { timeout: 10000 });
          logger.info(`Webhook forwarded to ${integration.provider}: ${url}`);
        } catch (err: any) {
          logger.error(`Webhook forward failed (${integration.provider}): ${err.message}`);
        }
      }
    }

    return reply.status(200).send({ status: 'ok', routed: tenantIntegrations.length });
  } catch (err: any) {
    logger.error(`Integration webhook error: ${err.message}`);
    return reply.status(500).send({ error: err.message });
  }
}
