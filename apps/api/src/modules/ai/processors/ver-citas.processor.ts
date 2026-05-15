import { ActionProcessorInput } from './crear-cita.processor';
import { db, appointments } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { dateHelpers } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processVerCitas(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, customerId } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_CITAS for tenant ${tenantId}`);

  const upcomingAppointments = await db
    .select()
    .from(appointments)
    .where(and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.customerId, customerId),
      eq(appointments.status, 'scheduled')
    ))
    .orderBy(desc(appointments.scheduledAt))
    .limit(5);

  if (upcomingAppointments.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: 'No tienes citas programadas actualmente. ¿Deseas agendar una?',
    });
    return;
  }

  const lines = upcomingAppointments.map((cita, i) => {
    const fecha = dateHelpers.formatDisplayDateNatural(cita.scheduledAt, params.timezone);
    const hora = dateHelpers.formatTimeNatural(
      `${String(cita.scheduledAt.getHours()).padStart(2, '0')}:${String(cita.scheduledAt.getMinutes()).padStart(2, '0')}:00`
    );
    return `${i + 1}. ${cita.serviceName}\n   📅 ${fecha} a las ${hora}`;
  });

  const message = `📅 *Tus Citas Programadas*\n\n${lines.join('\n\n')}\n\n¿Necesitas cancelar o reagendar alguna?`;

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: message,
  });
}
