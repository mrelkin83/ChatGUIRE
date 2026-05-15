import { FastifyRequest, FastifyReply } from 'fastify';
import { channelManager } from '../../modules/channels/core/channel-manager';
import { logger } from '../../lib/logger';

export async function wahaWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = request.body as any;
    logger.info({ event: payload?.event }, 'WAHA webhook received');

    // WAHA sends webhooks with the session name in the payload
    const sessionName = payload?.session || 'default';
    
    // Extract tenant from session name (format: tenant_<uuid>)
    const tenantId = sessionName.startsWith('tenant_') 
      ? sessionName.replace('tenant_', '') 
      : null;

    if (!tenantId) {
      logger.warn(`WAHA webhook: unknown session ${sessionName}`);
      return reply.status(200).send({ status: 'ignored' });
    }

    // Handle message events
    if (payload?.event === 'message') {
      const wahaDriver = channelManager.getDriver('whatsapp-waha' as any);
      const normalizedMsg = await wahaDriver.handleWebhook(payload);
      
      if (normalizedMsg) {
        // Process message via AI Engine
        const { aiEngine } = require('../../modules/ai/ai.engine');
        await aiEngine.process({
          tenantId,
          channel: 'whatsapp',
          customerId: normalizedMsg.senderId,
          customerPhone: normalizedMsg.senderId,
          customerName: normalizedMsg.senderName,
          message: normalizedMsg.content?.text || '',
          conversationId: '', // Will be created by the message handler
        });
      }
    }

    return reply.status(200).send({ status: 'ok' });
  } catch (err: any) {
    logger.error(`WAHA webhook error: ${err.message}`);
    return reply.status(200).send({ status: 'error', message: err.message });
  }
}
