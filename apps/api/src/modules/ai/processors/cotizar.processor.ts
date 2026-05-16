import { ActionProcessorInput } from './crear-cita.processor';
import { db, products, quotes } from '@saas/db';
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
  const total = subtotal;
  const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

  const quoteItems = items.map(i => ({
    productId: i.id,
    productName: i.name,
    qty: 1,
    unitPrice: Number(i.price),
  }));

  // Generate sequential quote number per tenant
  const quoteNumber = `COT-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(quotes).values({
    tenantId,
    customerId: params.customerId,
    quoteNumber,
    items: quoteItems as any,
    subtotal: subtotal.toFixed(2),
    tax: '0',
    total: total.toFixed(2),
    status: 'pending',
    validUntil,
  });

  const lista = items.map(i => `- ${i.name}: ${formatCOP(Number(i.price))}`).join('\n');

  const mensaje = `📄 *Cotización Formal #${quoteNumber}*\n\n${lista}\n\n--- \n💰 *Total Estimado: ${formatCOP(total)}*\n\nEsta cotización es válida por 3 días. ¿Deseas que procedamos con el pedido?`;

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: mensaje,
  });
}
