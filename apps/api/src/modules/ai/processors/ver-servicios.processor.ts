import { ActionProcessorInput } from './crear-cita.processor';
import { db, products } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { channelManager } from '../../channels/core/channel-manager';
import { formatCOP } from '@saas/shared';
import { logger } from '../../../lib/logger';

export async function processVerServicios(params: ActionProcessorInput): Promise<void> {
  const { tenantId, accion, customerPhone, channel } = params;
  const instanceName = `tenant_${tenantId}`;

  logger.info(`Processing VER_SERVICIOS for tenant ${tenantId}`);

  const items = await db
    .select()
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      eq(products.isActive, true),
      eq(products.type, 'service'),
    ))
    .limit(10);

  if (items.length === 0) {
    await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
      type: 'text',
      text: `Lo siento, no tenemos servicios disponibles en este momento.`,
    });
    return;
  }

  const lista = items
    .map(i => `💅 *${i.name}*\n${i.description || ''}\n💰 ${formatCOP(Number(i.price))}${i.durationMinutes ? ` · ${i.durationMinutes} min` : ''}`)
    .join('\n\n');

  await channelManager.sendMessage(tenantId, channel as any, instanceName, customerPhone, {
    type: 'text',
    text: `Estos son nuestros servicios disponibles:\n\n${lista}\n\n¿Te gustaría agendar alguno?`,
  });
}
