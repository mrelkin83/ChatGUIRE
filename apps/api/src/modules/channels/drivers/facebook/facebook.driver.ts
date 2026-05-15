import { IChannelDriver, ChannelDriverConfig } from '../../core/channel-driver.interface';
import { ChannelType, OutgoingMessage, NormalizedMessage } from '@saas/shared';
import { logger } from '../../../../lib/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

interface FacebookSession {
  pageId: string;
  accessToken: string;
  pageName: string;
}

export class FacebookDriver implements IChannelDriver {
  channel: ChannelType = 'facebook';
  private sessions: Map<string, FacebookSession> = new Map();

  async connect(config: ChannelDriverConfig): Promise<void> {
    logger.info(`Connecting Facebook page: ${config.externalId}`);

    const { pageId, accessToken, pageName } = config.config;

    if (!pageId || !accessToken) {
      throw new Error('Facebook driver requires pageId and accessToken in config');
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${pageId}?fields=name,access_token&access_token=${accessToken}`;
      await axios.get(url);

      const session: FacebookSession = { pageId, accessToken, pageName: pageName || pageId };
      this.sessions.set(config.externalId, session);

      logger.info(`Facebook page ${pageId} connected successfully`);
    } catch (err: any) {
      logger.error(`Failed to connect Facebook page: ${err.message}`);
      throw new Error(`Facebook connection failed: ${err.message}`);
    }
  }

  async disconnect(tenantId: string, externalId: string): Promise<void> {
    logger.info(`Disconnecting Facebook page: ${externalId}`);
    this.sessions.delete(externalId);
  }

  async getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
    const session = this.sessions.get(externalId);
    if (!session) return 'disconnected';

    try {
      const url = `https://graph.facebook.com/v19.0/${session.pageId}?access_token=${session.accessToken}`;
      await axios.get(url);
      return 'connected';
    } catch {
      return 'error';
    }
  }

  async sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string> {
    const session = this.sessions.get(externalId);
    if (!session) throw new Error('Facebook session not found');

    const messageId = uuidv4();

    try {
      const url = `https://graph.facebook.com/v19.0/${session.pageId}/messages?access_token=${session.accessToken}`;
      const payload: any = {
        recipient: { id: to },
        messaging_type: 'RESPONSE',
      };

      if (message.type === 'text' && message.text) {
        payload.message = { text: message.text };
      } else if (message.mediaUrl) {
        payload.message = {
          attachment: {
            type: message.type,
            payload: { url: message.mediaUrl },
          },
        };
      } else {
        payload.message = { text: message.text || '' };
      }

      const response = await axios.post(url, payload);
      logger.info(`Facebook message sent to ${to}: ${response.data.message_id || messageId}`);
      return response.data.message_id || messageId;
    } catch (err: any) {
      logger.error(`Failed to send Facebook message: ${err.message}`);
      throw new Error(`Facebook send failed: ${err.message}`);
    }
  }

  async handleWebhook(payload: any): Promise<NormalizedMessage[] | null> {
    if (payload.object !== 'page') return null;

    const messages: NormalizedMessage[] = [];

    for (const entry of payload.entry || []) {
      const pageId = entry.id;

      for (const messagingEvent of entry.messaging || []) {
        if (messagingEvent.message && !messagingEvent.message.is_echo) {
          const senderId = messagingEvent.sender?.id;
          if (!senderId) continue;

          const session = this.findSessionByPageId(pageId);
          const tenantId = session?.externalId;

          messages.push({
            id: messagingEvent.message.mid || uuidv4(),
            channel: 'facebook' as ChannelType,
            externalId: pageId,
            senderId,
            senderName: undefined,
            content: {
              type: 'text',
              text: messagingEvent.message.text || '',
            },
            timestamp: new Date(messagingEvent.timestamp || Date.now()),
            metadata: { tenantId, pageId },
          });
        }
      }
    }

    return messages.length > 0 ? messages : null;
  }

  private findSessionByPageId(pageId: string): { externalId: string; session: FacebookSession } | null {
    for (const [externalId, session] of this.sessions.entries()) {
      if (session.pageId === pageId) {
        return { externalId, session };
      }
    }
    return null;
  }
}
