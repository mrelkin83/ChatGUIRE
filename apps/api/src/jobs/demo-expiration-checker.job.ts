import { db, tenants } from '@saas/db';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function expireDemoTenants(): Promise<void> {
  logger.info('Running demo expiration checker job');

  try {
    const now = new Date();

    const expired = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.isDemo, true),
          eq(tenants.isActive, true),
          isNotNull(tenants.demoExpiresAt),
          lte(tenants.demoExpiresAt, now),
        ),
      );

    logger.info(`Found ${expired.length} expired demo tenants`);

    for (const tenant of expired) {
      try {
        await db
          .update(tenants)
          .set({ isActive: false, suspendedAt: new Date(), updatedAt: new Date() })
          .where(eq(tenants.id, tenant.id));

        logger.info(`Demo tenant ${tenant.id} (${tenant.name}) expired and suspended`);
      } catch (err: any) {
        logger.error(`Failed to suspend demo tenant ${tenant.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.error(`Demo expiration checker error: ${err.message}`);
  }
}
