import { db, appointments, customers, tenants } from '@saas/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { redis } from '../lib/redis';
import { channelManager } from '../modules/channels/core/channel-manager';
import { logger } from '../lib/logger';

export async function sendAppointmentReminders(): Promise<void> {
  logger.info('Running appointment reminder job');

  try {
    const now = new Date();
    // Window: appointments between 23h and 25h from now
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.scheduledAt, windowStart),
          lte(appointments.scheduledAt, windowEnd),
          eq(appointments.status, 'scheduled')
        )
      );

    logger.info(`Found ${upcoming.length} appointments for reminder`);

    for (const appt of upcoming) {
      // Idempotency: skip if reminder already sent
      const reminderKey = `reminder:sent:${appt.id}`;
      const alreadySent = await redis.get(reminderKey);
      if (alreadySent) continue;

      try {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, appt.customerId))
          .limit(1);

        if (!customer?.phone) continue;

        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, appt.tenantId))
          .limit(1);

        const scheduledDate = new Date(appt.scheduledAt);
        const dateStr = scheduledDate.toLocaleDateString('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long',
          timeZone: tenant?.timezone || 'America/Bogota',
        });
        const timeStr = scheduledDate.toLocaleTimeString('es-CO', {
          hour: '2-digit', minute: '2-digit',
          timeZone: tenant?.timezone || 'America/Bogota',
        });

        const text = `🔔 *Recordatorio de cita*\n\nHola ${customer.fullName || customer.displayName || ''}! Te recordamos que tienes una cita mañana:\n\n📋 *${appt.serviceName}*\n📅 ${dateStr}\n🕐 ${timeStr}\n\nSi necesitas cancelar o reagendar, escríbenos. ¡Te esperamos!`;

        const instanceName = `tenant_${appt.tenantId}`;
        await channelManager.sendMessage(appt.tenantId, 'whatsapp', instanceName, customer.phone, {
          type: 'text',
          text,
        });

        // Mark as sent for 30h to avoid duplicates
        await redis.setex(reminderKey, 30 * 60 * 60, '1');
        logger.info(`Reminder sent for appointment ${appt.id}`);
      } catch (err: any) {
        logger.error(`Failed to send reminder for appointment ${appt.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.error(`Reminder job error: ${err.message}`);
  }
}
