import { db, channelSessions } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../modules/channels/core/channel-manager';
import { routeMessage } from '../modules/channels/core/channel-router';
import { logger } from '../lib/logger';
import { TikTokDriver } from '../modules/channels/drivers/tiktok/tiktok.driver';

export async function pollTikTokComments() {
  logger.info('Running TikTok poller...');

  const sessions = await db
    .select()
    .from(channelSessions)
    .where(
      and(
        eq(channelSessions.channel, 'tiktok'),
        eq(channelSessions.status, 'connected')
      )
    );

  const driver = channelManager.getDriver('tiktok') as TikTokDriver;

  for (const session of sessions) {
    try {
      const messages = await driver.poll(session.tenantId, session.externalId);
      for (const msg of messages) {
        await routeMessage(session.tenantId, msg);
      }
    } catch (err: any) {
      logger.error(`Error polling TikTok for tenant ${session.tenantId}: ${err.message}`);
    }
  }
}
