# PARCHE v5.1 — MODELO DE ACTIVIDADES ECONÓMICAS DINÁMICO
# Reemplaza las 3 verticales fijas por un sistema de capacidades modulares
# APLICA SOBRE: PROMPT_MAESTRO_v5_DEFINITIVO.md

> Este parche corrige la Sección 1.3, modifica el modelo de datos,
> ajusta el AI Action Engine, y actualiza el seed.
> El resto del prompt v5 (canales, Evolution API, dashboard, fases) NO cambia.

---

## CAMBIO 1: Reemplazar Sección 1.3 "Verticales"

**ELIMINAR:**
```
### 1.3 Verticales
| Vertical | Flujo | Acciones IA |
|---|---|---|
| Retail Moda | Catálogo → Carrito → Pago → Domicilio | VER_CATALOGO, AGREGAR_CARRITO... |
| Tecnología | Catálogo → Cotización → Pago → Envío | VER_CATALOGO, COTIZAR... |
| Salud/Servicios | Consulta → Cita → Confirmación | VER_SERVICIOS, VER_SLOTS, CREAR_CITA... |
```

**REEMPLAZAR CON:**

### 1.3 Actividades económicas y capacidades modulares

El sistema NO usa verticales fijas. Cada negocio (tenant) selecciona su **actividad económica** de un catálogo predefinido, y el sistema le activa automáticamente las **capacidades** que aplican. El dueño puede activar o desactivar capacidades desde el dashboard.

**Capacidades del sistema:**

| Capacidad | Qué habilita | Acciones IA | Módulos |
|---|---|---|---|
| `catalog` | Catálogo de productos/servicios con JSONB dinámico | VER_CATALOGO | products, categories, product_variants |
| `cart_orders` | Carrito de compras + pedidos | AGREGAR_CARRITO, VER_CARRITO, CREAR_PEDIDO, VER_ESTADO_PEDIDO | carts, cart_items, orders, order_items |
| `appointments` | Citas, agenda, slots disponibles | VER_SLOTS, CREAR_CITA, CANCELAR_CITA, REAGENDAR_CITA, VER_CITAS | appointments, scheduling engine |
| `delivery` | Domicilios y envíos | — (se activa con cart_orders) | deliveries |
| `payments` | Pagos vía Wompi | ENVIAR_PAGO | payments, wompi integration |
| `quotes` | Cotizaciones formales | COTIZAR, VER_COTIZACION | quotes (tabla nueva) |
| `reservations` | Reservas (mesas, habitaciones, espacios) | CREAR_RESERVA, CANCELAR_RESERVA, VER_RESERVAS | reservations (tabla nueva) |

**Catálogo de actividades económicas con capacidades predeterminadas:**

```typescript
// packages/shared/src/constants/business-types.ts

export const BUSINESS_TYPES = {
  // ─── Comercio ───
  ferreteria_construccion:    { label: 'Ferretería y construcción',    icon: '🔧', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  papeleria_libros:           { label: 'Papelería y libros',           icon: '📝', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  licoreria:                  { label: 'Licorería',                    icon: '🍷', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  ropa_calzado:               { label: 'Ropa y calzado',              icon: '👗', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  articulos_belleza:          { label: 'Artículos de belleza',         icon: '💄', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  tienda_barrio:              { label: 'Tienda de barrio',             icon: '🏪', capabilities: ['catalog', 'cart_orders', 'delivery'] },
  minimercado:                { label: 'Minimercado',                  icon: '🛒', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  electronica_informatica:    { label: 'Electrónica e informática',    icon: '💻', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'quotes'] },
  articulos_hogar:            { label: 'Artículos para el hogar',      icon: '🏠', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  articulos_deportivos:       { label: 'Artículos deportivos',         icon: '⚽', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  tienda_mascotas_vet:        { label: 'Tienda de mascotas o vet',     icon: '🐾', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'appointments'] },
  farmacia_drogueria:         { label: 'Farmacia y droguería',         icon: '💊', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  tienda_naturista:           { label: 'Tienda naturista / suplementos', icon: '🌿', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  carniceria:                 { label: 'Carnicería',                   icon: '🥩', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  salsamentaria:              { label: 'Salsamentaria',                icon: '🧀', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  accesorios_bisuteria:       { label: 'Accesorios y bisutería',       icon: '💍', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  tienda_regalos:             { label: 'Tienda de regalos',            icon: '🎁', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },
  distribuidora_mayorista:    { label: 'Distribuidora / Mayorista',    icon: '📦', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'quotes'] },
  insumos_agropecuarios:      { label: 'Insumos agropecuarios',        icon: '🌾', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'quotes'] },
  articulos_automotrices:     { label: 'Artículos automotrices',        icon: '🔩', capabilities: ['catalog', 'cart_orders', 'payments', 'quotes'] },
  venta_automoviles:          { label: 'Venta de automóviles',          icon: '🚗', capabilities: ['catalog', 'quotes', 'appointments', 'payments'] },

  // ─── Gastronomía ───
  restaurante_comida_rapida:  { label: 'Restaurante o comida rápida',  icon: '🍔', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'reservations'] },
  cafeteria:                  { label: 'Cafetería',                    icon: '☕', capabilities: ['catalog', 'cart_orders', 'payments'] },
  bar:                        { label: 'Bar',                          icon: '🍸', capabilities: ['catalog', 'reservations', 'payments'] },
  panaderia_reposteria:       { label: 'Panadería y repostería',       icon: '🥐', capabilities: ['catalog', 'cart_orders', 'payments', 'delivery'] },

  // ─── Servicios con cita ───
  estetica_salud:             { label: 'Estética y salud',             icon: '💆', capabilities: ['catalog', 'appointments', 'payments'] },
  tatuajes_piercings:         { label: 'Tatuajes y piercings',         icon: '🎨', capabilities: ['catalog', 'appointments', 'payments'] },
  reparaciones_mantenimiento: { label: 'Reparaciones y mantenimiento', icon: '🔧', capabilities: ['appointments', 'quotes', 'payments'] },
  taller_automotriz:          { label: 'Taller automotriz',            icon: '🔧', capabilities: ['appointments', 'quotes', 'payments'] },

  // ─── Marketing, educación y financiero ───
  marketing_publicidad:       { label: 'Agencia de marketing y publicidad', icon: '📢', capabilities: ['catalog', 'quotes', 'appointments', 'payments'] },
  servicios_educativos:       { label: 'Servicios educativos / Academia',   icon: '📚', capabilities: ['catalog', 'appointments', 'payments'] },
  prestamos_financiamiento:   { label: 'Préstamos y financiamiento',        icon: '💰', capabilities: ['appointments', 'quotes'] },

  // ─── Hospitalidad y logística ───
  hoteles_turismo:            { label: 'Hoteles y turismo',            icon: '🏨', capabilities: ['catalog', 'reservations', 'payments'] },
  organizacion_eventos:       { label: 'Organización de eventos',      icon: '🎉', capabilities: ['catalog', 'quotes', 'reservations', 'payments'] },
  transporte_logistica:       { label: 'Transporte y logística',       icon: '🚚', capabilities: ['quotes', 'payments'] },

  // ─── Servicios profesionales ───
  abogado_juridico:           { label: 'Abogado / Servicios jurídicos',         icon: '⚖️', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  arquitecto:                 { label: 'Arquitecto / Diseño arquitectónico',    icon: '📐', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  ingeniero_civil:            { label: 'Ingeniero civil / Construcción',        icon: '🏗️', capabilities: ['appointments', 'quotes', 'payments'] },
  ingeniero_sistemas:         { label: 'Ingeniero de sistemas / Desarrollo',    icon: '💻', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  contador_contabilidad:      { label: 'Contador / Contabilidad y auditoría',   icon: '📊', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  consultoria_empresarial:    { label: 'Consultoría empresarial',               icon: '💼', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  medico_general:             { label: 'Médico general',                        icon: '🩺', capabilities: ['catalog', 'appointments', 'payments'] },
  odontologo:                 { label: 'Odontólogo / Clínica dental',          icon: '🦷', capabilities: ['catalog', 'appointments', 'payments'] },
  psicologo:                  { label: 'Psicólogo / Salud mental',             icon: '🧠', capabilities: ['appointments', 'payments'] },
  fisioterapeuta:             { label: 'Fisioterapeuta / Rehabilitación',       icon: '🏥', capabilities: ['catalog', 'appointments', 'payments'] },
  nutricionista:              { label: 'Nutricionista / Dietista',              icon: '🥗', capabilities: ['catalog', 'appointments', 'payments'] },
  veterinario:                { label: 'Veterinario / Clínica veterinaria',     icon: '🐾', capabilities: ['catalog', 'appointments', 'payments', 'cart_orders'] },
  optometra:                  { label: 'Optómetra / Óptica',                   icon: '👓', capabilities: ['catalog', 'appointments', 'payments', 'cart_orders'] },
  laboratorio_clinico:        { label: 'Laboratorio clínico',                   icon: '🔬', capabilities: ['catalog', 'appointments', 'payments'] },
  medicina_alternativa:       { label: 'Medicina alternativa / Terapias',       icon: '🧘', capabilities: ['catalog', 'appointments', 'payments'] },
  agente_inmobiliario:        { label: 'Agente inmobiliario / Bienes raíces',   icon: '🏡', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  agente_seguros:             { label: 'Agente de seguros',                     icon: '🛡️', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  notaria:                    { label: 'Notaría / Servicios notariales',        icon: '📜', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  diseno_grafico:             { label: 'Diseño gráfico / Branding',            icon: '🎨', capabilities: ['catalog', 'quotes', 'payments'] },
  fotografia_video:           { label: 'Fotografía y video',                    icon: '📸', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  coaching_mentoria:          { label: 'Coaching / Mentoría',                   icon: '🎯', capabilities: ['catalog', 'appointments', 'payments'] },
  traductor_interprete:       { label: 'Traductor / Intérprete',               icon: '🌐', capabilities: ['catalog', 'quotes', 'payments'] },
  ingeniero_electrico:        { label: 'Ingeniero eléctrico / Electricista',    icon: '⚡', capabilities: ['appointments', 'quotes', 'payments'] },
  ingeniero_ambiental:        { label: 'Ingeniero ambiental / Consultoría',     icon: '🌱', capabilities: ['appointments', 'quotes', 'payments'] },
  ingeniero_industrial:       { label: 'Ingeniero industrial / Procesos',       icon: '⚙️', capabilities: ['appointments', 'quotes', 'payments'] },
  topografo:                  { label: 'Topógrafo / Agrimensura',              icon: '📏', capabilities: ['appointments', 'quotes', 'payments'] },
  perito_avaluador:           { label: 'Perito / Avaluador',                    icon: '🔍', capabilities: ['appointments', 'quotes', 'payments'] },
  asesoria_tributaria:        { label: 'Asesoría tributaria y fiscal',          icon: '🧾', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  publicidad_community:       { label: 'Community manager / Social media',      icon: '📱', capabilities: ['catalog', 'quotes', 'payments'] },
  academia_idiomas:           { label: 'Academia de idiomas / Clases',          icon: '🗣️', capabilities: ['catalog', 'appointments', 'payments'] },
  tutor_clases_particulares:  { label: 'Tutor / Clases particulares',           icon: '📖', capabilities: ['catalog', 'appointments', 'payments'] },
  cerrajeria:                 { label: 'Cerrajería',                            icon: '🔑', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  fumigacion_plagas:          { label: 'Fumigación / Control de plagas',        icon: '🐛', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  aseo_limpieza:              { label: 'Aseo y limpieza profesional',           icon: '🧹', capabilities: ['catalog', 'appointments', 'quotes', 'payments'] },
  plomeria:                   { label: 'Plomería / Servicios hidráulicos',      icon: '🔧', capabilities: ['appointments', 'quotes', 'payments'] },
  mudanzas_trasteos:          { label: 'Mudanzas y trasteos',                   icon: '📦', capabilities: ['quotes', 'payments'] },

  // ─── Entretenimiento y fitness ───
  gimnasio:                   { label: 'Gimnasio',                     icon: '🏋️', capabilities: ['catalog', 'appointments', 'payments'] },
  entretenimiento_ocio:       { label: 'Entretenimiento y ocio',       icon: '🎮', capabilities: ['catalog', 'reservations', 'payments'] },
  escuela_danza:              { label: 'Escuela de danza / Baile',     icon: '💃', capabilities: ['catalog', 'appointments', 'payments'] },
  escuela_musica:             { label: 'Escuela de música',            icon: '🎵', capabilities: ['catalog', 'appointments', 'payments'] },
  salon_belleza_barberia:     { label: 'Salón de belleza / Barbería',  icon: '💇', capabilities: ['catalog', 'appointments', 'payments'] },
  spa_bienestar:              { label: 'Spa y bienestar',              icon: '🧖', capabilities: ['catalog', 'appointments', 'reservations', 'payments'] },

  // ─── Industria ───
  industria_manufactura:      { label: 'Industria o manufactura',      icon: '🏭', capabilities: ['catalog', 'quotes', 'payments'] },

  // ─── Genérico ───
  otro:                       { label: 'Otro',                         icon: '🏢', capabilities: ['catalog', 'payments'] },

} as const;

export type BusinessType = keyof typeof BUSINESS_TYPES;
export type Capability = 'catalog' | 'cart_orders' | 'appointments' | 'delivery' | 'payments' | 'quotes' | 'reservations';
```

**Ejemplos de cómo funciona:**

| Negocio | Tipo | Capacidades activas | Acciones IA disponibles |
|---|---|---|---|
| Glamour Nails | `estetica_salud` | catalog, appointments, payments | VER_CATALOGO, VER_SLOTS, CREAR_CITA, CANCELAR_CITA, REAGENDAR_CITA, ENVIAR_PAGO |
| Ferretería Don Pedro | `ferreteria_construccion` | catalog, cart_orders, payments, delivery | VER_CATALOGO, AGREGAR_CARRITO, CREAR_PEDIDO, ENVIAR_PAGO |
| Burger House | `restaurante_comida_rapida` | catalog, cart_orders, payments, delivery, reservations | VER_CATALOGO, AGREGAR_CARRITO, CREAR_PEDIDO, ENVIAR_PAGO, CREAR_RESERVA |
| Taller AutoPro | `taller_automotriz` | appointments, quotes, payments | VER_SLOTS, CREAR_CITA, COTIZAR, ENVIAR_PAGO |
| Hotel Caribe | `hoteles_turismo` | catalog, reservations, payments | VER_CATALOGO, CREAR_RESERVA, ENVIAR_PAGO |
| Bufete García Abogados | `abogado_juridico` | catalog, appointments, quotes, payments | VER_CATALOGO, VER_SLOTS, CREAR_CITA, COTIZAR, ENVIAR_PAGO |
| ArquiDiseño SAS | `arquitecto` | catalog, appointments, quotes, payments | VER_CATALOGO, VER_SLOTS, CREAR_CITA, COTIZAR, ENVIAR_PAGO |
| Dra. López Odontología | `odontologo` | catalog, appointments, payments | VER_CATALOGO, VER_SLOTS, CREAR_CITA, ENVIAR_PAGO |

---

## CAMBIO 2: Modificar tabla `tenants`

**ELIMINAR** de la tabla tenants:
```sql
vertical VARCHAR(50) NOT NULL,  -- 'retail_fashion', 'retail_tech', 'health'
```

**REEMPLAZAR CON:**
```sql
business_type       VARCHAR(50) NOT NULL,           -- Key de BUSINESS_TYPES (e.g. 'estetica_salud')
business_type_label VARCHAR(255),                    -- Label legible (e.g. 'Estética y salud')
capabilities        TEXT[] NOT NULL DEFAULT '{}',    -- Capacidades activas: {'catalog','appointments','payments'}
```

**Lógica de creación de tenant:**
```typescript
// Al crear un tenant:
// 1. El dueño selecciona su actividad económica del catálogo visual
// 2. El sistema carga las capabilities predeterminadas de BUSINESS_TYPES[selected]
// 3. Se guardan en tenants.capabilities
// 4. El dueño puede agregar/quitar capabilities desde Settings en el dashboard
// 5. El AI Engine lee tenants.capabilities para saber qué acciones habilitar
```

---

## CAMBIO 3: Ajustar el AI Action Engine

### 3.1 Cambio en ai.engine.ts

El engine ya no hace `switch(tenant.vertical)`. Ahora lee `tenant.capabilities` y habilita solo las acciones correspondientes:

```typescript
// En ai.engine.ts, antes de llamar al LLM:
const tenant = await tenantService.getById(tenantId);
const capabilities = tenant.capabilities; // ['catalog', 'appointments', 'payments']

// Construir system prompt con SOLO las acciones que el tenant tiene habilitadas
const systemPrompt = await promptBuilder.build({
  tenantId,
  tenantName: tenant.name,
  businessType: tenant.business_type,
  businessTypeLabel: tenant.business_type_label,
  capabilities,             // ← NUEVO: determina qué acciones incluir
  channel,
  contextoCliente,
  timezone: tenant.timezone
});
```

### 3.2 Cambio en ai.prompt-builder.ts

Ya no hay un prompt por vertical. Hay UN prompt base que se compone dinámicamente según las capabilities:

```typescript
// apps/api/src/modules/ai/ai.prompt-builder.ts
//
// function build(params): string {
//
//   let prompt = `Eres la asistente virtual de "${params.tenantName}",
// un negocio colombiano de ${params.businessTypeLabel}.
// Hoy es ${params.hoyDisplay} (${params.hoy}).
//
// ${params.infoCliente}
//
// REGLAS CRÍTICAS — NUNCA VIOLAR:
// - NUNCA inventes productos, servicios o disponibilidad
// - NUNCA confirmes una acción — el sistema lo hace automáticamente
// - Si vas a ejecutar una acción, responde SOLO el JSON sin texto adicional
// - Si falta información, pregunta en texto normal SIN JSON
// - Tu ÚNICO trabajo es recolectar datos. El SISTEMA valida y confirma.
// `;
//
//   // ─── Agregar secciones según capabilities ───
//
//   if (params.capabilities.includes('catalog')) {
//     const productos = await productService.getByTenant(params.tenantId);
//     const lista = productos.map(p => {
//       let line = `- ${p.name} [ID:${p.id}]`;
//       if (p.price) line += ` — $${formatCOP(p.price)}`;
//       if (p.has_variants) line += ' (tiene variantes: pregunta talla/color/tamaño)';
//       return line;
//     }).join('\n');
//     prompt += `\nCATÁLOGO DISPONIBLE (SOLO ESTOS):\n${lista}\n`;
//     prompt += `\nACCIONES CATÁLOGO:\n`;
//     prompt += `{"accion":"VER_CATALOGO","categoria":"..."}\n`;
//   }
//
//   if (params.capabilities.includes('cart_orders')) {
//     prompt += `\n${params.infoCarrito}\n`;
//     prompt += `ACCIONES PEDIDOS:\n`;
//     prompt += `{"accion":"AGREGAR_CARRITO","productoId":"...","varianteId":"...","cantidad":1}\n`;
//     prompt += `{"accion":"VER_CARRITO"}\n`;
//     prompt += `{"accion":"CREAR_PEDIDO","direccionEnvio":"...","notas":"..."}\n`;
//     prompt += `{"accion":"VER_ESTADO_PEDIDO","numeroPedido":"..."}\n`;
//     prompt += `- Si el cliente dice "eso es todo" o "quiero pagar" → ejecuta CREAR_PEDIDO\n`;
//     prompt += `- NUNCA asumas talla/color/tamaño — siempre pregunta si el producto tiene variantes\n`;
//   }
//
//   if (params.capabilities.includes('appointments')) {
//     const servicios = await productService.getByTenant(params.tenantId, { type: 'service' });
//     const listaServicios = servicios.map(s =>
//       `- ${s.name} [ID:${s.id}]` + (s.price ? ` — desde $${formatCOP(s.price)}` : '')
//     ).join('\n');
//     prompt += `\nSERVICIOS (SOLO ESTOS):\n${listaServicios}\n`;
//     prompt += `${params.infoPrestadores}\n`;
//     prompt += `ACCIONES CITAS:\n`;
//     prompt += `{"accion":"CREAR_CITA","nombre":"...","servicioId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}\n`;
//     prompt += `{"accion":"CANCELAR_CITA","citaId":"..."}\n`;
//     prompt += `{"accion":"REAGENDAR_CITA","citaId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}\n`;
//     prompt += `{"accion":"VER_SLOTS","servicioId":"...","fecha":"YYYY-MM-DD"}\n`;
//     prompt += `{"accion":"VER_CITAS"}\n`;
//     prompt += `- NUNCA afirmes ni niegues disponibilidad — el sistema lo verifica\n`;
//     prompt += `- Si el cliente da servicio y fecha sin hora → ejecuta VER_SLOTS\n`;
//   }
//
//   if (params.capabilities.includes('reservations')) {
//     prompt += `\nACCIONES RESERVAS:\n`;
//     prompt += `{"accion":"CREAR_RESERVA","fecha":"YYYY-MM-DD","hora":"HH:mm","personas":2,"notas":"..."}\n`;
//     prompt += `{"accion":"CANCELAR_RESERVA","reservaId":"..."}\n`;
//     prompt += `{"accion":"VER_RESERVAS"}\n`;
//   }
//
//   if (params.capabilities.includes('quotes')) {
//     prompt += `\nACCIONES COTIZACIONES:\n`;
//     prompt += `{"accion":"COTIZAR","items":[{"productoId":"...","cantidad":1}],"notas":"..."}\n`;
//     prompt += `{"accion":"VER_COTIZACION","cotizacionId":"..."}\n`;
//     prompt += `- Si el cliente pide precio de algo complejo o personalizado → ejecuta COTIZAR\n`;
//   }
//
//   if (params.capabilities.includes('payments')) {
//     prompt += `\nACCIONES PAGOS:\n`;
//     prompt += `{"accion":"ENVIAR_PAGO","monto":150000}\n`;
//   }
//
//   // Siempre disponibles
//   prompt += `\n{"accion":"ESCALAMIENTO","motivo":"..."}\n`;
//   prompt += `{"accion":"INFO_NEGOCIO"}\n`;
//
//   // Adaptar al canal
//   prompt += buildChannelRules(params.channel);
//
//   return prompt;
// }
```

### 3.3 Cambio en ai.context-builder.ts

Ya no hace `switch(vertical)`. Lee capabilities:

```typescript
// async function build(tenantId, capabilities, customerId): Promise<ClientContext> {
//   const base = { ... };
//
//   if (capabilities.includes('appointments')) {
//     // Cargar citas activas
//   }
//   if (capabilities.includes('cart_orders')) {
//     // Cargar carrito activo + últimos pedidos
//   }
//   if (capabilities.includes('reservations')) {
//     // Cargar reservas activas
//   }
//   if (capabilities.includes('quotes')) {
//     // Cargar cotizaciones pendientes
//   }
//   return context;
// }
```

### 3.4 Cambio en ai.action-parser.ts

El parser ahora valida que la acción esté dentro de las capabilities del tenant:

```typescript
// function parse(respuesta: string, capabilities: Capability[]): AIAction | null {
//   // ... parsear JSON ...
//   // Validar que la acción corresponda a una capability activa:
//   const actionCapabilityMap: Record<string, Capability> = {
//     'VER_CATALOGO': 'catalog',
//     'AGREGAR_CARRITO': 'cart_orders',
//     'VER_CARRITO': 'cart_orders',
//     'CREAR_PEDIDO': 'cart_orders',
//     'VER_ESTADO_PEDIDO': 'cart_orders',
//     'CREAR_CITA': 'appointments',
//     'CANCELAR_CITA': 'appointments',
//     'REAGENDAR_CITA': 'appointments',
//     'VER_SLOTS': 'appointments',
//     'VER_CITAS': 'appointments',
//     'CREAR_RESERVA': 'reservations',
//     'CANCELAR_RESERVA': 'reservations',
//     'VER_RESERVAS': 'reservations',
//     'COTIZAR': 'quotes',
//     'VER_COTIZACION': 'quotes',
//     'ENVIAR_PAGO': 'payments',
//     // ESCALAMIENTO e INFO_NEGOCIO siempre disponibles
//   };
//   const requiredCapability = actionCapabilityMap[parsed.accion];
//   if (requiredCapability && !capabilities.includes(requiredCapability)) {
//     return null; // La IA intentó una acción que el tenant no tiene — ignorar
//   }
//   return parsed;
// }
```

---

## CAMBIO 4: Tablas nuevas (quotes, reservations)

```sql
-- Cotizaciones
CREATE TABLE quotes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    quote_number    VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- 'pending','sent','accepted','rejected','expired'
    items           JSONB NOT NULL,                  -- [{productoId, nombre, cantidad, precioUnitario, subtotal}]
    subtotal        DECIMAL(12,2) NOT NULL,
    discount        DECIMAL(12,2) DEFAULT 0,
    tax             DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL,
    notes           TEXT,
    valid_until     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, quote_number)
);

-- Reservas (mesas, habitaciones, espacios, etc.)
CREATE TABLE reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    status          VARCHAR(20) DEFAULT 'pending',  -- 'pending','confirmed','cancelled','completed','no_show'
    reserved_date   DATE NOT NULL,
    reserved_time   TIME NOT NULL,
    party_size      INTEGER DEFAULT 1,
    resource_type   VARCHAR(50),                    -- 'mesa','habitacion','espacio','sala'
    resource_name   VARCHAR(255),                   -- 'Mesa 5', 'Habitación 301', 'Sala VIP'
    duration_minutes INTEGER,
    notes           TEXT,
    reminder_sent   BOOLEAN DEFAULT false,
    custom_attributes JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
```

---

## CAMBIO 5: Nuevos procesadores de acciones

Agregar a la carpeta `apps/api/src/modules/ai/processors/`:

```
cotizar.processor.ts           # Genera cotización y la envía al cliente
ver-cotizacion.processor.ts    # Muestra una cotización existente
crear-reserva.processor.ts     # Crea reserva (valida disponibilidad)
cancelar-reserva.processor.ts  # Cancela reserva
ver-reservas.processor.ts      # Lista reservas activas del cliente
```

---

## CAMBIO 6: Dashboard — Página de selección de actividad económica

En el onboarding del tenant (registro) y en Settings:

```
/dashboard/settings/business-type
```

Muestra un grid visual con las 40+ actividades (icono + label), el dueño selecciona la suya, el sistema activa las capabilities predeterminadas, y permite togglear capacidades adicionales:

```
┌─────────────────────────────────────────────────┐
│ Tu actividad: Restaurante o comida rápida 🍔    │
│                                                  │
│ Capacidades activas:                             │
│ ✅ Catálogo (menú)                              │
│ ✅ Pedidos y carrito                            │
│ ✅ Pagos Wompi                                  │
│ ✅ Domicilios                                   │
│ ✅ Reservas de mesas                            │
│ ☐  Citas (no aplica)                            │
│ ☐  Cotizaciones (no aplica)                     │
│                                                  │
│ [Guardar cambios]                                │
└─────────────────────────────────────────────────┘
```

---

## CAMBIO 7: Seed actualizado

El seed ahora crea 5 tenants demo que cubren distintas combinaciones de capabilities:

```typescript
// packages/db/src/seed/demo-seed.ts
const demoTenants = [
  {
    name: 'Glamour Nails',
    slug: 'glamour-nails',
    business_type: 'estetica_salud',
    business_type_label: 'Estética y salud',
    capabilities: ['catalog', 'appointments', 'payments'],
    // Seed: 5 servicios (manicure, pedicure, etc.) + 2 prestadoras
  },
  {
    name: 'TechStore Colombia',
    slug: 'techstore',
    business_type: 'electronica_informatica',
    business_type_label: 'Electrónica e informática',
    capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'quotes'],
    // Seed: 10 productos con specs en JSONB
  },
  {
    name: 'Burger House',
    slug: 'burger-house',
    business_type: 'restaurante_comida_rapida',
    business_type_label: 'Restaurante o comida rápida',
    capabilities: ['catalog', 'cart_orders', 'payments', 'delivery', 'reservations'],
    // Seed: menú con combos + mesas para reservas
  },
  {
    name: 'AutoPro Taller',
    slug: 'autopro',
    business_type: 'taller_automotriz',
    business_type_label: 'Taller automotriz',
    capabilities: ['appointments', 'quotes', 'payments'],
    // Seed: servicios mecánicos + cotizaciones de ejemplo
  },
  {
    name: 'Bufete García & Asociados',
    slug: 'bufete-garcia',
    business_type: 'abogado_juridico',
    business_type_label: 'Abogado / Servicios jurídicos',
    capabilities: ['catalog', 'appointments', 'quotes', 'payments'],
    // Seed: servicios (consulta jurídica, derecho laboral, derecho comercial,
    //        trámites notariales, asesoría tributaria) + 3 abogados como prestadores
  },
  {
    name: 'Dra. López Odontología',
    slug: 'dra-lopez',
    business_type: 'odontologo',
    business_type_label: 'Odontólogo / Clínica dental',
    capabilities: ['catalog', 'appointments', 'payments'],
    // Seed: servicios (limpieza, blanqueamiento, ortodoncia, endodoncia,
    //        implantes) + 2 odontólogos como prestadores
  },
  {
    name: 'ArquiDiseño SAS',
    slug: 'arquidiseno',
    business_type: 'arquitecto',
    business_type_label: 'Arquitecto / Diseño arquitectónico',
    capabilities: ['catalog', 'appointments', 'quotes', 'payments'],
    // Seed: servicios (diseño arquitectónico, remodelación, planos,
    //        render 3D, consultoría) + cotizaciones de ejemplo
  },
];
```

---

## RESUMEN DE IMPACTO

| Componente | Cambio | Esfuerzo |
|---|---|---|
| `BUSINESS_TYPES` constante | Nuevo archivo | Bajo |
| Tabla `tenants` | Agregar business_type + capabilities, eliminar vertical | Bajo |
| Tablas `quotes`, `reservations` | Nuevas | Bajo |
| `ai.prompt-builder.ts` | Reescribir: composición por capabilities en vez de switch vertical | Medio |
| `ai.context-builder.ts` | Reescribir: composición por capabilities | Medio |
| `ai.action-parser.ts` | Agregar validación capability | Bajo |
| Procesadores nuevos | 5 archivos nuevos (cotizar, reservas) | Medio |
| Dashboard: selector actividad | Nueva página en settings | Bajo |
| Seed | Actualizar a 5 tenants | Bajo |
| **Todo lo demás** | **NO CAMBIA** | — |
