import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, kanbanColumns, conversations, customers, messages, users } from '@saas/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export async function kanbanRoutes(server: FastifyInstance) {

  // Listar columnas Kanban
  server.get('/kanban/columns/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const columns = await db.select().from(kanbanColumns)
        .where(eq(kanbanColumns.tenantId, tenantId))
        .orderBy(kanbanColumns.sortOrder);
      return columns;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Crear columna Kanban
  server.post('/kanban/columns', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, name, color, isFinal } = request.body as {
      tenantId: string;
      name: string;
      color?: string;
      isFinal?: boolean;
    };

    if (!tenantId || !name) {
      return reply.status(400).send({ error: 'tenantId and name are required' });
    }

    try {
      // Get max sort order
      const [maxOrder] = await db.select({ max: sql<number>`coalesce(max(${kanbanColumns.sortOrder}), 0)` })
        .from(kanbanColumns)
        .where(eq(kanbanColumns.tenantId, tenantId));

      const [column] = await db.insert(kanbanColumns).values({
        tenantId,
        name,
        color: color || '#6366F1',
        sortOrder: (maxOrder?.max || 0) + 1,
        isFinal: isFinal || false,
      }).returning();

      return column;
    } catch (err: any) {
      logger.error(`Failed to create kanban column: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Actualizar columna Kanban
  server.put('/kanban/columns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    try {
      const [column] = await db.update(kanbanColumns).set({
        name: data.name,
        color: data.color,
        isFinal: data.isFinal,
        sortOrder: data.sortOrder,
        updatedAt: new Date(),
      }).where(eq(kanbanColumns.id, id)).returning();

      return column;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Eliminar columna Kanban
  server.delete('/kanban/columns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      // Move conversations to null
      await db.update(conversations).set({ kanbanColumnId: null })
        .where(eq(conversations.kanbanColumnId, id));
      
      await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener conversaciones por columna Kanban
  server.get('/kanban/conversations/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { columnId, channel, agentId } = request.query as { 
      columnId?: string; 
      channel?: string;
      agentId?: string;
    };

    try {
      let query = db.select().from(conversations)
        .where(eq(conversations.tenantId, tenantId));

      const convs = await query.orderBy(desc(conversations.lastMessageAt));

      // Enrich with customer info and last message
      const enriched = await Promise.all(convs.map(async (conv) => {
        const [customer] = await db.select().from(customers)
          .where(eq(customers.id, conv.customerId)).limit(1);
        
        const [lastMsg] = await db.select().from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.timestamp))
          .limit(1);

        const [agent] = conv.assignedAgentId 
          ? await db.select().from(users).where(eq(users.id, conv.assignedAgentId)).limit(1)
          : [null];

        return {
          ...conv,
          customerName: customer?.displayName || customer?.fullName || 'Cliente',
          customerPhone: customer?.phone || '',
          lastMessage: (lastMsg?.content as any)?.text || '',
          agentName: agent?.fullName || null,
        };
      }));

      // Apply filters
      let filtered = enriched;
      if (columnId) {
        filtered = filtered.filter(c => c.kanbanColumnId === columnId);
      }
      if (channel) {
        filtered = filtered.filter(c => c.channel === channel);
      }
      if (agentId) {
        filtered = filtered.filter(c => c.assignedAgentId === agentId);
      }

      return filtered;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Mover conversación a columna Kanban
  server.put('/kanban/conversations/:conversationId/move', async (request: FastifyRequest, reply: FastifyReply) => {
    const { conversationId } = request.params as { conversationId: string };
    const { columnId, potentialValue } = request.body as { 
      columnId: string; 
      potentialValue?: number;
    };

    try {
      const updates: any = {
        kanbanColumnId: columnId,
        kanbanMovedAt: new Date(),
        updatedAt: new Date(),
      };

      if (potentialValue !== undefined) {
        updates.potentialValue = potentialValue;
      }

      await db.update(conversations).set(updates)
        .where(eq(conversations.id, conversationId));

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to move conversation: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener estadísticas del Kanban
  server.get('/kanban/stats/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const columns = await db.select().from(kanbanColumns)
        .where(eq(kanbanColumns.tenantId, tenantId))
        .orderBy(kanbanColumns.sortOrder);

      const stats = await Promise.all(columns.map(async (col) => {
        const [result] = await db.select({ 
          count: sql<number>`count(*)`,
          totalValue: sql<number>`coalesce(sum(${conversations.potentialValue}), 0)`
        })
          .from(conversations)
          .where(
            and(
              eq(conversations.tenantId, tenantId),
              eq(conversations.kanbanColumnId, col.id)
            )
          );

        return {
          columnId: col.id,
          columnName: col.name,
          columnColor: col.color,
          count: result?.count || 0,
          totalValue: result?.totalValue || 0,
        };
      }));

      return stats;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
