import { AIAction } from '@saas/shared';
import { processCrearCita } from './processors/crear-cita.processor';
import { processVerSlots } from './processors/ver-slots.processor';
import { processVerCatalogo } from './processors/ver-catalogo.processor';
import { processAgregarCarrito } from './processors/agregar-carrito.processor';
import { processCrearPedido } from './processors/crear-pedido.processor';
import { processEnviarPago } from './processors/enviar-pago.processor';
import { processCancelarCita } from './processors/cancelar-cita.processor';
import { processCotizar } from './processors/cotizar.processor';
import { processVerCarrito } from './processors/ver-carrito.processor';
import { processVerEstadoPedido } from './processors/ver-estado-pedido.processor';
import { processReagendarCita } from './processors/reagendar-cita.processor';
import { processVerCitas } from './processors/ver-citas.processor';
import { processScalamiento } from './processors/scalamiento.processor';
import { logger } from '../../lib/logger';

export async function executeAIAction(params: any): Promise<void> {
  const { accion } = params;

  switch (accion.accion) {
    case 'CREAR_CITA':
      await processCrearCita(params);
      break;
    
    case 'CANCELAR_CITA':
      await processCancelarCita(params);
      break;

    case 'REAGENDAR_CITA':
      await processReagendarCita(params);
      break;
    
    case 'VER_CITAS':
      await processVerCitas(params);
      break;
    
    case 'VER_SLOTS':
      await processVerSlots(params);
      break;

    case 'VER_CATALOGO':
      await processVerCatalogo(params);
      break;

    case 'AGREGAR_CARRITO':
      await processAgregarCarrito(params);
      break;

    case 'VER_CARRITO':
      await processVerCarrito(params);
      break;

    case 'CREAR_PEDIDO':
      await processCrearPedido(params);
      break;

    case 'VER_ESTADO_PEDIDO':
      await processVerEstadoPedido(params);
      break;
    
    case 'ENVIAR_PAGO':
      await processEnviarPago(params);
      break;

    case 'COTIZAR':
      await processCotizar(params);
      break;

    case 'SCALAMIENTO':
      await processScalamiento(params);
      break;
    
    default:
      logger.warn(`Action processor not implemented for: ${accion.accion}`);
      break;
  }
}
