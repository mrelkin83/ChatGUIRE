import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, campaigns, campaignRecipients, customers } from '@saas/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { verifyTenantAccess } from '../../plugins/auth';
import { CampaignEngine } from '../../services/campaign-engine.service';

// ─── Validaciones Zod ────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(['whatsapp', 'email']),
  content: z.string().min(1).max(4000),
  segment: z.object({
    tags: z.array(z.string()).optional(),
    lastInteractionBefore: z.string().datetime().optional(),
    lastInteractionAfter: z.string().datetime().optional(),
    minOrders: z.number().int().min(0).optional(),
    maxOrders: z.number().int().min(0).optional(),
    includeInactive: z.boolean().default(false),
  }),
  schedule: z.object({
    type: z.enum(['immediate', 'scheduled']),
    sendAt: z.string().datetime().optional(),
    timezone: z.string().default('America/Bogota'),
  }),
  throttle: z.object({
    messagesPerMinute: z.number().int().min(1).max(60).default(30),
    dailyLimit: z.number().int().min(1).max(10000).default(1000),
  }).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(4000).optional(),
});

/**
 * Rutas avanzadas de campañas (segmentación dinámica).
 * Base: /api/campaigns-adv
 *
 * Coexiste con /api/campaigns (campaigns.routes.ts — list-based).
 */
export async function campaignAdvRoutes(server: FastifyInstance) {

  // GET /api/campaigns-adv/:tenantId — listar campañas avanzadas
  server.get('/campaigns-adv/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    const { status, page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageN = Math.max(1, parseInt(page));
    const limitN = Math.min(100, Math.max(1, parseInt(limit)));

    try {
      const where = and(
        eq(campaigns.tenantId, tenantId),
        ...(status ? [eq(campaigns.status, status)] : []),
      );

      const rows = await db
        .select()
        .from(campaigns)
        .where(where)
        .orderBy(desc(campaigns.createdAt))
        .offset((pageN - 1) * limitN)
        .limit(limitN);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(campaigns)
        .where(where);

      return {
        data: rows,
        pagination: { page: pageN, limit: limitN, total: Number(total), totalPages: Math.ceil(Number(total) / limitN) },
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/campaigns-adv/:tenantId/:id — detalle + métricas
  server.get('/campaigns-adv/:tenantId/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    try {
      const result = await CampaignEngine.getMetrics(id, tenantId);
      if (!result) return reply.status(404).send({ error: 'Campaign not found' });
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/campaigns-adv — crear campaña con segmentación
  server.post('/campaigns-adv', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const tenantId = body?.tenantId as string;

    if (!tenantId) return reply.status(400).send({ error: 'tenantId requerido' });
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validación fallida', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    if (data.schedule.type === 'scheduled' && !data.schedule.sendAt) {
      return reply.status(400).send({ error: 'sendAt requerido para campañas programadas' });
    }

    try {
      const estimatedAudience = await CampaignEngine.countSegment(tenantId, data.segment);
      if (estimatedAudience === 0) {
        return reply.status(400).send({ error: 'El segmento no retorna clientes' });
      }

      const initialStatus = data.schedule.type === 'immediate' ? 'sending' : 'scheduled';
      const userId = (request.user as any)?.userId;

      const scheduledAt = data.schedule.type === 'scheduled' && data.schedule.sendAt
        ? new Date(data.schedule.sendAt)
        : null;

      const [campaign] = await db.insert(campaigns).values({
        tenantId,
        name: data.name,
        // listId null — segmentation campaign uses segment JSON instead
        messages: [],
        channel: data.channel,
        content: data.content,
        segment: data.segment as any,
        throttle: (data.throttle || { messagesPerMinute: 30, dailyLimit: 1000 }) as any,
        scheduledAt,
        nextRunAt: scheduledAt,
        status: initialStatus,
        estimatedAudience,
      } as any).returning();

      if (data.schedule.type === 'immediate') {
        await CampaignEngine.enqueue(campaign.id, tenantId);
        logger.info(`[CampaignsAdv] Immediate campaign enqueued: ${campaign.id} (est. ${estimatedAudience} recipients)`);
      }

      return reply.status(201).send(campaign);
    } catch (err: any) {
      logger.error(`[CampaignsAdv] Create error: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // PATCH /api/campaigns-adv/:tenantId/:id — actualizar (solo draft/scheduled/paused)
  server.patch('/campaigns-adv/:tenantId/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validación fallida', details: parsed.error.flatten() });
    }

    try {
      const [existing] = await db
        .select({ status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!existing) return reply.status(404).send({ error: 'Campaign not found' });
      if (!['draft', 'scheduled', 'paused'].includes(existing.status || '')) {
        return reply.status(400).send({ error: `No se puede modificar campaña en estado: ${existing.status}` });
      }

      const [updated] = await db
        .update(campaigns)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .returning();

      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/campaigns-adv/:tenantId/:id/pause
  server.post('/campaigns-adv/:tenantId/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    try {
      const [campaign] = await db
        .select({ status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!campaign || campaign.status !== 'sending') {
        return reply.status(400).send({ error: 'Campaign not found o no está en estado sending' });
      }

      await db.update(campaigns).set({ status: 'paused', updatedAt: new Date() }).where(eq(campaigns.id, id));
      await CampaignEngine.pause(id);

      return { message: 'Campaña pausada' };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/campaigns-adv/:tenantId/:id/resume
  server.post('/campaigns-adv/:tenantId/:id/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    try {
      const [campaign] = await db
        .select({ status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!campaign || campaign.status !== 'paused') {
        return reply.status(400).send({ error: 'Campaign not found o no está pausada' });
      }

      await db.update(campaigns).set({ status: 'sending', updatedAt: new Date() }).where(eq(campaigns.id, id));
      await CampaignEngine.enqueue(id, tenantId);

      return { message: 'Campaña reanudada' };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/campaigns-adv/:tenantId/:id/cancel
  server.post('/campaigns-adv/:tenantId/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    try {
      const [campaign] = await db
        .select({ status: campaigns.status })
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!campaign || ['completed', 'cancelled'].includes(campaign.status || '')) {
        return reply.status(400).send({ error: 'Campaign no puede ser cancelada' });
      }

      await db.update(campaigns).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(campaigns.id, id));
      await CampaignEngine.cancel(id);

      await db
        .update(campaignRecipients)
        .set({ status: 'cancelled' })
        .where(and(eq(campaignRecipients.campaignId, id), eq(campaignRecipients.status, 'pending')));

      return { message: 'Campaña cancelada' };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/campaigns-adv/:tenantId/:id/recipients — paginados
  server.get('/campaigns-adv/:tenantId/:id/recipients', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, id } = request.params as { tenantId: string; id: string };
    if (!verifyTenantAccess(request, reply, tenantId)) return;

    const { status, page = '1', limit = '50' } = request.query as Record<string, string>;
    const pageN = Math.max(1, parseInt(page));
    const limitN = Math.min(200, Math.max(1, parseInt(limit)));

    try {
      const [exists] = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!exists) return reply.status(404).send({ error: 'Campaign not found' });

      const where = and(
        eq(campaignRecipients.campaignId, id),
        ...(status ? [eq(campaignRecipients.status, status)] : []),
      );

      const rows = await db
        .select({
          id: campaignRecipients.id,
          customerId: campaignRecipients.customerId,
          destination: campaignRecipients.destination,
          status: campaignRecipients.status,
          sentAt: campaignRecipients.sentAt,
          failedAt: campaignRecipients.failedAt,
          error: campaignRecipients.error,
          customerName: customers.fullName,
          customerPhone: customers.phone,
        })
        .from(campaignRecipients)
        .leftJoin(customers, eq(campaignRecipients.customerId, customers.id))
        .where(where)
        .orderBy(desc(campaignRecipients.createdAt))
        .offset((pageN - 1) * limitN)
        .limit(limitN);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(campaignRecipients)
        .where(where);

      return {
        data: rows,
        pagination: { page: pageN, limit: limitN, total: Number(total) },
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
