import { NormalizedMessage } from '@saas/shared';
import { logger } from '../../../lib/logger';
import { db, conversations, messages, customers } from '@saas/db';
import { eq, and, sql } from 'drizzle-orm';
import { aiEngine } from '../../ai/ai.engine';
import { isRateLimited } from './rate-limiter';
import { tryBotMenu } from '../../ai/bot-menu.service';

export async function routeMessage(tenantId: string, normalized: NormalizedMessage): Promise<void> {
  logger.info(`Routing message from ${normalized.senderId} via ${normalized.channel}`);

  const limited = await isRateLimited(tenantId, normalized.channel);
  if (limited) {
    logger.warn(`Message dropped due to rate limiting for tenant ${tenantId} on ${normalized.channel}`);
    return;
  }

  // 1. Find or create customer — use upsert to avoid race conditions
  await db.insert(customers).values({
    tenantId,
    externalId: normalized.senderId,
    fullName: normalized.senderName,
    phone: normalized.senderPhone,
    displayName: normalized.senderName || normalized.senderPhone,
  }).onConflictDoUpdate({
    target: [customers.tenantId, customers.externalId],
    set: {
      fullName: sql`COALESCE(EXCLUDED.full_name, customers.full_name)`,
      phone: sql`COALESCE(EXCLUDED.phone, customers.phone)`,
      updatedAt: new Date(),
    },
  });

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.externalId, normalized.senderId)))
    .limit(1);

  // 2. Find or create conversation — upsert on (tenantId, customerId, channel)
  await db.insert(conversations).values({
    tenantId,
    customerId: customer.id,
    channel: normalized.channel,
    status: 'open',
  }).onConflictDoUpdate({
    target: [conversations.tenantId, conversations.customerId, conversations.channel],
    set: { lastMessageAt: new Date() },
  });

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.tenantId, tenantId),
      eq(conversations.customerId, customer.id),
      eq(conversations.channel, normalized.channel),
    ))
    .limit(1);

  // 3. Save inbound message — skip if already processed (idempotency via externalId)
  if (normalized.id) {
    const [existing] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.externalId, normalized.id)))
      .limit(1);
    if (existing) {
      logger.info(`Duplicate message ${normalized.id} ignored for tenant ${tenantId}`);
      return;
    }
  }

  await db.insert(messages).values({
    tenantId,
    conversationId: conversation.id,
    direction: 'inbound',
    externalId: normalized.id,
    content: normalized.content as any,
    timestamp: normalized.timestamp,
    metadata: normalized.metadata,
  });

  // 4. Try bot menu first (for new conversations or active menu sessions)
  const menuHandled = await tryBotMenu(
    tenantId,
    normalized.channel,
    customer.id,
    normalized.senderPhone || normalized.senderId,
    normalized.content.text || '',
    conversation.id,
  );

  if (menuHandled) {
    logger.info(`Message handled by bot menu for tenant ${tenantId}`);
    return;
  }

  // 5. Pass to AI Engine
  logger.info(`Message saved. Passing to AI Engine for tenant ${tenantId}`);
  
  await aiEngine.process({
    tenantId,
    channel: normalized.channel,
    customerId: customer.id,
    customerPhone: normalized.senderPhone || normalized.senderId,
    customerName: customer.fullName,
    message: normalized.content.text || '',
    conversationId: conversation.id,
  });
}
