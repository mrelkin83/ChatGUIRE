import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, botMenus, botMenuNodes } from '@saas/db';
import { eq, and, desc, asc } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export async function botMenuRoutes(server: FastifyInstance) {

  server.get('/bot-menus', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.query as { tenantId?: string };
    if (!tenantId) return reply.status(400).send({ error: 'tenantId is required' });

    try {
      const menus = await db
        .select()
        .from(botMenus)
        .where(eq(botMenus.tenantId, tenantId))
        .orderBy(desc(botMenus.createdAt));
      return menus;
    } catch (err: any) {
      logger.error(`Failed to get bot menus: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/bot-menus', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as {
      tenantId: string;
      name: string;
      triggerType: string;
      triggerKeywords?: string[];
      channel?: string;
    };

    if (!data.tenantId || !data.name) {
      return reply.status(400).send({ error: 'tenantId and name are required' });
    }

    try {
      const [menu] = await db.insert(botMenus).values({
        tenantId: data.tenantId,
        name: data.name,
        triggerType: data.triggerType || 'welcome',
        triggerKeywords: data.triggerKeywords || [],
        channel: data.channel || 'all',
        isActive: true,
      }).returning();

      const welcomeText = data.triggerType === 'after_hours'
        ? '¡Hola! En este momento estamos fuera de horario. ¿En qué puedo ayudarte?'
        : '¡Hola! ¿En qué puedo ayudarte?';

      await db.insert(botMenuNodes).values({
        menuId: menu.id,
        type: 'message',
        content: welcomeText,
        sortOrder: 0,
      });

      return menu;
    } catch (err: any) {
      logger.error(`Failed to create bot menu: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/bot-menus/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      name?: string;
      triggerType?: string;
      triggerKeywords?: string[];
      channel?: string;
      isActive?: boolean;
    };

    try {
      const [menu] = await db.update(botMenus).set({
        ...(data.name && { name: data.name }),
        ...(data.triggerType && { triggerType: data.triggerType }),
        ...(data.triggerKeywords && { triggerKeywords: data.triggerKeywords }),
        ...(data.channel && { channel: data.channel }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      }).where(eq(botMenus.id, id)).returning();

      if (!menu) return reply.status(404).send({ error: 'Menu not found' });
      return menu;
    } catch (err: any) {
      logger.error(`Failed to update bot menu: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.delete('/bot-menus/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(botMenuNodes).where(eq(botMenuNodes.menuId, id));
      await db.delete(botMenus).where(eq(botMenus.id, id));
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to delete bot menu: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.get('/bot-menus/:id/nodes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const nodes = await db
        .select()
        .from(botMenuNodes)
        .where(eq(botMenuNodes.menuId, id))
        .orderBy(asc(botMenuNodes.sortOrder));
      return nodes;
    } catch (err: any) {
      logger.error(`Failed to get menu nodes: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/bot-menus/:id/nodes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      parentNodeId?: string;
      type: string;
      content?: string;
      options?: any[];
      action?: string;
      actionParams?: any;
      sortOrder?: number;
    };

    try {
      const [node] = await db.insert(botMenuNodes).values({
        menuId: id,
        parentNodeId: data.parentNodeId || null,
        type: data.type || 'message',
        content: data.content || '',
        options: data.options || [],
        action: data.action || null,
        actionParams: data.actionParams || null,
        sortOrder: data.sortOrder ?? 0,
      }).returning();

      return node;
    } catch (err: any) {
      logger.error(`Failed to create menu node: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/bot-menus/nodes/:nodeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { nodeId } = request.params as { nodeId: string };
    const data = request.body as {
      type?: string;
      content?: string;
      options?: any[];
      action?: string;
      actionParams?: any;
      sortOrder?: number;
      parentNodeId?: string | null;
    };

    try {
      const updates: any = {};
      if (data.type !== undefined) updates.type = data.type;
      if (data.content !== undefined) updates.content = data.content;
      if (data.options !== undefined) updates.options = data.options;
      if (data.action !== undefined) updates.action = data.action;
      if (data.actionParams !== undefined) updates.actionParams = data.actionParams;
      if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
      if (data.parentNodeId !== undefined) updates.parentNodeId = data.parentNodeId;

      const [node] = await db.update(botMenuNodes).set(updates).where(eq(botMenuNodes.id, nodeId)).returning();
      if (!node) return reply.status(404).send({ error: 'Node not found' });
      return node;
    } catch (err: any) {
      logger.error(`Failed to update menu node: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.delete('/bot-menus/nodes/:nodeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { nodeId } = request.params as { nodeId: string };
    try {
      await db.delete(botMenuNodes).where(eq(botMenuNodes.id, nodeId));
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to delete menu node: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/bot-menus/:id/duplicate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const [original] = await db.select().from(botMenus).where(eq(botMenus.id, id)).limit(1);
      if (!original) return reply.status(404).send({ error: 'Menu not found' });

      const [newMenu] = await db.insert(botMenus).values({
        tenantId: original.tenantId,
        name: `${original.name} (copia)`,
        triggerType: original.triggerType,
        triggerKeywords: original.triggerKeywords,
        channel: original.channel,
        isActive: false,
      }).returning();

      const nodes = await db.select().from(botMenuNodes).where(eq(botMenuNodes.menuId, id));
      for (const node of nodes) {
        await db.insert(botMenuNodes).values({
          menuId: newMenu.id,
          parentNodeId: node.parentNodeId,
          type: node.type,
          content: node.content,
          options: node.options,
          action: node.action,
          actionParams: node.actionParams,
          sortOrder: node.sortOrder,
        });
      }

      return newMenu;
    } catch (err: any) {
      logger.error(`Failed to duplicate bot menu: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });
}
