import { ActionProcessorInput } from './crear-cita.processor';
import { db, carts, cartItems, products } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { logger } from '../../../lib/logger';

export async function processAgregarCarrito(params: ActionProcessorInput): Promise<void> {
  const { tenantId, accion, customerId, customerPhone, channel } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing AGREGAR_CARRITO for tenant ${tenantId}`);

  // 1. Find product
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.id, accion.productoId)))
    .limit(1);

  if (!product) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `No encontré el producto solicitado. ¿Podrías indicarme de nuevo qué deseas llevar?`,
    });
    return;
  }

  // 2. Find or create active cart
  let [activeCart] = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.tenantId, tenantId),
        eq(carts.customerId, customerId),
        eq(carts.status, 'active')
      )
    )
    .limit(1);

  if (!activeCart) {
    [activeCart] = await db.insert(carts).values({
      tenantId,
      customerId,
      status: 'active',
    }).returning();
  }

  // 3. Add item to cart
  await db.insert(cartItems).values({
    cartId: activeCart.id,
    productId: product.id,
    productName: product.name,
    quantity: accion.cantidad || 1,
    unitPrice: product.price,
  });

  // 4. Confirm
  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ He agregado *${accion.cantidad || 1} x ${product.name}* a tu carrito. 🛒\n\n¿Deseas algo más o quieres finalizar tu pedido?`,
  });
}
