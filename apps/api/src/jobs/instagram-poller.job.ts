import { db, channelSessions } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../modules/channels/core/channel-manager';
import { routeMessage } from '../modules/channels/core/channel-router';
import { logger } from '../lib/logger';
import { InstagramDriver } from '../modules/channels/drivers/instagram/instagram.driver';

export async function pollInstagramMessages() {
  logger.info('Running Instagram poller...');

  // 1. Get all active Instagram sessions
  const sessions = await db
    .select()
    .from(channelSessions)
    .where(
      and(
        eq(channelSessions.channel, 'instagram'),
        eq(channelSessions.status, 'connected')
      )
    );

  const igDriver = channelManager.getDriver('instagram') as InstagramDriver;

  for (const session of sessions) {
    try {
      const messages = await igDriver.poll(session.tenantId, session.externalId);
      
      for (const msg of messages) {
        // We should check if we already processed this message ID to avoid duplicates
        // For now, let's assume routeMessage handles it or we'd need a last_polled_id in session
        await routeMessage(session.tenantId, msg);
      }
    } catch (err: any) {
      logger.error(`Error polling Instagram for tenant ${session.tenantId}: ${err.message}`);
    }
  }
}
