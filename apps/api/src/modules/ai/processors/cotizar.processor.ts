import { ActionProcessorInput } from './crear-cita.processor';
import { db, products } from '@saas/db';
import { eq, and, inArray } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processCotizar(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing COTIZAR for tenant ${tenantId}`);

  const productIds = accion.productos || [];

  if (productIds.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Por favor dime qué productos te gustaría cotizar.`,
    });
    return;
  }

  // Find products
  const items = await db
    .select()
    .from(products)
    .where(
        and(
            eq(products.tenantId, tenantId),
            inArray(products.id, productIds)
        )
    );

  if (items.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `No pude encontrar los productos especificados para la cotización.`,
    });
    return;
  }

  const subtotal = items.reduce((acc, i) => acc + Number(i.price), 0);
  const total = subtotal; // Simplified, could add tax

  const lista = items.map(i => `- ${i.name}: ${formatCOP(Number(i.price))}`).join('\n');

  const mensaje = `📄 *Cotización Formal*\n\n${lista}\n\n--- \n💰 *Total Estimado: ${formatCOP(total)}*\n\nEsta cotización es válida por 3 días. ¿Deseas que procedamos con el pedido?`;

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: mensaje,
  });
}
