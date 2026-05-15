import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, tenants, customers, conversations, messages, orders, appointments, products, categories, users, aiKnowledge, aiUnanswered, tenantConfig, payments, analyticsDaily } from '@saas/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { llmClient } from '../../lib/llm-client';

export async function apiRoutes(server: FastifyInstance) {

  // --- DASHBOARD ---
  server.get('/dashboard/stats/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

      const [convCount] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.tenantId, tenantId));
      const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId));
      const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.tenantId, tenantId));
      const [revenue] = await db.select({ total: sql<number>`coalesce(sum(total), 0)` }).from(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.status, 'paid')));
      const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.status, 'pending')));
      const [appointmentCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.status, 'scheduled')));
      const [msgCount] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.tenantId, tenantId));
      const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.tenantId, tenantId));

      const channelStats = await db.select({ channel: conversations.channel, count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.tenantId, tenantId)).groupBy(conversations.channel);

      return {
        tenant,
        conversations: convCount.count,
        customers: customerCount.count,
        sales: orderCount.count,
        totalRevenue: Number(revenue.total),
        pendingOrders: pendingOrders.count,
        upcomingAppointments: appointmentCount.count,
        messages: msgCount.count,
        products: productCount.count,
        aiResponseRate: 92,
        channelStats: channelStats.map(c => ({ channel: c.channel, count: c.count })),
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- CONVERSATIONS ---
  server.get('/conversations/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const convs = await db.select().from(conversations)
        .where(eq(conversations.tenantId, tenantId))
        .orderBy(desc(conversations.lastMessageAt));

      const enriched = await Promise.all(convs.map(async (conv) => {
        const [customer] = await db.select().from(customers).where(eq(customers.id, conv.customerId)).limit(1);
        const [lastMsg] = await db.select().from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.timestamp))
          .limit(1);
        return {
          ...conv,
          customerName: customer?.displayName || customer?.fullName || 'Cliente',
          lastMessage: (lastMsg?.content as any)?.text || '',
          lastMessageAt: conv.lastMessageAt,
          unread: 0,
        };
      }));

      return enriched;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.get('/conversations/:tenantId/:conversationId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, conversationId } = request.params as { tenantId: string; conversationId: string };
    try {
      const msgs = await db.select().from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.conversationId, conversationId)))
        .orderBy(messages.timestamp);
      return msgs;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/conversations/:tenantId/:conversationId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, conversationId } = request.params as { tenantId: string; conversationId: string };
    const { text } = request.body as { text: string };
    try {
      const [msg] = await db.insert(messages).values({
        tenantId,
        conversationId,
        direction: 'outbound',
        content: { type: 'text', text },
      }).returning();
      await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
      return msg;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- PRODUCTS ---
  server.get('/products/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const prods = await db.select().from(products).where(eq(products.tenantId, tenantId)).orderBy(desc(products.createdAt));
      const cats = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
      return prods.map(p => ({
        ...p,
        categoryName: cats.find(c => c.id === p.categoryId)?.name || '',
      }));
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/products/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as any;
    try {
      const [product] = await db.insert(products).values({ ...data, tenantId }).returning();
      return product;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/products/:tenantId/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, productId } = request.params as { tenantId: string; productId: string };
    const data = request.body as any;
    try {
      const [product] = await db.update(products).set(data)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .returning();
      return product;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.delete('/products/:tenantId/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, productId } = request.params as { tenantId: string; productId: string };
    try {
      await db.delete(products).where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- ORDERS ---
  server.get('/orders/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const ords = await db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(desc(orders.createdAt));
      return ords;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- APPOINTMENTS ---
  server.get('/appointments/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const apts = await db.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(desc(appointments.scheduledAt));
      return apts;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- USERS / TEAM ---
  server.get('/users/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const usrs = await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.createdAt));
      return usrs;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/users/:tenantId/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as any;
    try {
      const [user] = await db.insert(users).values({
        tenantId,
        email: data.email,
        fullName: data.fullName,
        role: data.role || 'agent',
        passwordHash: '',
        isActive: true,
      }).returning();
      return user;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- TENANTS ---
  server.get('/tenants', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
      return allTenants;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.get('/tenants/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return tenant;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/tenants/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as any;
    try {
      const [tenant] = await db.update(tenants).set({
        name: data.name,
        vertical: data.vertical,
        timezone: data.timezone,
        ai_model: data.ai_model,
        ai_temperature: String(data.ai_temperature),
        ai_max_tokens: data.ai_max_tokens,
      }).where(eq(tenants.id, tenantId)).returning();
      return tenant;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // --- AI CONFIG ---
  server.get('/ai/config/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return {
        systemPrompt: tenant.name,
        model: tenant.ai_model,
        temperature: Number(tenant.ai_temperature),
        maxTokens: tenant.ai_max_tokens,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/ai/config/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as any;
    try {
      const [tenant] = await db.update(tenants).set({
        ai_model: data.model,
        ai_temperature: String(data.temperature),
        ai_max_tokens: data.maxTokens,
      }).where(eq(tenants.id, tenantId)).returning();
      return tenant;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.get('/ai/knowledge/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const kb = await db.select().from(aiKnowledge).where(eq(aiKnowledge.tenantId, tenantId)).orderBy(desc(aiKnowledge.createdAt));
      return kb.map((entry: any) => ({
        ...entry,
        category: entry.metadata?.category || 'general',
        keywords: entry.metadata?.keywords || [],
      }));
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/ai/knowledge/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as any;
    try {
      let embedding: number[] | null = null;
      try {
        embedding = await llmClient.createEmbedding(`${data.question} ${data.answer}`);
      } catch {}
      const [entry] = await db.insert(aiKnowledge).values({
        tenantId,
        question: data.question,
        answer: data.answer,
        metadata: { category: data.category || 'general', keywords: data.keywords || [] },
        embedding,
      }).returning();
      return {
        ...entry,
        category: (entry.metadata as any)?.category || 'general',
        keywords: (entry.metadata as any)?.keywords || [],
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.delete('/ai/knowledge/:tenantId/:knowledgeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, knowledgeId } = request.params as { tenantId: string; knowledgeId: string };
    try {
      await db.delete(aiKnowledge).where(and(eq(aiKnowledge.id, knowledgeId), eq(aiKnowledge.tenantId, tenantId)));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.get('/ai/unanswered/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const items = await db.select().from(aiUnanswered)
        .where(and(eq(aiUnanswered.tenantId, tenantId), eq(aiUnanswered.isResolved, false)))
        .orderBy(desc(aiUnanswered.createdAt));
      return items.map((item: any) => ({ ...item, question: item.query }));
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/ai/unanswered/:id/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { answer } = request.body as { answer: string };
    if (!answer) return reply.status(400).send({ error: 'answer is required' });

    try {
      const existing = await db.select().from(aiUnanswered).where(eq(aiUnanswered.id, id)).limit(1);
      if (existing.length === 0) return reply.status(404).send({ error: 'Entry not found' });

      const entry = existing[0];
      let embedding: number[] | null = null;
      try {
        embedding = await llmClient.createEmbedding(`${entry.query} ${answer}`);
      } catch {}

      await db.insert(aiKnowledge).values({
        tenantId: entry.tenantId,
        question: entry.query,
        answer,
        metadata: { category: 'resolved' },
        embedding,
      });
      await db.update(aiUnanswered).set({ isResolved: true }).where(eq(aiUnanswered.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/ai/unanswered/:id/ignore', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(aiUnanswered).set({ isResolved: true }).where(eq(aiUnanswered.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // TENANT CONFIG (key-value por tenant)
  // ═══════════════════════════════════════════

  // Obtener toda la configuración de un tenant
  server.get('/tenant-config/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const configs = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId));
      
      // Convertir array de configs a objeto
      const configMap: Record<string, any> = {};
      for (const config of configs) {
        configMap[config.key] = config.value;
      }
      
      return configMap;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Guardar/actualizar configuración del tenant
  server.put('/tenant-config/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as Record<string, any>;
    
    try {
      // Para cada key en el body, upsert en tenantConfig
      for (const [key, value] of Object.entries(data)) {
        await db.insert(tenantConfig)
          .values({
            tenantId,
            key,
            value,
          })
          .onConflictDoUpdate({
            target: [tenantConfig.tenantId, tenantConfig.key],
            set: { value, updatedAt: new Date() },
          });
      }
      
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener configuración específica por key
  server.get('/tenant-config/:tenantId/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, key } = request.params as { tenantId: string; key: string };
    try {
      const [config] = await db.select().from(tenantConfig)
        .where(and(eq(tenantConfig.tenantId, tenantId), eq(tenantConfig.key, key)))
        .limit(1);
      
      if (!config) return { value: null };
      return { value: config.value };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Eliminar configuración específica
  server.delete('/tenant-config/:tenantId/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, key } = request.params as { tenantId: string; key: string };
    try {
      await db.delete(tenantConfig)
        .where(and(eq(tenantConfig.tenantId, tenantId), eq(tenantConfig.key, key)));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // ALIAS /tenants/:tenantId/config
  // ═══════════════════════════════════════════

  server.get('/tenants/:tenantId/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const configs = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId));
      const configMap: Record<string, any> = {};
      for (const config of configs) configMap[config.key] = config.value;
      return configMap;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/tenants/:tenantId/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = request.body as Record<string, any>;
    try {
      for (const [key, value] of Object.entries(data)) {
        await db.insert(tenantConfig)
          .values({ tenantId, key, value })
          .onConflictDoUpdate({
            target: [tenantConfig.tenantId, tenantConfig.key],
            set: { value, updatedAt: new Date() },
          });
      }
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // TRANSACTIONS / PAYMENTS HISTORY
  // ═══════════════════════════════════════════

  server.get('/transactions/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const data = await db.select().from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt));
      return data;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════

  server.get('/analytics/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const daily = await db.select().from(analyticsDaily)
        .where(eq(analyticsDaily.tenantId, tenantId))
        .orderBy(desc(analyticsDaily.date))
        .limit(30);

      const totals = await db.select({
        totalMessagesInbound: sql<number>`COALESCE(SUM(${analyticsDaily.messagesInbound}), 0)`,
        totalMessagesOutbound: sql<number>`COALESCE(SUM(${analyticsDaily.messagesOutbound}), 0)`,
        totalOrders: sql<number>`COALESCE(SUM(${analyticsDaily.ordersCreated}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${analyticsDaily.revenue}), 0)`,
        totalAppointments: sql<number>`COALESCE(SUM(${analyticsDaily.appointmentsCreated}), 0)`,
      }).from(analyticsDaily)
        .where(eq(analyticsDaily.tenantId, tenantId));

      return { daily, totals: totals[0] };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // PUT AI KNOWLEDGE (editar)
  // ═══════════════════════════════════════════

  server.put('/ai/knowledge/:tenantId/:knowledgeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, knowledgeId } = request.params as { tenantId: string; knowledgeId: string };
    const data = request.body as any;
    try {
      const [existing] = await db.select().from(aiKnowledge)
        .where(and(eq(aiKnowledge.id, knowledgeId), eq(aiKnowledge.tenantId, tenantId)))
        .limit(1);
      if (!existing) return reply.status(404).send({ error: 'Entry not found' });

      const updates: any = {};
      if (data.question !== undefined) updates.question = data.question;
      if (data.answer !== undefined) updates.answer = data.answer;
      if (data.metadata !== undefined) updates.metadata = data.metadata;

      if (updates.question || updates.answer) {
        try {
          updates.embedding = await llmClient.createEmbedding(`${updates.question || existing.question} ${updates.answer || existing.answer}`);
        } catch {}
      }

      const [updated] = await db.update(aiKnowledge)
        .set(updates)
        .where(and(eq(aiKnowledge.id, knowledgeId), eq(aiKnowledge.tenantId, tenantId)))
        .returning();
      return updated;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
