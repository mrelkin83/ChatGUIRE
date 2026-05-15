import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { channelManager } from '../channels/core/channel-manager';
import { routeMessage } from '../channels/core/channel-router';
import { logger } from '../../lib/logger';

function verifyEvolutionSignature(request: FastifyRequest): boolean {
  const apiKey = request.headers['x-evolution-api-key'] as string;
  if (!apiKey) {
    logger.warn('Missing Evolution webhook API key header');
    return false;
  }
  const globalKey = process.env.EVOLUTION_API_GLOBAL_KEY;
  if (!globalKey) {
    logger.warn('EVOLUTION_API_GLOBAL_KEY not configured');
    return false;
  }
  return apiKey === globalKey;
}

export async function evolutionWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!verifyEvolutionSignature(request)) {
    return reply.status(401).send({ error: 'Invalid signature' });
  }

  const payload = request.body as any;
  
  try {
    const whatsappDriver = channelManager.getDriver('whatsapp');
    if (!whatsappDriver.handleWebhook) {
      logger.error('WhatsApp driver does not support handleWebhook');
      return reply.status(500).send({ error: 'Driver not configured' });
    }
    const normalized = await whatsappDriver.handleWebhook(payload);
    
    if (normalized) {
      const instanceName = payload.instance;
      const tenantId = instanceName.replace('tenant_', '');

      if (Array.isArray(normalized)) {
        for (const msg of normalized) {
          await routeMessage(tenantId, msg);
        }
      } else {
        await routeMessage(tenantId, normalized);
      }
    }
    
    return reply.status(200).send({ status: 'received' });
  } catch (err: any) {
    logger.error(`Error in Evolution webhook: ${err.message}`);
    return reply.status(500).send({ error: err.message });
  }
}
