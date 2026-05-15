import { ActionProcessorInput } from './crear-cita.processor';
import { db, orders, orderItems } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP, dateHelpers } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processVerEstadoPedido(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, customerId } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_ESTADO_PEDIDO for tenant ${tenantId}`);

  const recentOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, customerId)))
    .orderBy(desc(orders.createdAt))
    .limit(3);

  if (recentOrders.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: 'No tienes pedidos registrados aún.',
    });
    return;
  }

  const statusLabels: Record<string, string> = {
    pending: '⏳ Pendiente',
    paid: '✅ Pagado',
    shipped: '📦 Enviado',
    delivered: '🏠 Entregado',
    cancelled: '❌ Cancelado',
  };

  const lines = recentOrders.map((order) => {
    const fecha = dateHelpers.formatDisplayDateNatural(order.createdAt, params.timezone);
    const estado = statusLabels[order.status] || order.status;
    return `📋 #${order.orderNumber} - ${estado}\n   📅 ${fecha} - ${formatCOP(Number(order.total))}`;
  });

  const message = `📦 *Tus Pedidos Recientes*\n\n${lines.join('\n\n')}`;

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: message,
  });
}
