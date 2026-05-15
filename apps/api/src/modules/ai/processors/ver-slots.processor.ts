import { ActionProcessorInput } from './crear-cita.processor';
import { getAvailableSlots } from '../scheduling/scheduling.engine';
import { dateHelpers } from '@saas/shared';
import { channelManager } from '../../channels/core/channel-manager';
import { logger } from '../../../lib/logger';

export async function processVerSlots(params: ActionProcessorInput): Promise<void> {
  const { tenantId, accion, customerPhone, channel, timezone } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_SLOTS for tenant ${tenantId}`);

  if (!accion.servicioId) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `¿Para qué servicio deseas ver la disponibilidad?`,
    });
    return;
  }

  const slots = await getAvailableSlots({
    tenantId,
    servicioId: accion.servicioId,
    fecha: accion.fecha,
    timezone
  });

  const disponibles = slots.filter(s => s.disponible);

  if (disponibles.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Lo siento, no hay horarios disponibles para el ${dateHelpers.formatDisplayDateNatural(accion.fecha, timezone)}. 😕 ¿Te gustaría intentar con otro día?`,
    });
    return;
  }

  const lista = disponibles.map(s => `🕐 ${dateHelpers.formatTimeNatural(s.hora)}`).join('\n');
  const fechaDisplay = dateHelpers.formatDisplayDateNatural(accion.fecha, timezone);

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `Estos son los horarios disponibles para el *${fechaDisplay}*:\n\n${lista}\n\n¿Cuál prefieres?`,
  });
}
