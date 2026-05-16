import { db, conversations, messages, orders, appointments, analyticsDaily, tenants } from '@saas/db';
import { eq, and, gte, lt, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function aggregateDailyAnalytics(): Promise<void> {
  logger.info('Running analytics aggregator job');

  try {
    // Aggregate for yesterday (completed day)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(yesterday);
    todayMidnight.setDate(yesterday.getDate() + 1);

    const allTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.isActive, true));

    for (const tenant of allTenants) {
      try {
        await aggregateForTenant(tenant.id, yesterday, todayMidnight);
      } catch (err: any) {
        logger.error(`Analytics aggregation failed for tenant ${tenant.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.error(`Analytics aggregator job error: ${err.message}`);
  }
}

async function aggregateForTenant(tenantId: string, from: Date, to: Date): Promise<void> {
  // Get per-channel message counts
  const channelCounts = await db
    .select({
      channel: conversations.channel,
      inbound: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`,
      outbound: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(messages.tenantId, tenantId),
        gte(messages.createdAt, from),
        lt(messages.createdAt, to),
      ),
    )
    .groupBy(conversations.channel);

  const [ordersCreated] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, from), lt(orders.createdAt, to)));

  const [apptsCreated] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.createdAt, from), lt(appointments.createdAt, to)));

  const [revenueRow] = await db
    .select({ total: sql<string>`coalesce(sum(total), '0')` })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.status, 'delivered'),
        gte(orders.updatedAt, from),
        lt(orders.updatedAt, to),
      ),
    );

  // Upsert one row per channel
  const channels = channelCounts.length > 0 ? channelCounts : [{ channel: 'all', inbound: 0, outbound: 0 }];

  for (const row of channels) {
    await db
      .insert(analyticsDaily)
      .values({
        tenantId,
        date: from,
        channel: row.channel,
        messagesInbound: Number(row.inbound) || 0,
        messagesOutbound: Number(row.outbound) || 0,
        ordersCreated: Number(ordersCreated?.count) || 0,
        appointmentsCreated: Number(apptsCreated?.count) || 0,
        revenue: revenueRow?.total || '0',
      })
      .onConflictDoNothing();
  }

  logger.info(`Analytics aggregated for tenant ${tenantId} (${from.toISOString().split('T')[0]})`);
}
