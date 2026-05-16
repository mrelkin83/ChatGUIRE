import { db, campaigns, campaignRecipients, customers } from '@saas/db';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { CampaignEngine } from '../services/campaign-engine.service';
import { evolutionClient } from '../lib/evolution-api.client';

interface CampaignJob {
  campaignId: string;
  tenantId: string;
}

/**
 * CampaignWorker — Consume la cola Redis `campaign:send` y envía mensajes
 * por lotes con throttling por campaña y límite diario por tenant.
 *
 * Arquitectura: proceso separado (ver docker-compose campaign-worker service).
 * Reconexión automática ante errores. Pause/cancel via claves Redis.
 */
export class CampaignWorker {
  private static readonly QUEUE_NAME = 'campaign:send';
  private static readonly DAILY_COUNT_KEY = (tenantId: string) =>
    `tenant:${tenantId}:campaign:daily`;

  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('[CampaignWorker] Started — listening on queue campaign:send');

    while (this.isRunning) {
      try {
        const result = await redis.brpop(CampaignWorker.QUEUE_NAME, 5);
        if (!result) continue;

        const [, payload] = result;
        const job: CampaignJob = JSON.parse(payload);
        await this.processJob(job);
      } catch (err: any) {
        logger.error(`[CampaignWorker] Unhandled error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    logger.info('[CampaignWorker] Stopping...');
  }

  private async processJob(job: CampaignJob): Promise<void> {
    const { campaignId, tenantId } = job;

    if (await CampaignEngine.isCancelled(campaignId)) {
      logger.info(`[CampaignWorker] Campaign ${campaignId} cancelled, skipping`);
      return;
    }

    if (await CampaignEngine.isPaused(campaignId)) {
      logger.info(`[CampaignWorker] Campaign ${campaignId} paused, requeueing in 30s`);
      await redis.lpush(CampaignWorker.QUEUE_NAME, JSON.stringify(job));
      await new Promise((r) => setTimeout(r, 30_000));
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .limit(1);

    if (!campaign || campaign.status === 'completed' || campaign.status === 'cancelled') return;

    const throttle = (campaign.throttle as { messagesPerMinute: number; dailyLimit: number } | null) ?? {
      messagesPerMinute: 30,
      dailyLimit: 1000,
    };

    const dailyCountRaw = await redis.get(CampaignWorker.DAILY_COUNT_KEY(tenantId));
    const dailyCount = parseInt(dailyCountRaw || '0', 10);

    if (dailyCount >= throttle.dailyLimit) {
      logger.warn(`[CampaignWorker] Daily limit ${throttle.dailyLimit} reached for tenant ${tenantId}`);
      await redis.lpush(CampaignWorker.QUEUE_NAME, JSON.stringify(job));
      await new Promise((r) => setTimeout(r, 3_600_000)); // esperar 1 hora
      return;
    }

    const batchSize = throttle.messagesPerMinute;
    const delayMs = Math.ceil(60_000 / throttle.messagesPerMinute);

    const recipients = await db
      .select({
        id: campaignRecipients.id,
        destination: campaignRecipients.destination,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerEmail: customers.email,
      })
      .from(campaignRecipients)
      .leftJoin(customers, eq(campaignRecipients.customerId, customers.id))
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'pending'),
        ),
      )
      .limit(batchSize);

    if (recipients.length === 0) {
      await db
        .update(campaigns)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(campaigns.id, campaignId));
      logger.info(`[CampaignWorker] Campaign ${campaignId} completed`);
      return;
    }

    const instanceName = `tenant_${tenantId}`;
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      if (await CampaignEngine.isPaused(campaignId)) {
        logger.info(`[CampaignWorker] Paused mid-batch, requeueing`);
        await redis.lpush(CampaignWorker.QUEUE_NAME, JSON.stringify(job));
        break;
      }
      if (await CampaignEngine.isCancelled(campaignId)) break;

      const recipient = recipients[i];

      try {
        const content = this.personalize(campaign.content || '', {
          name: recipient.customerName,
          phone: recipient.customerPhone,
          email: recipient.customerEmail,
        });

        const destination = recipient.destination || recipient.customerPhone || '';
        if (!destination) throw new Error('Sin destino para el destinatario');

        if (campaign.channel === 'whatsapp') {
          await evolutionClient.sendMessage(instanceName, destination, content);
        } else {
          throw new Error(`Canal '${campaign.channel}' no implementado aún`);
        }

        await db
          .update(campaignRecipients)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(campaignRecipients.id, recipient.id));

        const dailyKey = CampaignWorker.DAILY_COUNT_KEY(tenantId);
        await redis.incr(dailyKey);
        await redis.expire(dailyKey, 86400);
        sentCount++;
      } catch (err: any) {
        logger.error(`[CampaignWorker] Failed for recipient ${recipient.id}: ${err.message}`);
        await db
          .update(campaignRecipients)
          .set({ status: 'failed', error: err.message, failedAt: new Date() })
          .where(eq(campaignRecipients.id, recipient.id));
        failCount++;
      }

      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    logger.info(`[CampaignWorker] Batch done — sent: ${sentCount}, failed: ${failCount} (campaign ${campaignId})`);

    const [{ remaining }] = await db
      .select({ remaining: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'pending'),
        ),
      );

    if (Number(remaining) > 0) {
      await redis.lpush(CampaignWorker.QUEUE_NAME, JSON.stringify(job));
    } else {
      await db
        .update(campaigns)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(campaigns.id, campaignId));
      logger.info(`[CampaignWorker] Campaign ${campaignId} fully completed`);
    }
  }

  private personalize(
    content: string,
    customer: { name?: string | null; phone?: string | null; email?: string | null },
  ): string {
    return content
      .replace(/\{\{name\}\}/g, customer.name || 'Cliente')
      .replace(/\{\{phone\}\}/g, customer.phone || '')
      .replace(/\{\{email\}\}/g, customer.email || '');
  }
}

export const campaignWorker = new CampaignWorker();
