import { IChannelDriver, ChannelDriverConfig } from '../../core/channel-driver.interface';
import { ChannelType, OutgoingMessage, NormalizedMessage } from '@saas/shared';
import { evolutionClient } from '../../../../lib/evolution-api.client';
import { messageNormalizer } from '../../core/message-normalizer';
import { logger } from '../../../../lib/logger';

export class WhatsAppDriver implements IChannelDriver {
  channel: ChannelType = 'whatsapp';

  async connect(config: ChannelDriverConfig): Promise<void> {
    logger.info(`Connecting WhatsApp instance: ${config.externalId}`);
    await evolutionClient.createInstance(config.externalId);
  }

  async disconnect(tenantId: string, externalId: string): Promise<void> {
    logger.info(`Disconnecting WhatsApp instance: ${externalId}`);
    await evolutionClient.deleteInstance(externalId);
  }

  async getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
    try {
      const data = await evolutionClient.getInstance(externalId);
      if (data.instance.state === 'open') return 'connected';
      if (data.instance.state === 'connecting') return 'connecting';
      return 'disconnected';
    } catch {
      return 'error';
    }
  }

  async sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string> {
    if (message.type !== 'text') {
      throw new Error(`WhatsApp driver currently only supports text messages in this implementation.`);
    }
    const data = await evolutionClient.sendMessage(externalId, to, message.text || '');
    return data.key?.id || '';
  }

  async handleWebhook(payload: any): Promise<NormalizedMessage | null> {
    // Determine the type of event
    const event = payload.event;
    
    if (event === 'messages.upsert') {
      // Only process inbound messages
      if (payload.data?.key?.fromMe) return null;
      
      const instanceName = payload.instance;
      const tenantId = instanceName.startsWith('tenant_') ? instanceName.replace('tenant_', '') : null;
      
      if (!tenantId) {
        logger.warn(`Received WhatsApp webhook for unknown instance: ${instanceName}`);
        return null;
      }

      return messageNormalizer.normalizeWhatsApp(payload, tenantId);
    }

    return null;
  }
}
