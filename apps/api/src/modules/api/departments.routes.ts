import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, departments, departmentMembers, users, conversations } from '@saas/db';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export async function departmentRoutes(server: FastifyInstance) {

  // Listar departamentos
  server.get('/departments/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const depts = await db.select().from(departments)
        .where(eq(departments.tenantId, tenantId))
        .orderBy(departments.queueOrder);

      // Enrich with member count
      const enriched = await Promise.all(depts.map(async (dept) => {
        const members = await db.select().from(departmentMembers)
          .where(eq(departmentMembers.departmentId, dept.id));
        
        const memberDetails = await Promise.all(members.map(async (m) => {
          const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
          return {
            id: m.id,
            userId: m.userId,
            role: m.role,
            name: user?.fullName || 'Unknown',
            email: user?.email || '',
            agentStatus: user?.agentStatus || 'offline',
          };
        }));

        return {
          ...dept,
          memberCount: members.length,
          members: memberDetails,
        };
      }));

      return enriched;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Crear departamento
  server.post('/departments', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, name, description, color, autoAssign } = request.body as {
      tenantId: string;
      name: string;
      description?: string;
      color?: string;
      autoAssign?: boolean;
    };

    if (!tenantId || !name) {
      return reply.status(400).send({ error: 'tenantId and name are required' });
    }

    try {
      const [dept] = await db.insert(departments).values({
        tenantId,
        name,
        description,
        color: color || '#6366F1',
        autoAssign: autoAssign ?? true,
      }).returning();

      return dept;
    } catch (err: any) {
      logger.error(`Failed to create department: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Actualizar departamento
  server.put('/departments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    try {
      const [dept] = await db.update(departments).set({
        name: data.name,
        description: data.description,
        color: data.color,
        autoAssign: data.autoAssign,
        isActive: data.isActive,
        updatedAt: new Date(),
      }).where(eq(departments.id, id)).returning();

      return dept;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Eliminar departamento
  server.delete('/departments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(departments).where(eq(departments.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Agregar miembro a departamento
  server.post('/departments/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.body as { userId: string; role?: string };

    if (!userId) {
      return reply.status(400).send({ error: 'userId is required' });
    }

    try {
      const [member] = await db.insert(departmentMembers).values({
        departmentId: id,
        userId,
        role: role || 'agent',
      }).returning();

      return member;
    } catch (err: any) {
      logger.error(`Failed to add member to department: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Remover miembro de departamento
  server.delete('/departments/:id/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { memberId } = request.params as { memberId: string };
    try {
      await db.delete(departmentMembers).where(eq(departmentMembers.id, memberId));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Actualizar estado de agente
  server.put('/users/:userId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const { status } = request.body as { status: string };

    if (!['available', 'busy', 'away', 'offline'].includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    try {
      await db.update(users).set({
        agentStatus: status as any,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener agentes disponibles para asignación
  server.get('/agents/available/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const availableAgents = await db.select().from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.agentStatus, 'available'),
            eq(users.isActive, true)
          )
        );

      return availableAgents;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Asignar agente a conversación (round-robin)
  server.post('/conversations/:conversationId/assign', async (request: FastifyRequest, reply: FastifyReply) => {
    const { conversationId } = request.params as { conversationId: string };
    const { departmentId } = request.body as { departmentId?: string };

    try {
      let agentId: string | null = null;

      if (departmentId) {
        // Get available agents in department
        const members = await db.select().from(departmentMembers)
          .where(eq(departmentMembers.departmentId, departmentId));

        const availableAgents = await Promise.all(
          members.map(async (m) => {
            const [user] = await db.select().from(users)
              .where(
                and(
                  eq(users.id, m.userId),
                  eq(users.agentStatus, 'available'),
                  eq(users.isActive, true)
                )
              )
              .limit(1);
            return user;
          })
        );

        const validAgents = availableAgents.filter(Boolean);

        if (validAgents.length > 0) {
          // Round-robin: get agent with least current chats
          const agentsWithCount = await Promise.all(
            validAgents.map(async (agent) => {
              const [result] = await db.select({ count: count() }).from(conversations)
                .where(
                  and(
                    eq(conversations.assignedAgentId, agent!.id),
                    eq(conversations.status, 'active')
                  )
                );
              return { agent: agent!, chatCount: result?.count || 0 };
            })
          );

          agentsWithCount.sort((a, b) => a.chatCount - b.chatCount);
          agentId = agentsWithCount[0].agent.id;
        }
      } else {
        // Get any available agent
        const [agent] = await db.select().from(users)
          .where(
            and(
              eq(users.tenantId, request.body as any),
              eq(users.agentStatus, 'available'),
              eq(users.isActive, true)
            )
          )
          .limit(1);

        if (agent) {
          agentId = agent.id;
        }
      }

      if (!agentId) {
        return reply.status(404).send({ error: 'No available agents' });
      }

      // Assign agent to conversation
      await db.update(conversations).set({
        assignedAgentId: agentId,
        status: 'active',
        updatedAt: new Date(),
      }).where(eq(conversations.id, conversationId));

      // Update agent chat count
      await db.update(users).set({
        currentChatCount: sql`${users.currentChatCount} + 1`,
      }).where(eq(users.id, agentId));

      return { success: true, agentId };
    } catch (err: any) {
      logger.error(`Failed to assign agent: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Transferir conversación a otro agente
  server.post('/conversations/:conversationId/transfer', async (request: FastifyRequest, reply: FastifyReply) => {
    const { conversationId } = request.params as { conversationId: string };
    const { toAgentId } = request.body as { toAgentId: string };

    if (!toAgentId) {
      return reply.status(400).send({ error: 'toAgentId is required' });
    }

    try {
      // Get current conversation
      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conv) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      const previousAgentId = conv.assignedAgentId;

      // Update conversation
      await db.update(conversations).set({
        assignedAgentId: toAgentId,
        updatedAt: new Date(),
      }).where(eq(conversations.id, conversationId));

      // Decrease previous agent chat count
      if (previousAgentId) {
        await db.update(users).set({
          currentChatCount: sql`GREATEST(${users.currentChatCount} - 1, 0)`,
        }).where(eq(users.id, previousAgentId));
      }

      // Increase new agent chat count
      await db.update(users).set({
        currentChatCount: sql`${users.currentChatCount} + 1`,
      }).where(eq(users.id, toAgentId));

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to transfer conversation: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Cerrar conversación
  server.post('/conversations/:conversationId/close', async (request: FastifyRequest, reply: FastifyReply) => {
    const { conversationId } = request.params as { conversationId: string };

    try {
      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conv) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      await db.update(conversations).set({
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(conversations.id, conversationId));

      // Decrease agent chat count
      if (conv.assignedAgentId) {
        await db.update(users).set({
          currentChatCount: sql`GREATEST(${users.currentChatCount} - 1, 0)`,
        }).where(eq(users.id, conv.assignedAgentId));
      }

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
