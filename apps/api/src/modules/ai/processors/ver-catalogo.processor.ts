import { ActionProcessorInput } from './crear-cita.processor';
import { db, products, categories } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processVerCatalogo(params: ActionProcessorInput): Promise<void> {
  const { tenantId, accion, customerPhone, channel } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_CATALOGO for tenant ${tenantId}`);

  let query = db.select().from(products).where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));
  
  // If category is specified (LLM might send category name or ID)
  if (accion.categoria) {
    // Attempt to find category
    const [cat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.name, accion.categoria)
        )
      )
      .limit(1);
    
    if (cat) {
      query = db.select().from(products).where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          eq(products.categoryId, cat.id)
        )
      );
    }
  }

  const items = await query.limit(10);

  if (items.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Lo siento, no tenemos productos disponibles en este momento.`,
    });
    return;
  }

  const lista = items.map(i => `🛍️ *${i.name}*\n${i.description || ''}\n💰 ${formatCOP(Number(i.price))}`).join('\n\n');

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `Este es nuestro catálogo:\n\n${lista}\n\n¿Deseas agregar algo a tu carrito?`,
  });
}
