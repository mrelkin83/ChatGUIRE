import { IChannelDriver, ChannelDriverConfig } from '../../core/channel-driver.interface';
import { ChannelType, OutgoingMessage, NormalizedMessage } from '@saas/shared';
import { wahaClient } from '../../../../lib/waha-api.client';
import { logger } from '../../../../lib/logger';

export class WahaDriver implements IChannelDriver {
  channel: ChannelType = 'whatsapp';

  async connect(config: ChannelDriverConfig): Promise<void> {
    logger.info(`WAHA connecting session: ${config.externalId}`);
    await wahaClient.createSession(config.externalId);
  }

  async disconnect(tenantId: string, externalId: string): Promise<void> {
    logger.info(`WAHA disconnecting session: ${externalId}`);
    await wahaClient.deleteSession(externalId);
  }

  async getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
    try {
      const data = await wahaClient.getSession(externalId);
      // WAHA returns status: 'STARTING', 'SCAN_QR_CODE', 'WORKING', 'FAILED', 'STOPPED'
      if (data?.status === 'WORKING') return 'connected';
      if (data?.status === 'STARTING' || data?.status === 'SCAN_QR_CODE') return 'connecting';
      return 'disconnected';
    } catch {
      return 'disconnected';
    }
  }

  async sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string> {
    if (message.type !== 'text') {
      throw new Error('WAHA driver currently only supports text messages.');
    }
    const data = await wahaClient.sendText(externalId, to, message.text || '');
    return data?.id || '';
  }

  async getQrCode(externalId: string): Promise<string | null> {
    return await wahaClient.getScreenshot(externalId);
  }

  async getGroups(externalId: string): Promise<any[]> {
    return await wahaClient.getGroups(externalId);
  }

  async sendGroupMessage(externalId: string, groupId: string, text: string): Promise<any> {
    return await wahaClient.sendTextToGroup(externalId, groupId, text);
  }

  async handleWebhook(payload: any): Promise<NormalizedMessage | null> {
    if (payload?.event === 'message' && !payload?.data?.fromMe) {
      const sessionName = payload.session || 'default';
      const tenantId = sessionName.startsWith('tenant_') ? sessionName.replace('tenant_', '') : null;

      if (!tenantId) {
        logger.warn(`WAHA webhook for unknown session: ${sessionName}`);
        return null;
      }

      return {
        id: payload.data?.id || '',
        channel: 'whatsapp',
        externalId: sessionName,
        senderId: payload.data?.from || '',
        senderName: payload.data?._data?.notifyName || null,
        content: {
          type: 'text',
          text: payload.data?.body || '',
        },
        timestamp: new Date(payload.data?.timestamp * 1000 || Date.now()),
        metadata: payload.data,
      };
    }
    return null;
  }
}
