import { ActionProcessorInput } from './crear-cita.processor';
import { db, appointments } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { dateHelpers } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processReagendarCita(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, customerId, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing REAGENDAR_CITA for tenant ${tenantId}`);

  let appointment;
  if (accion.citaId) {
    [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, accion.citaId), eq(appointments.tenantId, tenantId)))
      .limit(1);
  } else {
    [appointment] = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.customerId, customerId),
        eq(appointments.status, 'scheduled')
      ))
      .orderBy(desc(appointments.scheduledAt))
      .limit(1);
  }

  if (!appointment) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: 'No encontré citas programadas para reagendar. ¿Quieres agendar una nueva?',
    });
    return;
  }

  if (!accion.fecha || !accion.horaInicio) {
    const fechaActual = dateHelpers.formatDisplayDateNatural(appointment.scheduledAt, params.timezone);
    const horaActual = dateHelpers.formatTimeNatural(
      `${String(appointment.scheduledAt.getHours()).padStart(2, '0')}:${String(appointment.scheduledAt.getMinutes()).padStart(2, '0')}:00`
    );
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Tu cita actual es el ${fechaActual} a las ${horaActual}.\n\n¿Para qué fecha y hora deseas reagendarla? Por favor dime la fecha y hora.`,
    });
    return;
  }

  const newDate = new Date(`${accion.fecha}T${accion.horaInicio}`);

  await db.update(appointments)
    .set({ scheduledAt: newDate, updatedAt: new Date() })
    .where(eq(appointments.id, appointment.id));

  const nuevaFecha = dateHelpers.formatDisplayDateNatural(newDate, params.timezone);
  const nuevaHora = dateHelpers.formatTimeNatural(accion.horaInicio);

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ *¡Tu cita ha sido reagendada!*\n\n📅 Nueva fecha: ${nuevaFecha}\n🕐 Nueva hora: ${nuevaHora}\n💅 ${appointment.serviceName}\n\nTe esperamos. 👋`,
  });
}
