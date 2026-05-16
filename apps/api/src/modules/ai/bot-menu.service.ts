import { db, botMenus, botMenuNodes, conversationState, messages } from '@saas/db';
import { eq, and, asc } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { channelManager } from '../channels/core/channel-manager';
import { ChannelType } from '@saas/shared';

interface MenuNodeRow {
  id: string;
  menuId: string;
  parentNodeId: string | null;
  type: string;
  content: string | null;
  options: any;
  action: string | null;
  actionParams: any;
  sortOrder: number | null;
}

export async function tryBotMenu(
  tenantId: string,
  channel: ChannelType,
  customerId: string,
  customerPhone: string,
  message: string,
  conversationId: string,
): Promise<boolean> {
  try {
    const stateRows = await db
      .select()
      .from(conversationState)
      .where(
        and(
          eq(conversationState.tenantId, tenantId),
          eq(conversationState.customerId, customerId),
          eq(conversationState.channel, channel),
        ),
      )
      .limit(1);

    const state = stateRows[0];
    const historial = (state?.historial as any[]) || [];

    if (historial.length > 2) return false;

    const menuState: any = (state?.historial as any[])?.find((h: any) => h.role === 'system' && h._botMenuId);

    let activeMenuId: string | null = null;
    let currentNodeId: string | null = null;

    if (menuState) {
      activeMenuId = menuState._botMenuId;
      currentNodeId = menuState._currentNodeId;
    }

    if (!activeMenuId) {
      const menus = await db
        .select()
        .from(botMenus)
        .where(and(eq(botMenus.tenantId, tenantId), eq(botMenus.isActive, true)));

      let matchedMenu: typeof menus[0] | undefined = menus.find(
        (m) => m.triggerType === 'welcome' && (m.channel === 'all' || m.channel === channel),
      );

      if (!matchedMenu) {
        matchedMenu = menus.find(
          (m) => m.triggerType === 'keyword' && (m.channel === 'all' || m.channel === channel),
        );
        if (matchedMenu && matchedMenu.triggerKeywords) {
          const msgLower = message.toLowerCase().trim();
          const hasKeyword = matchedMenu.triggerKeywords.some((kw) => msgLower.includes(kw.toLowerCase()));
          if (!hasKeyword) matchedMenu = undefined;
        }
      }

      if (!matchedMenu) return false;
      activeMenuId = matchedMenu.id;
    }

    const allNodes: MenuNodeRow[] = await db
      .select()
      .from(botMenuNodes)
      .where(eq(botMenuNodes.menuId, activeMenuId!))
      .orderBy(asc(botMenuNodes.sortOrder));

    if (allNodes.length === 0) return false;

    let nextNode: MenuNodeRow | undefined;

    if (!currentNodeId) {
      nextNode = allNodes.find((n) => !n.parentNodeId);
    } else {
      const currentNode = allNodes.find((n) => n.id === currentNodeId);
      if (currentNode?.type === 'options') {
        const opts = (currentNode.options || []) as { label: string; value: string }[];
        const selection = message.trim();
        const selectedOpt = opts.find(
          (o) => o.value === selection || o.label.toLowerCase() === selection.toLowerCase(),
        );

        if (selectedOpt) {
          nextNode = allNodes.find((n) => n.parentNodeId === currentNodeId);
        } else {
          return false;
        }
      } else if (currentNode?.type === 'action') {
        return false;
      } else {
        return false;
      }
    }

    if (!nextNode) return false;

    const instanceName = `tenant_${tenantId}`;

    if (nextNode.type === 'message') {
      const text = nextNode.content || '';
      if (text) {
        await channelManager.sendMessage(tenantId, channel, instanceName, customerPhone, {
          type: 'text',
          text,
        });
        await db.insert(messages).values({
          tenantId,
          conversationId,
          direction: 'outbound',
          senderType: 'system',
          content: { type: 'text', text } as any,
        });
      }
      return true;
    }

    if (nextNode.type === 'options') {
      let text = nextNode.content || '';
      const opts = (nextNode.options || []) as { label: string; value: string }[];
      if (opts.length > 0) {
        text += '\n\n' + opts.map((o, i) => `${i + 1}\ufe0f\u20e3 ${o.label}`).join('\n');
      }
      if (text) {
        await channelManager.sendMessage(tenantId, channel, instanceName, customerPhone, {
          type: 'text',
          text,
        });
        await db.insert(messages).values({
          tenantId,
          conversationId,
          direction: 'outbound',
          senderType: 'system',
          content: { type: 'text', text } as any,
        });
      }

      const newHistorial = [
        ...(historial.length > 0 ? historial : [{ role: 'user', content: message }]),
        { role: 'assistant', content: text },
        { role: 'system', content: 'Bot menu active', _botMenuId: activeMenuId, _currentNodeId: nextNode.id },
      ];

      await db.insert(conversationState).values({
        tenantId,
        customerId,
        channel,
        historial: newHistorial,
      }).onConflictDoUpdate({
        target: [conversationState.tenantId, conversationState.customerId, conversationState.channel],
        set: { historial: newHistorial, updatedAt: new Date() },
      });

      return true;
    }

    if (nextNode.type === 'action') {
      let text = nextNode.content || '';
      if (text) {
        await channelManager.sendMessage(tenantId, channel, instanceName, customerPhone, {
          type: 'text',
          text,
        });
        await db.insert(messages).values({
          tenantId,
          conversationId,
          direction: 'outbound',
          senderType: 'system',
          content: { type: 'text', text } as any,
        });
      }
      return false;
    }

    return true;
  } catch (err: any) {
    logger.error(`Bot menu error: ${err.message}`);
    return false;
  }
}
