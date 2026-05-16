import { db, campaigns, contactListEntries, campaignLogs } from '@saas/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { evolutionClient } from '../lib/evolution-api.client';
import { logger } from '../lib/logger';

export async function processDueCampaigns(): Promise<void> {
  logger.info('Running campaign sender job');

  try {
    const now = new Date();

    const due = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'scheduled'),
          lte(campaigns.nextRunAt, now),
        ),
      );

    logger.info(`Found ${due.length} campaigns due for sending`);

    for (const campaign of due) {
      try {
        // Claim the campaign atomically to prevent double-processing if job fires twice
        const [claimed] = await db
          .update(campaigns)
          .set({ status: 'running', updatedAt: new Date() })
          .where(
            and(
              eq(campaigns.id, campaign.id),
              eq(campaigns.status, 'scheduled'),
            ),
          )
          .returning({ id: campaigns.id });

        if (!claimed) continue; // Another instance claimed it first

        await sendCampaign(campaign);
      } catch (err: any) {
        logger.error(`Campaign ${campaign.id} failed: ${err.message}`);
        await db
          .update(campaigns)
          .set({ status: 'scheduled', updatedAt: new Date() })
          .where(eq(campaigns.id, campaign.id));
      }
    }
  } catch (err: any) {
    logger.error(`Campaign sender job error: ${err.message}`);
  }
}

async function sendCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
  const contacts = await db
    .select()
    .from(contactListEntries)
    .where(eq(contactListEntries.listId, campaign.listId));

  const allMessages = campaign.messages as { text: string; active: boolean }[];
  const activeMessages = allMessages.filter((m) => m.active);

  if (activeMessages.length === 0) {
    await db.update(campaigns).set({ status: 'completed', updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
    logger.warn(`Campaign ${campaign.id} has no active messages — marked completed`);
    return;
  }

  const instanceName = `tenant_${campaign.tenantId}`;
  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    try {
      const msgIndex = Math.floor(Math.random() * activeMessages.length);
      const msg = activeMessages[msgIndex];

      let text = msg.text;
      const vars = (contact.variables as Record<string, string>) || {};
      text = text.replace(/\{\{nombre\}\}/g, contact.name || '');
      text = text.replace(/\{\{telefono\}\}/g, contact.phone);
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      }

      await evolutionClient.sendMessage(instanceName, contact.phone, text);

      await db.insert(campaignLogs).values({
        campaignId: campaign.id,
        contactPhone: contact.phone,
        contactName: contact.name,
        messageIndex: msgIndex + 1,
        status: 'sent',
        sentAt: new Date(),
      });

      sentCount++;

      // 30 msg/min throttle — 2 s between sends
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err: any) {
      logger.error(`Campaign ${campaign.id} — failed to send to ${contact.phone}: ${err.message}`);

      await db.insert(campaignLogs).values({
        campaignId: campaign.id,
        contactPhone: contact.phone,
        contactName: contact.name,
        status: 'failed',
        errorMessage: err.message,
      });

      failedCount++;
    }
  }

  const nextRunAt = calcNextRunAt(campaign.recurrence, new Date());

  await db.update(campaigns).set({
    status: nextRunAt ? 'scheduled' : 'completed',
    sentCount: sql`${campaigns.sentCount} + ${sentCount}`,
    failedCount: sql`${campaigns.failedCount} + ${failedCount}`,
    nextRunAt,
    updatedAt: new Date(),
  }).where(eq(campaigns.id, campaign.id));

  logger.info(`Campaign ${campaign.id} done — sent: ${sentCount}, failed: ${failedCount}`);
}

function calcNextRunAt(recurrence: string | null, from: Date): Date | null {
  if (!recurrence || recurrence === 'once') return null;
  const next = new Date(from);
  switch (recurrence) {
    case 'daily':    next.setDate(next.getDate() + 1); break;
    case 'weekly':   next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly':  next.setMonth(next.getMonth() + 1); break;
    default: return null;
  }
  return next;
}
