import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  processCrearCita: vi.fn(),
  processCancelarCita: vi.fn(),
  processReagendarCita: vi.fn(),
  processVerCitas: vi.fn(),
  processVerSlots: vi.fn(),
  processVerCatalogo: vi.fn(),
  processAgregarCarrito: vi.fn(),
  processVerCarrito: vi.fn(),
  processCrearPedido: vi.fn(),
  processVerEstadoPedido: vi.fn(),
  processEnviarPago: vi.fn(),
  processCotizar: vi.fn(),
  processScalamiento: vi.fn(),
}));

vi.mock('./processors/crear-cita.processor', () => ({ processCrearCita: mocks.processCrearCita }));
vi.mock('./processors/cancelar-cita.processor', () => ({ processCancelarCita: mocks.processCancelarCita }));
vi.mock('./processors/reagendar-cita.processor', () => ({ processReagendarCita: mocks.processReagendarCita }));
vi.mock('./processors/ver-citas.processor', () => ({ processVerCitas: mocks.processVerCitas }));
vi.mock('./processors/ver-slots.processor', () => ({ processVerSlots: mocks.processVerSlots }));
vi.mock('./processors/ver-catalogo.processor', () => ({ processVerCatalogo: mocks.processVerCatalogo }));
vi.mock('./processors/agregar-carrito.processor', () => ({ processAgregarCarrito: mocks.processAgregarCarrito }));
vi.mock('./processors/ver-carrito.processor', () => ({ processVerCarrito: mocks.processVerCarrito }));
vi.mock('./processors/crear-pedido.processor', () => ({ processCrearPedido: mocks.processCrearPedido }));
vi.mock('./processors/ver-estado-pedido.processor', () => ({ processVerEstadoPedido: mocks.processVerEstadoPedido }));
vi.mock('./processors/enviar-pago.processor', () => ({ processEnviarPago: mocks.processEnviarPago }));
vi.mock('./processors/cotizar.processor', () => ({ processCotizar: mocks.processCotizar }));
vi.mock('./processors/scalamiento.processor', () => ({ processScalamiento: mocks.processScalamiento }));

import { executeAIAction } from './ai.action-router';

const baseParams = {
  tenantId: 'test-tenant',
  channel: 'whatsapp',
  customerId: 'test-customer',
  customerPhone: '+573001234567',
  contextoCliente: {},
  timezone: 'America/Bogota',
  vertical: 'retail_fashion',
  conversationId: 'test-conv',
};

describe('executeAIAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes CREAR_CITA', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'CREAR_CITA' } });
    expect(mocks.processCrearCita).toHaveBeenCalled();
  });

  it('routes VER_CATALOGO', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'VER_CATALOGO' } });
    expect(mocks.processVerCatalogo).toHaveBeenCalled();
  });

  it('routes AGREGAR_CARRITO', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'AGREGAR_CARRITO' } });
    expect(mocks.processAgregarCarrito).toHaveBeenCalled();
  });

  it('routes CREAR_PEDIDO', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'CREAR_PEDIDO' } });
    expect(mocks.processCrearPedido).toHaveBeenCalled();
  });

  it('routes ENVIAR_PAGO', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'ENVIAR_PAGO' } });
    expect(mocks.processEnviarPago).toHaveBeenCalled();
  });

  it('routes COTIZAR', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'COTIZAR' } });
    expect(mocks.processCotizar).toHaveBeenCalled();
  });

  it('routes CANCELAR_CITA', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'CANCELAR_CITA' } });
    expect(mocks.processCancelarCita).toHaveBeenCalled();
  });

  it('routes SCALAMIENTO', async () => {
    await executeAIAction({ ...baseParams, accion: { accion: 'SCALAMIENTO' } });
    expect(mocks.processScalamiento).toHaveBeenCalled();
  });

  it('does not throw for unknown actions', async () => {
    await expect(
      executeAIAction({ ...baseParams, accion: { accion: 'UNKNOWN_ACTION' } })
    ).resolves.toBeUndefined();
  });
});
