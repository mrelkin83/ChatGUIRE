import { db, campaigns, campaignRecipients, customers } from '@saas/db';
import { eq, and, or, isNotNull, sql } from 'drizzle-orm';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

export interface SegmentFilters {
  tags?: string[];
  lastInteractionBefore?: string;
  lastInteractionAfter?: string;
  minOrders?: number;
  maxOrders?: number;
  includeInactive?: boolean;
}

export interface CampaignThrottle {
  messagesPerMinute: number;
  dailyLimit: number;
}

/**
 * CampaignEngine — Motor de segmentación, encolado y métricas.
 *
 * Responsabilidades:
 *   1. Construir segmento de clientes desde filtros JSON
 *   2. Generar y persistir destinatarios
 *   3. Encolar jobs en Redis para el worker
 *   4. Gestionar pausa y cancelación
 *   5. Calcular métricas en tiempo real
 */
export class CampaignEngine {
  static readonly QUEUE_NAME = 'campaign:send';
  private static readonly PAUSE_KEY = (id: string) => `campaign:${id}:paused`;
  private static readonly CANCEL_KEY = (id: string) => `campaign:${id}:cancelled`;

  /**
   * Cuenta cuántos clientes del tenant coinciden con los filtros dados.
   * Usado para mostrar audiencia estimada antes de crear la campaña.
   */
  static async countSegment(tenantId: string, filters: SegmentFilters): Promise<number> {
    const conditions = CampaignEngine.buildConditions(tenantId, filters);
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(conditions);
    return Number(result?.count || 0);
  }

  /**
   * Genera destinatarios para una campaña y los persiste.
   * Usa transacción para evitar duplicados en reintento.
   */
  static async generateRecipients(campaignId: string, tenantId: string): Promise<number> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .limit(1);

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const segment = (campaign.segment as SegmentFilters) || {};
    const conditions = CampaignEngine.buildConditions(tenantId, segment);

    const matched = await db
      .select({ id: customers.id, phone: customers.phone, email: customers.email })
      .from(customers)
      .where(conditions);

    if (matched.length === 0) return 0;

    const isWhatsApp = campaign.channel === 'whatsapp';

    const recipientData = matched
      .map((c) => ({
        campaignId,
        customerId: c.id,
        destination: isWhatsApp ? c.phone : c.email,
        status: 'pending' as const,
      }))
      .filter((r) => !!r.destination);

    if (recipientData.length === 0) return 0;

    await db.transaction(async (tx) => {
      await tx.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
      await tx.insert(campaignRecipients).values(recipientData);
      await tx.update(campaigns)
        .set({ actualAudience: recipientData.length })
        .where(eq(campaigns.id, campaignId));
    });

    logger.info(`[CampaignEngine] Generated ${recipientData.length} recipients for campaign ${campaignId}`);
    return recipientData.length;
  }

  /**
   * Encola la campaña en Redis para que el worker la procese.
   */
  static async enqueue(campaignId: string, tenantId: string): Promise<void> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .limit(1);

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaignId));

    if (Number(count) === 0) {
      await CampaignEngine.generateRecipients(campaignId, tenantId);
    }

    const jobPayload = {
      campaignId,
      tenantId,
      channel: campaign.channel || 'whatsapp',
      content: campaign.content || '',
      throttle: (campaign.throttle as CampaignThrottle) || { messagesPerMinute: 30, dailyLimit: 1000 },
    };

    await redis.lpush(CampaignEngine.QUEUE_NAME, JSON.stringify(jobPayload));
    await redis.del(CampaignEngine.PAUSE_KEY(campaignId));

    logger.info(`[CampaignEngine] Campaign ${campaignId} enqueued`);
  }

  static async pause(campaignId: string): Promise<void> {
    await redis.setex(CampaignEngine.PAUSE_KEY(campaignId), 86400, '1');
    logger.info(`[CampaignEngine] Campaign ${campaignId} paused`);
  }

  static async cancel(campaignId: string): Promise<void> {
    await redis.setex(CampaignEngine.CANCEL_KEY(campaignId), 86400, '1');
    logger.info(`[CampaignEngine] Campaign ${campaignId} cancelled`);
  }

  static async isPaused(campaignId: string): Promise<boolean> {
    try {
      return (await redis.get(CampaignEngine.PAUSE_KEY(campaignId))) === '1';
    } catch {
      return false;
    }
  }

  static async isCancelled(campaignId: string): Promise<boolean> {
    try {
      return (await redis.get(CampaignEngine.CANCEL_KEY(campaignId))) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Métricas agregadas en tiempo real para una campaña.
   */
  static async getMetrics(campaignId: string, tenantId: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
      .limit(1);

    if (!campaign) return null;

    const rows = await db
      .select({ status: campaignRecipients.status, count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaignId))
      .groupBy(campaignRecipients.status);

    const metrics: Record<string, number> = {
      total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0, cancelled: 0,
    };
    for (const row of rows) {
      metrics[row.status] = Number(row.count);
      metrics.total += Number(row.count);
    }

    const processed = metrics.sent + metrics.failed + metrics.cancelled;
    const progress = metrics.total > 0
      ? ((processed / metrics.total) * 100).toFixed(1)
      : '0.0';

    return { campaign, metrics, progress };
  }

  private static buildConditions(tenantId: string, filters: SegmentFilters) {
    const conditions = and(
      eq(customers.tenantId, tenantId),
      or(isNotNull(customers.phone), isNotNull(customers.email)),
    );

    // Tags and date-range filters omitted — customers table lacks these columns.
    // Extend here when tags/lastInteractionAt columns are added.
    if (filters.tags?.length || filters.lastInteractionBefore || filters.lastInteractionAfter) {
      logger.info(`[CampaignEngine] Advanced segment filters (tags/dates) not yet supported — ignored`);
    }

    return conditions;
  }
}
