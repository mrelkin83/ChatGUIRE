import { ActionProcessorInput } from './crear-cita.processor';
import { db, messages, users, conversations, departments, departmentMembers } from '@saas/db';
import { eq, and, sql, count } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { logger } from '../../../lib/logger';

export async function processScalamiento(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, customerId, conversationId } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing SCALAMIENTO for tenant ${tenantId}`);

  let assignedAgent: any = null;
  let queuePosition = 0;

  try {
    const depts = await db.select().from(departments)
      .where(and(eq(departments.tenantId, tenantId), eq(departments.isActive, true), eq(departments.autoAssign, true)))
      .limit(1);

    if (depts.length > 0) {
      const dept = depts[0];
      const members = await db.select().from(departmentMembers)
        .where(eq(departmentMembers.departmentId, dept.id));

      const availableAgents: any[] = [];
      for (const m of members) {
        const [user] = await db.select().from(users)
          .where(and(eq(users.id, m.userId), eq(users.agentStatus, 'available'), eq(users.isActive, true)))
          .limit(1);
        if (user) availableAgents.push(user);
      }

      if (availableAgents.length > 0) {
        const agentsWithCount = await Promise.all(
          availableAgents.map(async (agent) => {
            const [result] = await db.select({ cnt: count() }).from(conversations)
              .where(and(eq(conversations.assignedAgentId, agent.id), eq(conversations.status, 'active')));
            return { agent, chatCount: result?.cnt || 0 };
          })
        );
        agentsWithCount.sort((a, b) => a.chatCount - b.chatCount);

        if (agentsWithCount[0].chatCount >= (agentsWithCount[0].agent.maxConcurrentChats || 5)) {
          queuePosition = agentsWithCount.length + 1;
        } else {
          assignedAgent = agentsWithCount[0].agent;
        }
      } else {
        const [totalActive] = await db.select({ cnt: count() }).from(conversations)
          .where(and(eq(conversations.tenantId, tenantId), eq(conversations.status, 'active')));
        queuePosition = (totalActive?.cnt || 0) + 1;
      }
    } else {
      const [agent] = await db.select().from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.agentStatus, 'available'), eq(users.isActive, true)))
        .limit(1);
      if (agent) assignedAgent = agent;
    }
  } catch (err: any) {
    logger.error(`Error finding available agent: ${err.message}`);
  }

  if (assignedAgent) {
    await db.update(conversations).set({
      assignedAgentId: assignedAgent.id,
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(conversations.id, conversationId));

    await db.update(users).set({
      currentChatCount: sql`${users.currentChatCount} + 1`,
    }).where(eq(users.id, assignedAgent.id));

    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Entendido. Te estoy transfiriendo con ${assignedAgent.fullName}. En un momento te atenderá. ¡Gracias por tu paciencia!`,
    });

    await db.insert(messages).values({
      tenantId,
      conversationId,
      direction: 'outbound',
      content: { type: 'text', text: `🔔 Escalado a ${assignedAgent.fullName}` },
    });
  } else {
    const queueMsg = queuePosition > 0
      ? `Todos nuestros asesores están ocupados actualmente. Eres el #${queuePosition} en la cola. Te atenderemos lo antes posible.`
      : 'Entendido. En un momento un agente humano te contactará. Gracias por tu paciencia.';

    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: queueMsg,
    });

    await db.update(conversations).set({ status: 'waiting', updatedAt: new Date() }).where(eq(conversations.id, conversationId));

    await db.insert(messages).values({
      tenantId,
      conversationId,
      direction: 'outbound',
      content: { type: 'text', text: `🔔 Escalamiento solicitado. En cola: posición ${queuePosition}` },
    });
  }

  logger.info(`Escalation processed for tenant ${tenantId}, assigned: ${assignedAgent?.fullName || 'queued'}`);
}
