import { ChannelType, dateHelpers } from '@saas/shared';
import { db, products, categories, tenantConfig } from '@saas/db';
import { eq, and } from 'drizzle-orm';

interface PromptParams {
  tenantId: string;
  tenantName: string;
  channel: ChannelType;
  contextoCliente: any;
  timezone: string;
}

export async function buildSystemPrompt(params: PromptParams): Promise<string> {
  const hoy = dateHelpers.nowInTz(params.timezone);
  const hoyDisplay = dateHelpers.formatDisplayDateNatural(hoy.toDate(), params.timezone);
  const manana = hoy.add(1, 'day');
  const mananaDisplay = dateHelpers.formatDisplayDateNatural(manana.toDate(), params.timezone);

  // Load tenant config to get capabilities and business type
  const configs = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, params.tenantId));
  const configMap: Record<string, any> = {};
  for (const config of configs) {
    configMap[config.key] = config.value;
  }

  const businessType = configMap.business_type?.label || 'negocio colombiano';
  const capabilities: string[] = configMap.business_type?.capabilities || ['catalog', 'payments'];
  const aiConfig = configMap.ai_config || {};
  const agentName = aiConfig.agentName || params.tenantName;
  const tone = aiConfig.tone || 'Semiformal';
  const additionalInstructions = aiConfig.additionalInstructions || '';

  // Build base prompt
  let prompt = `Eres ${agentName}, la asistente virtual de "${params.tenantName}", un ${businessType} colombiano.
Hoy es ${hoyDisplay} (${hoy.format('YYYY-MM-DD')}). Mañana es ${mananaDisplay} (${manana.format('YYYY-MM-DD')}).

${params.contextoCliente.esNuevo ? 'Este es un cliente nuevo.' : `Cliente: ${params.contextoCliente.nombre || 'Cliente frecuente'}`}

REGLAS CRÍTICAS — NUNCA VIOLAR:
- NUNCA inventes productos, servicios o disponibilidad
- NUNCA confirmes una acción — el sistema lo hace automáticamente
- Si vas a ejecutar una acción, responde SOLO el JSON sin texto adicional
- Si falta información, pregunta en texto normal SIN JSON
- Tu ÚNICO trabajo es recolectar datos. El SISTEMA valida y confirma.
`;

  // Add sections based on capabilities

  // CATALOG
  if (capabilities.includes('catalog')) {
    const availableProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, params.tenantId), eq(products.isActive, true)))
      .limit(20);

    const cats = await db.select().from(categories).where(eq(categories.tenantId, params.tenantId));

    if (availableProducts.length > 0) {
      const lista = availableProducts.map(p => {
        const catName = cats.find(c => c.id === p.categoryId)?.name || '';
        let line = `- ${p.name} [ID:${p.id}]`;
        if (p.price) line += ` — $${formatCOP(Number(p.price))}`;
        if (p.hasVariants) line += ' (tiene variantes: pregunta talla/color/tamaño)';
        if (catName) line += ` (${catName})`;
        return line;
      }).join('\n');

      prompt += `\nCATÁLOGO DISPONIBLE (SOLO ESTOS):\n${lista}\n`;
      prompt += `\nACCIONES CATÁLOGO:\n`;
      prompt += `{"accion":"VER_CATALOGO","categoria":"..."}\n`;
    }
  }

  // CART & ORDERS
  if (capabilities.includes('cart_orders')) {
    if (params.contextoCliente.datos?.carrito) {
      const carrito = params.contextoCliente.datos.carrito;
      prompt += `\nCARRITO ACTUAL:\n`;
      if (carrito.items.length > 0) {
        carrito.items.forEach((item: any) => {
          prompt += `- ${item.productoNombre} x${item.cantidad} - $${formatCOP(item.precio)}\n`;
        });
        prompt += `Total: $${formatCOP(carrito.total)}\n`;
      } else {
        prompt += `Vacío\n`;
      }
    }

    prompt += `\nACCIONES PEDIDOS:\n`;
    prompt += `{"accion":"AGREGAR_CARRITO","productoId":"...","cantidad":1}\n`;
    prompt += `{"accion":"VER_CARRITO"}\n`;
    prompt += `{"accion":"CREAR_PEDIDO","direccionEnvio":"...","notas":"..."}\n`;
    prompt += `{"accion":"VER_ESTADO_PEDIDO","numeroPedido":"..."}\n`;
    prompt += `- Si el cliente dice "eso es todo" o "quiero pagar" → ejecuta CREAR_PEDIDO\n`;
    prompt += `- NUNCA asumas talla/color/tamaño — siempre pregunta si el producto tiene variantes\n`;
  }

  // APPOINTMENTS
  if (capabilities.includes('appointments')) {
    const servicios = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, params.tenantId),
          eq(products.type, 'service'),
          eq(products.isActive, true)
        )
      );

    if (servicios.length > 0) {
      const listaServicios = servicios.map(s =>
        `- ${s.name} [ID:${s.id}]` + (s.price ? ` — desde $${formatCOP(Number(s.price))}` : '')
      ).join('\n');

      prompt += `\nSERVICIOS DISPONIBLES (SOLO ESTOS):\n${listaServicios}\n`;
    }

    if (params.contextoCliente.datos?.citas?.length > 0) {
      prompt += `\nCITAS ACTIVAS DEL CLIENTE:\n`;
      params.contextoCliente.datos.citas.forEach((cita: any) => {
        prompt += `- ${cita.servicioNombre} el ${cita.fechaDisplay} a las ${cita.horaDisplay}\n`;
      });
    }

    prompt += `\nACCIONES CITAS:\n`;
    prompt += `{"accion":"CREAR_CITA","servicioNombre":"...","servicioId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}\n`;
    prompt += `{"accion":"CANCELAR_CITA","citaId":"..."}\n`;
    prompt += `{"accion":"REAGENDAR_CITA","citaId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}\n`;
    prompt += `{"accion":"VER_SLOTS","servicioNombre":"...","servicioId":"...","fecha":"YYYY-MM-DD"}\n`;
    prompt += `{"accion":"VER_CITAS"}\n`;
    prompt += `- NUNCA afirmes ni niegues disponibilidad — el sistema lo verifica\n`;
    prompt += `- Si el cliente da servicio y fecha sin hora → ejecuta VER_SLOTS\n`;
  }

  // RESERVATIONS
  if (capabilities.includes('reservations')) {
    prompt += `\nACCIONES RESERVAS:\n`;
    prompt += `{"accion":"CREAR_RESERVA","fecha":"YYYY-MM-DD","hora":"HH:mm","personas":2,"notas":"..."}\n`;
    prompt += `{"accion":"CANCELAR_RESERVA","reservaId":"..."}\n`;
    prompt += `{"accion":"VER_RESERVAS"}\n`;
  }

  // QUOTES
  if (capabilities.includes('quotes')) {
    prompt += `\nACCIONES COTIZACIONES:\n`;
    prompt += `{"accion":"COTIZAR","items":[{"productoId":"...","cantidad":1}],"notas":"..."}\n`;
    prompt += `{"accion":"VER_COTIZACION","cotizacionId":"..."}\n`;
    prompt += `- Si el cliente pide precio de algo complejo o personalizado → ejecuta COTIZAR\n`;
  }

  // PAYMENTS
  if (capabilities.includes('payments')) {
    prompt += `\nACCIONES PAGOS:\n`;
    prompt += `{"accion":"ENVIAR_PAGO","monto":150000}\n`;
  }

  // Always available actions
  prompt += `\nACCIONES GENERALES:\n`;
  prompt += `{"accion":"ESCALAMIENTO","motivo":"..."}\n`;
  prompt += `{"accion":"INFO_NEGOCIO"}\n`;

  // Add additional instructions if any
  if (additionalInstructions) {
    prompt += `\nINSTRUCCIONES ADICIONALES:\n${additionalInstructions}\n`;
  }

  // Channel adaptation
  if (params.channel === 'whatsapp') {
    prompt += `\nFormato: negritas con *texto*, emojis moderados, máx 4 líneas.`;
  } else if (params.channel === 'instagram') {
    prompt += `\nFormato: mensajes ultra-cortos, máx 2-3 líneas. Envía imágenes cuando aplique.`;
  } else if (params.channel === 'facebook') {
    prompt += `\nFormato: mensajes cortos pero puedes ser ligeramente más detallado que en WhatsApp.`;
  } else if (params.channel === 'tiktok') {
    prompt += `\nFormato: máximo 150 caracteres. Es un comentario público. Si es complejo, dirige a WhatsApp.`;
  }

  // Tone adaptation
  switch (tone) {
    case 'Formal':
      prompt += `\nTono: Formal. Use "usted". Tratamiento respetuoso y profesional.`;
      break;
    case 'Semiformal':
      prompt += `\nTono: Semiformal. Puede usar "tú" o "usted". Amable pero profesional.`;
      break;
    case 'Casual':
      prompt += `\nTono: Casual. Usa "tú". Relajado y amigable.`;
      break;
  }

  return prompt;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
