import type { ServerResponse } from 'http';
import { logger } from '../../lib/logger';

interface SSEClient {
  id: string;
  userId: string;
  tenantId: string;
  conversationId?: string;
  response: ServerResponse;
  connectedAt: Date;
}

export interface BroadcastPayload {
  event: 'message' | 'status' | 'typing' | 'system';
  tenantId: string;
  conversationId: string;
  data: unknown;
}

/**
 * InboxStreamService — Singleton para gestionar conexiones SSE del inbox.
 *
 * En producción con múltiples réplicas, extender con Redis Pub/Sub
 * para broadcast cross-instance.
 */
export class InboxStreamService {
  private static instance: InboxStreamService;
  private clients: Map<string, SSEClient> = new Map();

  private constructor() {}

  static getInstance(): InboxStreamService {
    if (!InboxStreamService.instance) {
      InboxStreamService.instance = new InboxStreamService();
    }
    return InboxStreamService.instance;
  }

  register(client: Omit<SSEClient, 'id' | 'connectedAt'>): string {
    const id = `${client.tenantId}:${client.userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    this.clients.set(id, { ...client, id, connectedAt: new Date() });
    return id;
  }

  unregister(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcast a todos los clientes relevantes del tenant.
   * Si client.conversationId está definido, solo recibe esa conversación.
   * Si es undefined, recibe todo el tenant (vista global).
   */
  broadcast(payload: BroadcastPayload): void {
    const { tenantId, conversationId, event, data } = payload;
    let sent = 0;

    for (const client of this.clients.values()) {
      if (client.tenantId !== tenantId) continue;
      if (client.conversationId && client.conversationId !== conversationId) continue;

      try {
        if (!client.response.writableEnded) {
          client.response.write(`event: ${event}\n`);
          client.response.write(`data: ${JSON.stringify(data)}\n\n`);
          sent++;
        }
      } catch (err) {
        logger.warn(`[SSE] Failed to send to client ${client.id}, unregistering`);
        this.unregister(client.id);
      }
    }

    if (sent > 0) {
      logger.debug(`[SSE] Broadcast '${event}' to ${sent} client(s) (tenant=${tenantId})`);
    }
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId && !client.response.writableEnded) {
        try {
          client.response.write(`event: ${event}\n`);
          client.response.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          this.unregister(client.id);
        }
      }
    }
  }

  getStats(): { totalConnections: number; byTenant: Record<string, number> } {
    const byTenant: Record<string, number> = {};
    for (const client of this.clients.values()) {
      byTenant[client.tenantId] = (byTenant[client.tenantId] || 0) + 1;
    }
    return { totalConnections: this.clients.size, byTenant };
  }

  pruneDeadConnections(): void {
    const before = this.clients.size;
    for (const [id, client] of this.clients.entries()) {
      if (client.response.writableEnded) this.clients.delete(id);
    }
    const pruned = before - this.clients.size;
    if (pruned > 0) {
      logger.info(`[SSE] Pruned ${pruned} dead connections. Active: ${this.clients.size}`);
    }
  }
}

setInterval(() => InboxStreamService.getInstance().pruneDeadConnections(), 300_000);
