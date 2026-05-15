import { ActionProcessorInput } from './crear-cita.processor';
import { db, carts, cartItems, orders, orderItems } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function processCrearPedido(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerId, customerPhone, channel, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing CREAR_PEDIDO for tenant ${tenantId}`);

  // 1. Get active cart
  const [activeCart] = await db
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
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `No tienes un carrito activo. ¿Deseas ver nuestro catálogo?`,
    });
    return;
  }

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, activeCart.id));
  if (items.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Tu carrito está vacío. ¿Deseas ver nuestro catálogo?`,
    });
    return;
  }

  // 2. Create order
  const total = items.reduce((acc, i) => acc + Number(i.unitPrice) * i.quantity, 0);
  const orderNumber = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;

  const [order] = await db.insert(orders).values({
    tenantId,
    customerId,
    orderNumber,
    total: total.toString(),
    status: 'pending',
    shippingAddress: accion.direccionEnvio || null,
    notes: accion.notas || null,
  }).returning();

  // 3. Move items to order_items
  for (const item of items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantInfo: item.variantInfo,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
  }

  // 4. Mark cart as converted
  await db.update(carts).set({ status: 'converted' }).where(eq(carts.id, activeCart.id));

  // 5. Confirm and ask for payment
  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ *¡Pedido creado con éxito!*\n\n🔢 Orden: #${orderNumber}\n💰 Total: ${formatCOP(total)}\n\n¿Deseas proceder al pago ahora?`,
  });
}
