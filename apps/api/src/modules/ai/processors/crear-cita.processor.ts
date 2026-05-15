import { AIAction, dateHelpers } from '@saas/shared';
import { db, appointments, products } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../lib/logger';
import { channelManager } from '../../channels/core/channel-manager';

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

  // 2. Validate availability (Simplified for now - just create the appointment)
  // In a real system, we'd check against other appointments and opening hours.
  
  const scheduledAt = new Date(`${accion.fecha}T${accion.horaInicio}`);

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
