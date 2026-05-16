export const VERTICALS = ['retail_fashion', 'retail_tech', 'health'] as const;
export type VerticalType = (typeof VERTICALS)[number];

export const CHANNELS = ['whatsapp', 'instagram', 'facebook', 'tiktok'] as const;
export type ChannelType = (typeof CHANNELS)[number];

export const AI_ACTIONS = [
  'VER_CATALOGO',
  'AGREGAR_CARRITO',
  'CREAR_PEDIDO',
  'ENVIAR_PAGO',
  'COTIZAR',
  'VER_SERVICIOS',
  'VER_SLOTS',
  'CREAR_CITA',
  'CANCELAR_CITA',
  'REAGENDAR_CITA',
  'VER_CARRITO',
  'VER_ESTADO_PEDIDO',
  'VER_CITAS',
  'SCALAMIENTO',
  'CREAR_RESERVA',
] as const;
export type AIActionType = (typeof AI_ACTIONS)[number];
