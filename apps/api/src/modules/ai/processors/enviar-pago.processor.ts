import { ActionProcessorInput } from './crear-cita.processor';
import { db, orders, payments } from '@saas/db';
import { eq, desc } from 'drizzle-orm';
import { wompiClient } from '../../../lib/wompi-client';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processEnviarPago(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing ENVIAR_PAGO for tenant ${tenantId}`);

  // 1. Get order (if pedidoId is provided, else get the latest pending order for this customer)
  let order;
  if (accion.pedidoId) {
    [order] = await db.select().from(orders).where(eq(orders.id, accion.pedidoId)).limit(1);
  } else {
    [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, params.customerId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
  }

  if (!order) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `No encontré un pedido pendiente de pago.`,
    });
    return;
  }

  // 2. Create Wompi payment link
  const amountCents = Math.round(Number(order.total) * 100);
  const paymentLink = await wompiClient.createPaymentLink({
    name: `Pago Pedido #${order.orderNumber}`,
    description: `Pago en ${params.contextoCliente.nombre || 'nuestra tienda'}`,
    amountInCents: amountCents,
    currency: 'COP',
    singleUse: true,
    sku: order.id,
  });

  const url = `https://checkout.wompi.co/l/${paymentLink.id}`;

  // 3. Save payment attempt
  await db.insert(payments).values({
    tenantId,
    orderId: order.id,
    amount: order.total,
    status: 'pending',
    paymentUrl: url,
    externalId: paymentLink.id,
  });

  // 4. Send to client
  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `💳 *Link de Pago Generado*\n\n💰 Total: ${formatCOP(Number(order.total))}\n🔗 Paga aquí: ${url}\n\nEl link es de un solo uso. ¡Gracias por tu compra!`,
  });
}
