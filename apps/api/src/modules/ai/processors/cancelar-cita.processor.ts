import { ActionProcessorInput } from './crear-cita.processor';
import { db, appointments } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { logger } from '../../../lib/logger';

export async function processCancelarCita(params: ActionProcessorInput): Promise<void> {
  const { tenantId, customerPhone, channel, accion } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing CANCELAR_CITA for tenant ${tenantId}`);

  let appointmentId = accion.citaId;

  if (!appointmentId) {
    const [lastApp] = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.customerId, params.customerId),
        eq(appointments.status, 'scheduled')
      ))
      .orderBy(appointments.scheduledAt)
      .limit(1);
    
    appointmentId = lastApp?.id;
  }

  if (!appointmentId) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `No encontré citas programadas para cancelar.`,
    });
    return;
  }

  await db.update(appointments)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `✅ Tu cita ha sido cancelada exitosamente. Si deseas agendar una nueva, solo dímelo.`,
  });
}
