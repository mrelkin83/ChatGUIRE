import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db, payments, orders, customers } from '@saas/db';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { channelManager } from '../channels/core/channel-manager';

function verifyWompiSignature(request: FastifyRequest): boolean {
  const signature = request.headers['x-wompi-signature'] as string;
  const rawBody = (request as any).rawBody;

  if (!signature || !rawBody) {
    logger.warn('Missing Wompi webhook signature or raw body');
    return false;
  }

  const privateKey = process.env.WOMPI_SANDBOX_PRIVATE_KEY;
  if (!privateKey) {
    logger.warn('WOMPI_SANDBOX_PRIVATE_KEY not configured');
    return false;
  }

  const expected = crypto.createHmac('sha256', privateKey).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function wompiWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.NODE_ENV !== 'test' && !verifyWompiSignature(request)) {
    return reply.status(401).send({ error: 'Invalid signature' });
  }

  const payload = request.body as any;
  const { data } = payload;
  const transaction = data.transaction;

  logger.info(`Received Wompi webhook for transaction ${transaction.id}: ${transaction.status}`);

  const orderId = transaction.payment_link_sku;

  // Idempotency: check current payment status before processing
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.externalId, transaction.payment_link_id))
    .limit(1);

  if (existingPayment?.status === 'approved' && transaction.status === 'APPROVED') {
    logger.info(`Wompi webhook: payment ${transaction.payment_link_id} already approved, skipping.`);
    return reply.status(200).send({ status: 'already_processed' });
  }

  if (transaction.status === 'APPROVED') {
    await db.update(payments)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(payments.externalId, transaction.payment_link_id));

    const [order] = await db.update(orders)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (order) {
      try {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);

        if (customer?.phone) {
          const instanceName = `tenant_${order.tenantId}`;
          await channelManager.sendMessage(order.tenantId, 'whatsapp', instanceName, customer.phone, {
            type: 'text',
            text: `✅ *¡Pago Recibido!*\n\nTu pedido #${order.orderNumber} ha sido confirmado. Pronto recibirás información sobre el envío.\n\nGracias por tu compra.`,
          });
        }

        logger.info(`Order #${order.orderNumber} marked as PAID and customer notified.`);
      } catch (err: any) {
        logger.error(`Failed to notify customer for order #${order.orderNumber}: ${err.message}`);
      }
    }
  } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
    await db.update(payments)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(eq(payments.externalId, transaction.payment_link_id));

    // Notify customer to retry
    if (orderId) {
      try {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (order) {
          const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
          if (customer?.phone) {
            await channelManager.sendMessage(order.tenantId, 'whatsapp', `tenant_${order.tenantId}`, customer.phone, {
              type: 'text',
              text: `❌ Tu pago para el pedido #${order.orderNumber} fue rechazado. Puedes intentarlo de nuevo respondiendo "quiero pagar".`,
            });
          }
        }
      } catch (err: any) {
        logger.error(`Failed to notify customer of declined payment: ${err.message}`);
      }
    }

    logger.warn(`Payment declined/error for transaction ${transaction.id}`);
  }

  return reply.status(200).send({ status: 'received' });
}
