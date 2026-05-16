import { AIAction, dateHelpers } from '@saas/shared';
import { db, appointments, products } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../lib/logger';
import { channelManager } from '../../channels/core/channel-manager';
import { getAvailableSlots } from '../scheduling/scheduling.engine';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(timezone);

export interface ActionProcessorInput {
  accion: AIAction;
  tenantId: string;
  channel: string;
  customerId: string;
  customerPhone: string;
  contextoCliente: any;
  timezone: string;
  vertical: string;
  conversationId: string;
}

export async function processCrearCita(params: ActionProcessorInput): Promise<void> {
  const { tenantId, accion, customerPhone, channel } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing CREAR_CITA for tenant ${tenantId}`);

  // 1. Find service
  const [service] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.id, accion.servicioId)
      )
    )
    .limit(1);

  if (!service) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Lo siento, no pude encontrar el servicio solicitado. ¿Podrías indicarme de nuevo qué servicio deseas?`,
    });
    return;
  }

  // 2. Validate slot availability
  const slots = await getAvailableSlots({
    tenantId,
    servicioId: service.id,
    fecha: accion.fecha,
    timezone: params.timezone,
  });

  const requestedHora = accion.horaInicio?.substring(0, 5); // HH:mm
  const slotAvailable = slots.some(
    (s) => s.hora.substring(0, 5) === requestedHora && s.disponible
  );

  if (!slotAvailable) {
    const availableList = slots
      .filter((s) => s.disponible)
      .slice(0, 5)
      .map((s) => s.hora.substring(0, 5))
      .join(', ');
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Lo siento, el horario ${requestedHora} no está disponible para el ${accion.fecha}. ${availableList ? `Horarios disponibles: ${availableList}` : 'No hay horarios disponibles ese día.'} ¿Te funciona otro horario?`,
    });
    return;
  }

  const scheduledAt = dayjs.tz(`${accion.fecha}T${accion.horaInicio}`, params.timezone).toDate();

  await db.insert(appointments).values({
    tenantId,
    customerId: params.customerId,
    serviceId: service.id,
    serviceName: service.name,
    scheduledAt,
    durationMinutes: service.durationMinutes || 30,
    status: 'scheduled',
  });

  // 3. Confirm to client
  const fechaNatural = dateHelpers.formatDisplayDateNatural(scheduledAt, params.timezone);
  const horaNatural = dateHelpers.formatTimeNatural(accion.horaInicio);

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ *¡Tu cita está confirmada!*\n\n📅 ${fechaNatural}\n🕐 ${horaNatural}\n💅 ${service.name}\n\nTe esperamos. Si necesitas cambios escribe *hola*. 👋`,
  });
}
