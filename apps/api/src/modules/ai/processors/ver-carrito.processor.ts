import { ActionProcessorInput } from './crear-cita.processor';
import { db, carts, cartItems, products } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processVerCarrito(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, customerId } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_CARRITO for tenant ${tenantId}`);

  const [cart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.tenantId, tenantId), eq(carts.customerId, customerId), eq(carts.status, 'active')))
    .limit(1);

  if (!cart) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: 'Tu carrito está vacío. Puedes ver nuestro catálogo diciendo "ver catálogo".',
    });
    return;
  }

  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  if (items.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: 'Tu carrito está vacío. Puedes ver nuestro catálogo diciendo "ver catálogo".',
    });
    return;
  }

  let total = 0;
  const lines = items.map((item, i) => {
    const subtotal = Number(item.unitPrice) * item.quantity;
    total += subtotal;
    return `${i + 1}. ${item.productName} x${item.quantity} - ${formatCOP(subtotal)}`;
  });

  const message = `🛒 *Tu Carrito*\n\n${lines.join('\n')}\n\n💰 *Total: ${formatCOP(total)}*\n\n¿Deseas crear el pedido? Escribe *"crear pedido"*.`;

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: message,
  });
}
