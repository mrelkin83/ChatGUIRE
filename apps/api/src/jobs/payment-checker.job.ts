import { db, payments, orders } from '@saas/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

const EXPIRY_HOURS = Number(process.env.PAYMENT_EXPIRY_HOURS) || 2;

export async function expireStalePayments(): Promise<void> {
  logger.info('Running payment expiry checker job');

  try {
    const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

    const stale = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, 'pending'),
          lte(payments.createdAt, cutoff),
        ),
      );

    logger.info(`Found ${stale.length} stale payments to expire`);

    for (const payment of stale) {
      try {
        await db
          .update(payments)
          .set({ status: 'voided', updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        // Mark the associated order as cancelled if it is still pending
        if (payment.orderId) {
          await db
            .update(orders)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(
              and(
                eq(orders.id, payment.orderId),
                eq(orders.status, 'pending'),
              ),
            );
        }

        logger.info(`Voided payment ${payment.id}`);
      } catch (err: any) {
        logger.error(`Failed to void payment ${payment.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.error(`Payment checker job error: ${err.message}`);
  }
}
