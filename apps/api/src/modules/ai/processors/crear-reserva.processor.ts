import { ActionProcessorInput } from './crear-cita.processor';
import { db, reservations } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { dateHelpers } from '@saas/shared';
import { logger } from '../../../lib/logger';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(timezone);

export async function processCrearReserva(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerId, customerPhone, channel, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing CREAR_RESERVA for tenant ${tenantId}`);

  const { fecha, hora, personas, recurso } = accion as any;

  if (!fecha || !hora) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Para hacer tu reserva necesito la fecha y hora. ¿Cuándo te gustaría?`,
    });
    return;
  }

  const partySize = Number(personas) || 1;

  // Check for existing reservation at same date/time/resource to avoid overlaps
  if (recurso) {
    const [existing] = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(and(
        eq(reservations.tenantId, tenantId),
        eq(reservations.reservedDate, fecha),
        eq(reservations.reservedTime, hora),
        eq(reservations.resourceName, recurso),
        eq(reservations.status, 'confirmed'),
      ))
      .limit(1);

    if (existing) {
      await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
        type: 'text',
        text: `Lo siento, ${recurso ? `"${recurso}"` : 'ese recurso'} ya está reservado para el ${fecha} a las ${hora}. ¿Te gustaría otro horario o recurso disponible?`,
      });
      return;
    }
  }

  await db.insert(reservations).values({
    tenantId,
    customerId,
    reservedDate: fecha,
    reservedTime: hora,
    partySize,
    resourceName: recurso || null,
    status: 'confirmed',
  });

  const fechaNatural = dateHelpers.formatDisplayDateNatural(
    dayjs.tz(`${fecha}T${hora}`, params.timezone).toDate(),
    params.timezone
  );

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ *¡Reserva confirmada!*\n\n📅 ${fechaNatural} a las ${hora.substring(0, 5)}\n👥 ${partySize} persona${partySize > 1 ? 's' : ''}${recurso ? `\n🪑 ${recurso}` : ''}\n\nTe esperamos. Si necesitas cambios escribe *hola*. 👋`,
  });
}
