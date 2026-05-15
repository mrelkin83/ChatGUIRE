import { IChannelDriver, ChannelDriverConfig } from '../../core/channel-driver.interface';
import { ChannelType, OutgoingMessage, NormalizedMessage } from '@saas/shared';
import axios from 'axios';
import { logger } from '../../../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

export class InstagramDriver implements IChannelDriver {
  channel: ChannelType = 'instagram';
  private bridgeUrl: string;

  constructor() {
    this.bridgeUrl = process.env.INSTAGRAM_BRIDGE_URL || 'http://localhost:8000';
  }

  async connect(config: ChannelDriverConfig): Promise<void> {
    logger.info(`Connecting Instagram account: ${config.externalId}`);
    await axios.post(`${this.bridgeUrl}/login`, {
      username: config.externalId,
      password: config.config.password,
      proxy: config.config.proxy,
    });
  }

  async disconnect(tenantId: string, externalId: string): Promise<void> {
    logger.info(`Disconnecting Instagram account: ${externalId}`);
    // The bridge might not have a logout endpoint yet, but we'd call it here
  }

  async getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
    try {
      // Check if we can get directs as a way to verify connection
      await axios.get(`${this.bridgeUrl}/get_directs/${externalId}`);
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }

  async sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string> {
    const { data } = await axios.post(`${this.bridgeUrl}/send_message`, {
      username: externalId,
      thread_id: to,
      text: message.text,
    });
    return data.message_id || uuidv4();
  }

  async poll(tenantId: string, externalId: string): Promise<NormalizedMessage[]> {
    try {
      const { data } = await axios.get(`${this.bridgeUrl}/get_directs/${externalId}`);
      const normalized: NormalizedMessage[] = [];

      for (const thread of data.threads) {
        // Only process the last message if it's from the customer and newer than our last check
        const lastMsg = thread.last_permanent_item;
        if (lastMsg && lastMsg.user_id !== thread.viewer_id) {
           normalized.push({
             id: lastMsg.id,
             channel: 'instagram',
             externalId,
             senderId: thread.id, // thread id is used as the conversation identifier in IG bridge
             senderName: thread.users[0]?.full_name || thread.users[0]?.username,
             content: {
               type: 'text',
               text: lastMsg.text || '',
             },
             timestamp: new Date(lastMsg.timestamp / 1000),
             metadata: lastMsg,
           });
        }
      }

      return normalized;
    } catch (err: any) {
      logger.error(`Error polling Instagram for ${externalId}: ${err.message}`);
      return [];
    }
  }
}
