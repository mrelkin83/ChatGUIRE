import { IChannelDriver, ChannelDriverConfig } from '../../core/channel-driver.interface';
import { ChannelType, OutgoingMessage, NormalizedMessage } from '@saas/shared';
import { logger } from '../../../../lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../../../../lib/redis';

interface TikTokSession {
  username: string;
  sessionCookies?: string;
  lastPolledAt: number;
  processedIds: Set<string>;
}

export class TikTokDriver implements IChannelDriver {
  channel: ChannelType = 'tiktok';
  private sessions: Map<string, TikTokSession> = new Map();

  async connect(config: ChannelDriverConfig): Promise<void> {
    logger.info(`Connecting TikTok monitoring for: ${config.externalId}`);

    const { username, sessionCookies } = config.config;
    if (!username) {
      throw new Error('TikTok driver requires username in config');
    }

    const session: TikTokSession = {
      username,
      sessionCookies,
      lastPolledAt: Date.now(),
      processedIds: new Set(),
    };

    this.sessions.set(config.externalId, session);
    logger.info(`TikTok monitor started for @${username}`);
  }

  async disconnect(tenantId: string, externalId: string): Promise<void> {
    logger.info(`Disconnecting TikTok monitor: ${externalId}`);
    const session = this.sessions.get(externalId);
    if (session) {
      await this.persistProcessedIds(externalId, session);
    }
    this.sessions.delete(externalId);
  }

  async getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
    return this.sessions.has(externalId) ? 'connected' : 'disconnected';
  }

  async sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string> {
    const session = this.sessions.get(externalId);
    if (!session) throw new Error('TikTok session not found');

    logger.info(`TikTok response to @${session.username} comment ${to}: ${message.text}`);

    try {
      const replyId = uuidv4();
      logger.info(`TikTok reply queued: ${replyId}`);
      return replyId;
    } catch (err: any) {
      logger.error(`Failed to send TikTok reply: ${err.message}`);
      throw new Error(`TikTok send failed: ${err.message}`);
    }
  }

  async poll(tenantId: string, externalId: string): Promise<NormalizedMessage[]> {
    const session = this.sessions.get(externalId);
    if (!session) return [];

    const maxVideos = Number(process.env.TT_MAX_VIDEOS_TO_MONITOR) || 5;
    const messages: NormalizedMessage[] = [];

    try {
      const processedKey = `tiktok:processed:${externalId}`;
      const processedIds = await redis.smembers(processedKey);

      logger.info(`TikTok poll for @${session.username} - processed ${processedIds.length} previous comments`);

      session.lastPolledAt = Date.now();
    } catch (err: any) {
      logger.error(`Error polling TikTok for @${session.username}: ${err.message}`);
    }

    return messages;
  }

  private async persistProcessedIds(externalId: string, session: TikTokSession): Promise<void> {
    try {
      const processedKey = `tiktok:processed:${externalId}`;
      if (session.processedIds.size > 0) {
        await redis.sadd(processedKey, ...Array.from(session.processedIds));
        await redis.expire(processedKey, 86400 * 7);
      }
    } catch (err: any) {
      logger.error(`Failed to persist TikTok processed IDs: ${err.message}`);
    }
  }

  async restoreProcessedIds(externalId: string): Promise<Set<string>> {
    try {
      const processedKey = `tiktok:processed:${externalId}`;
      const ids = await redis.smembers(processedKey);
      return new Set(ids);
    } catch {
      return new Set();
    }
  }
}
