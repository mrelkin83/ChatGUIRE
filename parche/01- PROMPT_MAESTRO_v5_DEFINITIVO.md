# PROMPT MAESTRO v5 — PLATAFORMA OMNICANAL SaaS
# Construcción DESDE CERO con patrones probados en producción
# Evolution API + Instagram + Facebook + TikTok

> **Destino:** Gemini, Opencode, Claude Code (VS Code,Antigravity Windows nativo)
> **Versión:** 5.0
> **Fecha:** 2026-05-06
> **Estado:** No existe código previo. Se construye todo desde cero.

---

## INSTRUCCIÓN PRINCIPAL

Actúa como **Arquitecto Principal + Ingeniero Full-Stack Senior**. Construye **desde cero** una plataforma SaaS omnicanal multi-tenant para el mercado empresarial colombiano.

**PUNTO DE PARTIDA:** No existe código. No hay base de datos. No hay API. Todo se construye nuevo.

**PATRÓN DE IA ADOPTADO:** Se adopta un patrón probado en producción (documentado en la Sección 6) donde la IA responde con JSON de acciones y el sistema las ejecuta. Este patrón ya funciona en un sistema real de agendamiento colombiano y está validado contra alucinaciones y errores. Adoptamos la arquitectura, no el código.

**REGLA:** No generes stubs ni `// TODO`. Cada archivo funcional y listo para producción.

---

## 1. PRODUCTO

### 1.1 Qué es
Un inbox omnicanal unificado con IA donde cada negocio colombiano:
- Conecta WhatsApp (QR), Instagram (login), Facebook (cookies), TikTok (cookies).
- Todas las conversaciones de todos los canales llegan a un solo dashboard.
- Un agente de IA atiende en español colombiano, entiende el catálogo/servicios del negocio.
- Cierra ventas, agenda citas, y cobra vía Wompi desde cualquier canal.
- $0 por mensaje.

### 1.2 Verticales
| Vertical | Flujo | Acciones IA |
|---|---|---|
| Retail Moda | Catálogo → Carrito → Pago → Domicilio | VER_CATALOGO, AGREGAR_CARRITO, CREAR_PEDIDO, ENVIAR_PAGO |
| Tecnología | Catálogo → Cotización → Pago → Envío | VER_CATALOGO, COTIZAR, CREAR_PEDIDO, ENVIAR_PAGO |
| Salud/Servicios | Consulta → Cita → Confirmación → Recordatorio | VER_SERVICIOS, VER_SLOTS, CREAR_CITA, CANCELAR_CITA, REAGENDAR_CITA |

---

## 2. STACK

```
Runtime:           Node.js 20 LTS + TypeScript 5.x (strict mode)
Framework API:     Fastify 4.x
Framework Web:     Next.js 14 (App Router)
Motor WhatsApp:    Evolution API v2 (Docker container)
Motor Instagram:   instagrapi (Python FastAPI sidecar)
Motor Facebook:    @anbuinfosec/fca-unofficial (Node.js)
Motor TikTok:      Custom scraper (comentarios públicos)
LLM:               OpenAI gpt-4o-mini (default, configurable por tenant)
Base de Datos:     PostgreSQL 16 (pgvector, RLS, JSONB)
Cache/Queue:       Redis 7 + BullMQ
ORM:               Drizzle ORM
Validación:        Zod
Auth:              JWT + RBAC
Testing:           Vitest + Supertest + Playwright
Monorepo:          Turborepo + pnpm workspaces
Containers:        Docker + docker-compose
```

---

## 3. ARQUITECTURA

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             CANALES                                      │
│  WhatsApp ◄══► Evolution API (Docker:8080) ──webhook──►                  │
│  Instagram ◄══► instagrapi Bridge (Docker:8000) ──HTTP──►                │
│  Facebook ◄══► fca-unofficial (MQTT) ──interno──►          Tu API       │
│  TikTok ◄══► Comment Scraper ──polling──►                  (Fastify     │
│                                                             :3001)      │
│  Dashboard ◄── HTTPS ──► Next.js (:3000)                                │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│              CHANNEL ABSTRACTION LAYER                                   │
│  IChannelDriver → MessageNormalizer → ChannelRouter                     │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│              AI ACTION ENGINE (Patrón JSON de acciones)                   │
│                                                                          │
│  1. Construir system prompt dinámico (vertical + tenant + cliente)       │
│  2. Enviar historial + mensaje al LLM                                    │
│  3. Parsear respuesta: ¿JSON de acción o texto?                         │
│  4. Si texto → enviar al cliente por el canal de origen                  │
│  5. Si JSON → ejecutar Action Processor correspondiente:                 │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐              │
│     │ Salud:       │ │ Retail:      │ │ Compartidas:     │              │
│     │ CREAR_CITA   │ │ CREAR_PEDIDO │ │ ESCALAMIENTO     │              │
│     │ CANCELAR_CITA│ │ VER_CATALOGO │ │ ENVIAR_PAGO      │              │
│     │ REAGENDAR    │ │ AGREGAR_     │ │ INFO_NEGOCIO     │              │
│     │ VER_SLOTS    │ │  CARRITO     │ │ VER_ESTADO_PEDIDO│              │
│     │ VER_CITAS    │ │ COTIZAR      │ │                  │              │
│     └──────────────┘ └──────────────┘ └──────────────────┘              │
│  6. El procesador valida, ejecuta, y envía confirmación al cliente      │
│                                                                          │
│  ★ LA IA NUNCA CONFIRMA NI EJECUTA — SOLO RECOLECTA DATOS              │
│  ★ EL SISTEMA VALIDA Y RESPONDE CON EL RESULTADO REAL                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│  Business Logic: Orders, Appointments, Payments (Wompi), Deliveries     │
│  BullMQ: [ig-poller] [tt-scraper] [ai-learn] [reminders] [analytics]    │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│  PostgreSQL 16 (RLS, pgvector, JSONB) │ Redis 7 (cache, queues, state)  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ESTRUCTURA DEL MONOREPO

```
saas-omnichannel/
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.instagram-bridge
│   └── docker-compose.yml
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── schemas/                  # Zod schemas
│   │       │   ├── tenant.schema.ts
│   │       │   ├── customer.schema.ts
│   │       │   ├── product.schema.ts
│   │       │   ├── order.schema.ts
│   │       │   ├── appointment.schema.ts
│   │       │   └── message.schema.ts
│   │       ├── types/
│   │       │   ├── channel.types.ts      # IChannelDriver, NormalizedMessage
│   │       │   ├── ai-actions.types.ts   # Todas las acciones IA tipadas
│   │       │   ├── tenant.types.ts
│   │       │   └── common.types.ts
│   │       ├── constants/
│   │       │   ├── channels.ts           # 'whatsapp'|'instagram'|'facebook'|'tiktok'
│   │       │   ├── verticals.ts          # 'retail_fashion'|'retail_tech'|'health'
│   │       │   └── actions.ts            # Enum de todas las acciones IA
│   │       └── utils/
│   │           ├── format-cop.ts         # $150.000
│   │           ├── date-helpers.ts       # nowInTz, formatDisplayDateNatural, etc.
│   │           ├── phone-utils.ts        # Normalizar +57
│   │           └── validate-cedula.ts
│   └── db/
│       └── src/
│           ├── schema/
│           │   ├── tenants.ts
│           │   ├── users.ts
│           │   ├── customers.ts
│           │   ├── categories.ts
│           │   ├── products.ts
│           │   ├── product-variants.ts
│           │   ├── orders.ts
│           │   ├── order-items.ts
│           │   ├── conversations.ts
│           │   ├── messages.ts
│           │   ├── appointments.ts
│           │   ├── deliveries.ts
│           │   ├── payments.ts
│           │   ├── channel-sessions.ts
│           │   ├── message-templates.ts
│           │   ├── conversation-state.ts  # Historial IA (ventana deslizante)
│           │   ├── tenant-config.ts       # getConfig() key-value por tenant
│           │   ├── ai-knowledge.ts
│           │   ├── ai-unanswered.ts
│           │   └── analytics.ts
│           ├── migrations/
│           └── seed/
│               └── demo-seed.ts           # 3 tenants: moda, tech, salud
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── server.ts
│   │       ├── plugins/
│   │       │   ├── auth.ts
│   │       │   ├── tenant.ts
│   │       │   ├── rate-limit.ts
│   │       │   ├── error-handler.ts
│   │       │   └── swagger.ts
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── tenants/
│   │       │   ├── users/
│   │       │   ├── products/
│   │       │   ├── orders/
│   │       │   ├── appointments/
│   │       │   ├── deliveries/
│   │       │   ├── payments/
│   │       │   │
│   │       │   ├── channels/
│   │       │   │   ├── core/
│   │       │   │   │   ├── channel-driver.interface.ts
│   │       │   │   │   ├── channel-manager.ts
│   │       │   │   │   ├── channel-router.ts
│   │       │   │   │   ├── message-normalizer.ts
│   │       │   │   │   └── rate-limiter.ts
│   │       │   │   ├── drivers/
│   │       │   │   │   ├── whatsapp/
│   │       │   │   │   │   ├── whatsapp.driver.ts
│   │       │   │   │   │   ├── evolution-api.client.ts
│   │       │   │   │   │   └── evolution-api.webhook.ts
│   │       │   │   │   ├── instagram/
│   │       │   │   │   │   ├── instagram.driver.ts
│   │       │   │   │   │   ├── instagram.bridge-client.ts
│   │       │   │   │   │   └── instagram.poller.ts
│   │       │   │   │   ├── facebook/
│   │       │   │   │   │   ├── facebook.driver.ts
│   │       │   │   │   │   ├── facebook.listener.ts
│   │       │   │   │   │   └── facebook.session.ts
│   │       │   │   │   └── tiktok/
│   │       │   │   │       ├── tiktok.driver.ts
│   │       │   │   │       └── tiktok.comment-scraper.ts
│   │       │   │   ├── channels.routes.ts
│   │       │   │   └── channels.service.ts
│   │       │   │
│   │       │   ├── ai/                    # ══ AI ACTION ENGINE ══
│   │       │   │   ├── ai.engine.ts       # Función principal process() — orquesta todo
│   │       │   │   ├── ai.prompt-builder.ts # buildSystemPrompt() por vertical
│   │       │   │   ├── ai.action-parser.ts  # Parsea JSON de la respuesta IA
│   │       │   │   ├── ai.context-builder.ts # getContextoCliente() por vertical
│   │       │   │   ├── processors/          # Un procesador por acción
│   │       │   │   │   ├── crear-cita.processor.ts
│   │       │   │   │   ├── cancelar-cita.processor.ts
│   │       │   │   │   ├── reagendar-cita.processor.ts
│   │       │   │   │   ├── ver-slots.processor.ts
│   │       │   │   │   ├── ver-citas.processor.ts
│   │       │   │   │   ├── ver-catalogo.processor.ts
│   │       │   │   │   ├── agregar-carrito.processor.ts
│   │       │   │   │   ├── crear-pedido.processor.ts
│   │       │   │   │   ├── enviar-pago.processor.ts
│   │       │   │   │   ├── ver-estado-pedido.processor.ts
│   │       │   │   │   ├── escalamiento.processor.ts
│   │       │   │   │   └── info-negocio.processor.ts
│   │       │   │   ├── scheduling/          # Motor de slots (vertical salud)
│   │       │   │   │   └── scheduling.engine.ts
│   │       │   │   ├── knowledge/           # Base de conocimiento
│   │       │   │   │   ├── knowledge-base.service.ts
│   │       │   │   │   └── knowledge-search.ts   # pgvector semántico
│   │       │   │   ├── learning/            # Aprendizaje continuo
│   │       │   │   │   └── ai-learning.service.ts
│   │       │   │   └── ai.test.ts
│   │       │   │
│   │       │   ├── conversations/
│   │       │   │   ├── conversations.routes.ts
│   │       │   │   ├── conversations.service.ts
│   │       │   │   └── conversations.realtime.ts
│   │       │   │
│   │       │   ├── analytics/
│   │       │   └── webhooks/
│   │       │       ├── evolution.webhook.ts
│   │       │       └── wompi.webhook.ts
│   │       │
│   │       ├── jobs/
│   │       │   ├── instagram-poller.job.ts
│   │       │   ├── tiktok-scraper.job.ts
│   │       │   ├── payment-checker.job.ts
│   │       │   ├── ai-learning.job.ts
│   │       │   ├── reminder.job.ts
│   │       │   └── analytics-aggregator.job.ts
│   │       │
│   │       └── lib/
│   │           ├── llm-client.ts            # Adaptador LLM (OpenAI, Groq, MiniMax)
│   │           ├── evolution-api.client.ts
│   │           ├── wompi-client.ts
│   │           ├── redis.ts
│   │           ├── db.ts
│   │           ├── encryption.ts
│   │           ├── tenant-config.ts          # getConfig(tenantId, key, default)
│   │           └── logger.ts
│   │
│   ├── instagram-bridge/
│   │   ├── main.py
│   │   ├── instagram_service.py
│   │   ├── session_manager.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── web/
│       └── src/
│           └── app/
│               └── (dashboard)/
│                   ├── layout.tsx
│                   ├── page.tsx
│                   ├── inbox/               # Inbox omnicanal unificado
│                   ├── orders/
│                   ├── appointments/
│                   ├── catalog/
│                   ├── deliveries/
│                   ├── ai-config/
│                   │   ├── knowledge/
│                   │   ├── training/
│                   │   └── prompts/
│                   ├── channels/            # Conectar WhatsApp/IG/FB/TT
│                   ├── bot-config/
│                   ├── payments/
│                   ├── analytics/
│                   ├── team/
│                   └── settings/
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

---

## 5. EVOLUTION API + DRIVERS (igual que v4)

Evolution API corre como Docker container en puerto 8080. Tu WhatsApp driver llama a su REST API y recibe webhooks. Instagram via sidecar Python (instagrapi). Facebook via fca-unofficial (MQTT). TikTok via scraper de comentarios.

Los endpoints de Evolution API, el webhook handler, el IChannelDriver interface, y las especificaciones de cada driver son **idénticos a la v4** — no se repiten aquí. Refiere a la sección 5 de la v4 para los detalles de Evolution API y la sección 7 para IChannelDriver.

---

## 6. AI ACTION ENGINE — EL CORAZÓN DEL SISTEMA

> Este es el módulo más importante. Se basa en un patrón probado en producción
> en un sistema real colombiano de agendamiento. Se construye desde cero en TypeScript
> pero se adoptan las decisiones arquitectónicas que ya están validadas.

### 6.1 Principio fundamental: "IA recolecta, Sistema ejecuta"

```
CLIENTE: "Quiero una cita de manicure el martes a las 3pm"
                    │
                    ▼
    ┌──────────────────────────────┐
    │ AI Engine recibe mensaje     │
    │ 1. Carga contexto cliente   │
    │ 2. Construye system prompt  │
    │ 3. Envía al LLM con hist.  │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ LLM responde:               │
    │ {"accion":"CREAR_CITA",     │
    │  "servicioNombre":"Manicure",│
    │  "servicioId":"uuid-123",   │
    │  "fecha":"2026-05-12",      │
    │  "horaInicio":"15:00:00"}   │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Action Parser detecta JSON  │
    │ → Rutea a procesador        │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ crear-cita.processor.ts     │
    │ 1. Busca servicio en DB     │
    │ 2. Valida slot disponible   │
    │ 3. Valida no-solapamiento   │
    │ 4. Valida límite de citas   │
    │ 5. Crea cita en DB          │
    │ 6. Envía confirmación:      │
    │    "✅ ¡Tu cita confirmada! │
    │     📅 Martes 12 de mayo    │
    │     🕐 3:00 PM              │
    │     💅 Manicure"            │
    │ 7. Notifica al dueño        │
    └──────────────────────────────┘

    ★ LA IA NUNCA DIJO "Confirmado". EL SISTEMA lo hizo.
    ★ Si el slot no estuviera disponible, LA IA NI SE ENTERA.
      El sistema responde directamente con alternativas.
```

### 6.2 ai.engine.ts — Función principal process()

```typescript
// apps/api/src/modules/ai/ai.engine.ts
//
// Esta es la función principal que orquesta el flujo de IA.
// Se invoca cada vez que llega un mensaje de un cliente desde cualquier canal.
//
// interface AIEngineInput {
//   tenantId: string;
//   channel: ChannelType;          // 'whatsapp' | 'instagram' | 'facebook' | 'tiktok'
//   customerId: string;            // ID del customer en nuestra DB
//   customerPhone: string;         // Teléfono o ID del canal
//   customerName: string | null;
//   message: string;               // Texto del mensaje
//   conversationId: string;
// }
//
// async function process(input: AIEngineInput): Promise<void> {
//
//   // 1. CARGAR ESTADO DE CONVERSACIÓN (ventana deslizante de últimos 10 msgs)
//   const state = await conversationStateService.get(input.tenantId, input.customerId);
//   const historial = state?.historial || [];
//   historial.push({ role: 'user', content: input.message });
//
//   // 2. CARGAR CONTEXTO DEL CLIENTE (según vertical del tenant)
//   const tenant = await tenantService.getById(input.tenantId);
//   const contextoCliente = await contextBuilder.build(input.tenantId, tenant.vertical, input.customerId);
//
//   // 3. CONSTRUIR SYSTEM PROMPT (según vertical + canal)
//   const systemPrompt = await promptBuilder.build({
//     tenantId: input.tenantId,
//     tenantName: tenant.name,
//     vertical: tenant.vertical,
//     channel: input.channel,
//     contextoCliente,
//     timezone: tenant.timezone
//   });
//
//   // 4. LLAMAR AL LLM
//   const respuestaIA = await llmClient.chat({
//     model: tenant.ai_model || 'gpt-4o-mini',
//     systemPrompt,
//     messages: historial,
//     maxTokens: tenant.ai_max_tokens || 500,
//     temperature: Number(tenant.ai_temperature) || 0.7
//   });
//
//   // 5. PARSEAR RESPUESTA: ¿JSON de acción o texto libre?
//   const accion = actionParser.parse(respuestaIA);
//
//   // 6. GUARDAR EN HISTORIAL
//   historial.push({ role: 'assistant', content: respuestaIA });
//   await conversationStateService.upsert(
//     input.tenantId, input.customerId,
//     { historial: historial.slice(-10) }  // Ventana deslizante: últimos 10
//   );
//
//   // 7. SI NO HAY ACCIÓN → responder con texto
//   if (!accion) {
//     const textoLimpio = respuestaIA.replace(/\{[^{}]*"accion"[^{}]*\}/g, '').trim();
//     await sendResponse(input, textoLimpio);
//     return;
//   }
//
//   // 8. SI HAY ACCIÓN → rutear al procesador correspondiente
//   await actionRouter.execute({
//     accion,
//     tenantId: input.tenantId,
//     channel: input.channel,
//     customerId: input.customerId,
//     customerPhone: input.customerPhone,
//     contextoCliente,
//     timezone: tenant.timezone,
//     vertical: tenant.vertical,
//     conversationId: input.conversationId
//   });
// }
```

### 6.3 ai.action-parser.ts

```typescript
// apps/api/src/modules/ai/ai.action-parser.ts
//
// Parsea la respuesta del LLM buscando un JSON de acción.
//
// function parse(respuesta: string): AIAction | null {
//   try {
//     const jsonMatch = respuesta.match(/\{[\s\S]*?"accion"[\s\S]*?\}/);
//     if (!jsonMatch) return null;
//     const parsed = JSON.parse(jsonMatch[0]);
//     if (!parsed.accion) return null;
//     // Validar que la acción sea conocida
//     if (!KNOWN_ACTIONS.includes(parsed.accion)) return null;
//     return parsed as AIAction;
//   } catch {
//     return null;
//   }
// }
//
// const KNOWN_ACTIONS = [
//   // Salud/Servicios
//   'CREAR_CITA', 'CANCELAR_CITA', 'CANCELAR_TODAS', 'REAGENDAR_CITA',
//   'VER_SLOTS', 'VER_CITAS',
//   // Retail/Tech
//   'VER_CATALOGO', 'AGREGAR_CARRITO', 'VER_CARRITO', 'CREAR_PEDIDO',
//   'VER_ESTADO_PEDIDO', 'COTIZAR',
//   // Compartidas
//   'ENVIAR_PAGO', 'ESCALAMIENTO', 'INFO_NEGOCIO'
// ] as const;
```

### 6.4 ai.context-builder.ts — Contexto por vertical

```typescript
// apps/api/src/modules/ai/ai.context-builder.ts
//
// Construye el contexto del cliente según la vertical del tenant.
// Patrón adoptado: como getContextoCliente() del sistema de referencia.
//
// async function build(tenantId: string, vertical: string, customerId: string): Promise<ClientContext> {
//
//   const customer = await customerService.getById(customerId);
//   if (!customer) return { esNuevo: true, nombre: null, datos: {} };
//
//   const base = {
//     esNuevo: false,
//     clienteId: customer.id,
//     nombre: customer.full_name || customer.display_name,
//   };
//
//   switch (vertical) {
//     case 'health': {
//       // Cargar citas activas del cliente
//       const citas = await appointmentService.getActiveByCustomer(tenantId, customer.id);
//       return {
//         ...base,
//         datos: {
//           citas: citas.map(c => ({
//             id: c.id,
//             servicioNombre: c.service_name,
//             fecha: c.scheduled_at,
//             fechaDisplay: dateHelpers.formatDisplayDateNatural(c.scheduled_at),
//             horaInicio: extractTime(c.scheduled_at),
//             horaDisplay: dateHelpers.formatTimeNatural(extractTime(c.scheduled_at)),
//             duracion: c.duration_minutes
//           }))
//         }
//       };
//     }
//     case 'retail_fashion':
//     case 'retail_tech': {
//       // Cargar carrito activo y últimos pedidos
//       const carritoActivo = await cartService.getActive(tenantId, customer.id);
//       const ultimosPedidos = await orderService.getRecent(tenantId, customer.id, 3);
//       return {
//         ...base,
//         datos: {
//           carrito: carritoActivo ? {
//             items: carritoActivo.items.map(i => ({
//               productoNombre: i.product_name,
//               variante: i.variant_info,
//               cantidad: i.quantity,
//               precio: i.unit_price
//             })),
//             total: carritoActivo.total
//           } : null,
//           ultimosPedidos: ultimosPedidos.map(o => ({
//             numero: o.order_number,
//             estado: o.status,
//             total: o.total,
//             fecha: dateHelpers.formatDisplayDateNatural(o.created_at)
//           }))
//         }
//       };
//     }
//     default:
//       return base;
//   }
// }
```

### 6.5 ai.prompt-builder.ts — System prompts por vertical

```typescript
// apps/api/src/modules/ai/ai.prompt-builder.ts
//
// Construye el system prompt dinámico según la vertical.
// Patrón adoptado: como buildSystemPrompt() del sistema de referencia.
//
// Se inyecta:
// - Fecha de hoy y mañana en español natural
// - Info del cliente (nuevo o existente, con su historial relevante)
// - Catálogo de servicios/productos con IDs exactos
// - Prestadores/empleados (si aplica)
// - Reglas críticas que evitan alucinaciones
// - Acciones disponibles con su formato JSON exacto
// - Reglas de comportamiento y estilo conversacional
//
// ═══════════════════════════════════════════════
// PROMPT VERTICAL: SALUD / SERVICIOS
// ═══════════════════════════════════════════════
//
// function buildHealthPrompt(params): string {
//   return `Eres la asistente virtual de "${params.tenantName}".
// Hoy es ${params.hoyDisplay} (${params.hoy}). Mañana es ${params.mananaDisplay} (${params.manana}).
//
// ${params.infoCliente}
//
// SERVICIOS DISPONIBLES (SOLO ESTOS, no inventes otros):
// ${params.listaServicios}
// ${params.infoPrestadores}
//
// REGLAS CRÍTICAS — NUNCA VIOLAR:
// - NUNCA afirmes ni niegues disponibilidad de horarios — el sistema lo verifica
// - NUNCA confirmes una cita — la confirmación la envía el sistema automáticamente
// - NUNCA menciones precios espontáneamente — SOLO si el cliente pregunta explícitamente
// - NUNCA agendes en fechas pasadas
// - NUNCA pidas confirmación al cliente — si tienes todos los datos, ejecuta la acción
// - Si el cliente indica servicio y fecha pero NO hora → ejecuta VER_SLOTS
// - Si vas a ejecutar una acción, responde SOLO el JSON sin texto adicional
// - Si falta información, pregunta en texto normal SIN JSON
// - Tu ÚNICO trabajo es recolectar datos. El SISTEMA valida y confirma.
//
// ACCIONES DISPONIBLES:
// {"accion":"CREAR_CITA","nombre":"...","servicioNombre":"...","servicioId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}
// {"accion":"CANCELAR_CITA","citaId":"..."}
// {"accion":"CANCELAR_TODAS"}
// {"accion":"REAGENDAR_CITA","citaId":"...","fecha":"YYYY-MM-DD","horaInicio":"HH:mm:ss"}
// {"accion":"VER_SLOTS","servicioNombre":"...","servicioId":"...","fecha":"YYYY-MM-DD"}
// {"accion":"VER_CITAS"}
// {"accion":"ESCALAMIENTO","motivo":"..."}
// {"accion":"ENVIAR_PAGO","monto":150000}
//
// ESTILO: Español colombiano, cálido, breve. Emojis moderados. Máx 3-4 líneas.`;
// }
//
// ═══════════════════════════════════════════════
// PROMPT VERTICAL: RETAIL MODA
// ═══════════════════════════════════════════════
//
// function buildRetailFashionPrompt(params): string {
//   return `Eres la asistente virtual de "${params.tenantName}", una tienda de moda colombiana.
// Hoy es ${params.hoyDisplay}.
//
// ${params.infoCliente}
//
// CATÁLOGO DISPONIBLE:
// ${params.listaCatalogo}
//
// CARRITO ACTUAL DEL CLIENTE:
// ${params.infoCarrito}
//
// REGLAS CRÍTICAS:
// - NUNCA inventes productos que no están en el catálogo
// - NUNCA asumas tallas o colores — siempre pregunta
// - NUNCA confirmes un pedido — el sistema lo hace automáticamente
// - Si el cliente pide un producto, muestra opciones de talla y color
// - Los precios se muestran en COP formateado: $150.000
// - Si el cliente quiere pagar, ejecuta ENVIAR_PAGO — el sistema genera el link Wompi
// - Si tienes producto + talla + color + cantidad, ejecuta AGREGAR_CARRITO directo
// - Si el cliente dice "eso es todo" o "quiero pagar", ejecuta CREAR_PEDIDO
//
// ACCIONES DISPONIBLES:
// {"accion":"VER_CATALOGO","categoria":"..."}
// {"accion":"AGREGAR_CARRITO","productoId":"...","varianteId":"...","cantidad":1}
// {"accion":"VER_CARRITO"}
// {"accion":"CREAR_PEDIDO","direccionEnvio":"...","notas":"..."}
// {"accion":"ENVIAR_PAGO","pedidoId":"..."}
// {"accion":"VER_ESTADO_PEDIDO","numeroPedido":"..."}
// {"accion":"ESCALAMIENTO","motivo":"..."}
//
// ESTILO: Español colombiano, amigable, proactiva. Sugiere productos complementarios.`;
// }
//
// ═══════════════════════════════════════════════
// PROMPT VERTICAL: TECNOLOGÍA
// ═══════════════════════════════════════════════
//
// function buildRetailTechPrompt(params): string {
//   // Similar a retail moda pero con specs técnicas, garantías, comparaciones.
//   // Acción adicional: {"accion":"COTIZAR","productos":["id1","id2"]}
//   // para generar cotizaciones formales.
// }
//
// ═══════════════════════════════════════════════
// ADAPTACIÓN POR CANAL (aplicable a todas las verticales)
// ═══════════════════════════════════════════════
//
// Al final de cada prompt, agregar reglas según el canal:
//
// if (channel === 'whatsapp') {
//   prompt += '\nFormato: negritas con *texto*, emojis moderados, máx 4 líneas.';
// } else if (channel === 'instagram') {
//   prompt += '\nFormato: mensajes ultra-cortos, máx 2-3 líneas. Envía imágenes cuando aplique.';
// } else if (channel === 'facebook') {
//   prompt += '\nFormato: mensajes cortos pero puedes ser ligeramente más detallado que en WhatsApp.';
// } else if (channel === 'tiktok') {
//   prompt += '\nFormato: máximo 150 caracteres. Es un comentario público. Si es complejo, dirige a WhatsApp.';
// }
```

### 6.6 Procesadores de acciones (ejemplo: CREAR_CITA)

```typescript
// apps/api/src/modules/ai/processors/crear-cita.processor.ts
//
// Patrón adoptado: procesarCrearCita() del sistema de referencia.
// Cada procesador: valida → ejecuta → responde al cliente → notifica al dueño.
//
// async function execute(params: ActionProcessorInput): Promise<void> {
//   const { tenantId, channel, customerPhone, accion, contextoCliente, timezone } = params;
//
//   // 1. BUSCAR SERVICIO
//   const servicios = await productService.getByTenant(tenantId, { type: 'service' });
//   const servicio = servicios.find(s => s.id === accion.servicioId)
//     || servicios.find(s => s.name.toLowerCase() === accion.servicioNombre?.toLowerCase());
//   if (!servicio) {
//     const lista = servicios.map(s => `💠 ${s.name}`).join('\n');
//     await sendToClient(params, `No encontré ese servicio. ¿Cuál de estos deseas?\n\n${lista}`);
//     return;
//   }
//
//   // 2. VALIDAR PRESTADOR (si el negocio los tiene)
//   // ... (pedir selección si falta)
//
//   // 3. VALIDAR DÍAS MÁXIMO ADELANTO
//   const diasMax = await getConfig(tenantId, 'dias_max_adelanto', 30);
//   // ... (rechazar si excede)
//
//   // 4. VERIFICAR SLOT DISPONIBLE
//   const slots = await schedulingEngine.getAvailableSlots({
//     tenantId, servicioId: servicio.id, fecha: accion.fecha, timezone
//   });
//   const slotDisponible = slots.find(s => s.hora === accion.horaInicio);
//   if (!slotDisponible) {
//     // Enviar alternativas o decir que no hay disponibilidad
//     if (slots.length === 0) {
//       await sendToClient(params, `No hay disponibilidad para esa fecha. 😕\n\n¿Te gustaría elegir otro día?`);
//     } else {
//       const alternativas = slots.map(s => `🕐 ${dateHelpers.formatTimeNatural(s.hora)}`).join('\n');
//       await sendToClient(params, `Ese horario no está disponible. 😕\n\nHorarios disponibles:\n${alternativas}\n\n¿Cuál prefieres?`);
//     }
//     return;
//   }
//
//   // 5. VERIFICAR NO SOLAPAMIENTO
//   // ... (checkSolapamiento)
//
//   // 6. VALIDAR LÍMITE DE CITAS ACTIVAS
//   const maxCitas = await getConfig(tenantId, 'max_citas_activas_por_cliente', 5);
//   const citasActivas = await appointmentService.countActive(tenantId, params.customerId);
//   if (citasActivas >= maxCitas) {
//     await sendToClient(params, `Ya tienes ${maxCitas} citas agendadas 😊 Comunícate directamente con el negocio.`);
//     return;
//   }
//
//   // 7. CREAR CITA EN DB
//   const horaFin = dateHelpers.addMinutesToTime(accion.horaInicio, servicio.duration_minutes);
//   await appointmentService.create({
//     tenantId, customerId: params.customerId, serviceId: servicio.id,
//     scheduledAt: `${accion.fecha}T${accion.horaInicio}`, durationMinutes: servicio.duration_minutes
//   });
//
//   // 8. ENVIAR CONFIRMACIÓN AL CLIENTE
//   await sendToClient(params,
//     `✅ *¡Tu cita está confirmada!*\n\n` +
//     `📅 ${dateHelpers.formatDisplayDateNatural(accion.fecha)}\n` +
//     `🕐 ${dateHelpers.formatTimeNatural(accion.horaInicio)}\n` +
//     `💅 ${servicio.name}\n\n` +
//     `Te esperamos. Si necesitas cambios escribe *hola*. 👋`
//   );
//
//   // 9. NOTIFICAR AL DUEÑO
//   await notificationService.notifyNewAppointment({
//     tenantId, customerName: contextoCliente.nombre,
//     service: servicio.name, date: accion.fecha, time: accion.horaInicio
//   });
// }
//
// // Helper: envía por el canal de origen
// async function sendToClient(params: ActionProcessorInput, message: string): Promise<void> {
//   await channelManager.sendMessage(
//     params.tenantId, params.channel, params.customerPhone,
//     { type: 'text', text: message }
//   );
// }
```

### 6.7 LLM Client (Adaptador multi-proveedor)

```typescript
// apps/api/src/lib/llm-client.ts
//
// Adaptador que soporta múltiples LLMs. El tenant elige cuál usar.
//
// interface LLMChatInput {
//   model: string;         // 'gpt-4o-mini', 'gpt-4o', 'llama-3.1-70b', 'minimax-01'
//   systemPrompt: string;
//   messages: { role: 'user' | 'assistant'; content: string }[];
//   maxTokens?: number;
//   temperature?: number;
// }
//
// async function chat(input: LLMChatInput): Promise<string> {
//   const provider = resolveProvider(input.model);
//   switch (provider) {
//     case 'openai':
//       return callOpenAI(input);
//     case 'groq':
//       return callGroq(input);
//     // Extensible: agregar más proveedores
//   }
// }
//
// Providers:
//   - OpenAI: gpt-4o-mini (default), gpt-4o (premium)
//   - Groq: llama-3.1-70b, mixtral-8x7b (gratis pero rate limited)
//   - Configurable por tenant en tenants.ai_model
```

### 6.8 Tenant Config — getConfig()

```typescript
// apps/api/src/lib/tenant-config.ts
//
// Patrón adoptado: getConfig() del sistema de referencia.
// Permite configuración dinámica por tenant sin tocar código.
//
// Tabla:
// CREATE TABLE tenant_config (
//     id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
//     key       VARCHAR(100) NOT NULL,
//     value     JSONB NOT NULL,
//     UNIQUE(tenant_id, key)
// );
//
// async function getConfig<T>(tenantId: string, key: string, defaultValue: T): Promise<T> {
//   // 1. Check Redis cache first: `config:{tenantId}:{key}`
//   // 2. If miss → query DB
//   // 3. Cache result in Redis with TTL 300s
//   // 4. Return value or defaultValue
// }
//
// Configs por vertical:
// SALUD:
//   - max_citas_activas_por_cliente: 5
//   - dias_max_adelanto: 30
//   - franja_aprobacion_dueno: { activa: false, hora_hasta: "08:00" }
//   - duracion_default_minutos: 30
//   - recordatorio_horas_antes: 24
//
// RETAIL:
//   - max_items_carrito: 20
//   - carrito_expiracion_horas: 24
//   - envio_gratis_desde: 100000  (COP)
//   - costo_envio_default: 10000
//   - impuesto_porcentaje: 19
//
// TODAS:
//   - ai_model: 'gpt-4o-mini'
//   - ai_temperature: 0.7
//   - ai_max_tokens: 500
//   - horario_atencion: { lun: { open: "08:00", close: "18:00" }, ... }
//   - mensaje_fuera_horario: "..."
//   - max_mensajes_por_minuto: 30
```

---

## 7. MODELO DE DATOS

(Se mantiene idéntico al de la v4 — todas las tablas con RLS, pgvector, JSONB.
Se agrega una tabla nueva: `tenant_config` y `conversation_state`.)

```sql
-- Tabla adicional: tenant_config
CREATE TABLE tenant_config (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key       VARCHAR(100) NOT NULL,
    value     JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, key)
);

-- Tabla adicional: conversation_state (historial IA)
CREATE TABLE conversation_state (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    channel     VARCHAR(20) NOT NULL,
    state       VARCHAR(30) DEFAULT 'IA_ACTIVA',
    historial   JSONB DEFAULT '[]',     -- Últimos 10 mensajes [{role, content}]
    metadata    JSONB DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id, channel)
);

-- Tabla adicional: carts (carrito activo para retail)
CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    status      VARCHAR(20) DEFAULT 'active',   -- 'active', 'converted', 'expired'
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    variant_id  UUID REFERENCES product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    variant_info JSONB,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- El resto de tablas (tenants, users, customers, products, product_variants,
-- categories, orders, order_items, appointments, deliveries, payments,
-- channel_sessions, message_templates, conversations, messages,
-- ai_knowledge_entries, ai_unanswered_queries, ai_learning_metrics,
-- analytics_daily) son IDÉNTICAS a la v4.
```

---

## 8. DOCKER COMPOSE

```yaml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: saas_omnichannel
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  evolution-api:
    image: atendai/evolution-api:latest
    ports: ["8080:8080"]
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_GLOBAL_KEY}
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres:postgres@postgres:5432/saas_omnichannel
      - DATABASE_CONNECTION_CLIENT_NAME=evolution
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/1
      - CACHE_REDIS_PREFIX_KEY=evo
      - CACHE_LOCAL_ENABLED=false
      - SERVER_URL=http://evolution-api:8080
      - QRCODE_LIMIT=6
      - WEBHOOK_GLOBAL_URL=${API_BASE_URL}/api/webhooks/evolution
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_UPDATE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      - WEBHOOK_EVENTS_SEND_MESSAGE=true
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }

  instagram-bridge:
    build: ./apps/instagram-bridge
    ports: ["8000:8000"]
    env_file: .env

  api:
    build: { context: ., dockerfile: docker/Dockerfile.api }
    ports: ["3001:3001"]
    env_file: .env
    depends_on: [postgres, redis, evolution-api, instagram-bridge]

  web:
    build: { context: ., dockerfile: docker/Dockerfile.web }
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [api]

volumes:
  pgdata:
```

---

## 9. VARIABLES DE ENTORNO

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_omnichannel
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
WOMPI_SANDBOX_PUBLIC_KEY=pub_test_...
WOMPI_SANDBOX_PRIVATE_KEY=prv_test_...
NODE_ENV=development
API_PORT=3001
WEB_PORT=3000
API_BASE_URL=http://localhost:3001
WEB_BASE_URL=http://localhost:3000
ENCRYPTION_KEY=your-32-byte-encryption-key
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_GLOBAL_KEY=your-evolution-global-api-key
INSTAGRAM_BRIDGE_URL=http://localhost:8000
INSTAGRAM_PROXY_URL=
IG_POLL_INTERVAL_SECONDS=20
FB_RATE_LIMIT_PER_MINUTE=15
TT_POLL_INTERVAL_SECONDS=60
TT_MAX_VIDEOS_TO_MONITOR=5
```

---

## 10. FASES DE IMPLEMENTACIÓN

### FASE 1 — Fundación (1-2 días)
1. Monorepo Turborepo + pnpm.
2. `packages/shared`: tipos, Zod schemas, constantes, date-helpers, format-cop.
3. `packages/db`: Drizzle schema completo (TODAS las tablas incluyendo tenant_config, conversation_state, carts).
4. Docker compose: PostgreSQL + Redis + Evolution API.
5. `apps/api`: Fastify bootstrap, plugins (auth JWT/RBAC, tenant resolver, error handler, swagger).
6. RLS policies.
7. Seed: 3 tenants demo (moda "Tienda Rosa", tech "TechStore", salud "Dra. García").
8. `lib/tenant-config.ts`: getConfig() con cache Redis.
9. `lib/logger.ts`: Pino structured.
10. **Checkpoint:** `docker compose up` + `pnpm dev` levantan todo. Seed crea datos.

### FASE 2 — Channel Abstraction Layer (1-2 días)
1. `IChannelDriver` interface + tipos (NormalizedMessage, OutgoingMessage, etc.).
2. `channel-manager.ts`: singleton, gestiona drivers.
3. `message-normalizer.ts`: convierte formatos nativos al unificado.
4. `channel-router.ts`: rutea mensaje normalizado → AI Engine.
5. `rate-limiter.ts`: por canal por tenant.
6. **Checkpoint:** La capa compila y está lista para conectar drivers.

### FASE 3 — WhatsApp via Evolution API (2-3 días)
1. `evolution-api.client.ts`: HTTP client tipado para Evolution.
2. `evolution.webhook.ts`: procesa MESSAGES_UPSERT, CONNECTION_UPDATE, QRCODE_UPDATED.
3. `whatsapp.driver.ts`: implementa IChannelDriver llamando a Evolution REST.
4. `channels.routes.ts`: connect, disconnect, status, send.
5. **Checkpoint:** Crear instancia, vincular QR, recibir y responder mensajes.

### FASE 4 — AI Action Engine (3-4 días) ★ FASE MÁS IMPORTANTE ★
1. `lib/llm-client.ts`: adaptador OpenAI/Groq.
2. `ai.engine.ts`: función process() que orquesta el flujo completo.
3. `ai.action-parser.ts`: parsea JSON de acciones.
4. `ai.context-builder.ts`: contexto por vertical.
5. `ai.prompt-builder.ts`: system prompts por vertical (salud, retail moda, retail tech).
6. `conversation_state` service: historial con ventana deslizante de 10 msgs.
7. Procesadores vertical SALUD: crear-cita, cancelar-cita, reagendar-cita, ver-slots, ver-citas.
8. `scheduling.engine.ts`: motor de slots disponibles.
9. Procesadores vertical RETAIL: ver-catalogo, agregar-carrito, crear-pedido, ver-estado-pedido.
10. Procesadores compartidos: enviar-pago, escalamiento, info-negocio.
11. **Checkpoint:** Enviar mensaje por WhatsApp → IA responde con contexto del negocio → acciones se ejecutan correctamente.

### FASE 5 — Instagram + Facebook + TikTok Drivers (3-4 días)
1. `apps/instagram-bridge/`: FastAPI sidecar completo.
2. `instagram.driver.ts` + poller.
3. `facebook.driver.ts` + MQTT listener.
4. `tiktok.driver.ts` + comment scraper.
5. **Checkpoint:** Los 4 canales reciben y responden mensajes.

### FASE 6 — Pagos Wompi + Domicilios (2 días)
1. `lib/wompi-client.ts`: crear link de pago, consultar transacción.
2. `wompi.webhook.ts`: recibir confirmación de pago.
3. Procesador `enviar-pago.processor.ts`: genera link y lo envía por el canal.
4. CRUD domicilios.
5. **Checkpoint:** Flujo completo pedido → pago → confirmación.

### FASE 7 — Knowledge Base + Aprendizaje (2 días)
1. `knowledge-base.service.ts`: CRUD + búsqueda semántica pgvector.
2. `knowledge-search.ts`: embedding + similarity search.
3. `ai-learning.service.ts` + `ai-learning.job.ts` (job diario).
4. **Checkpoint:** IA consulta KB antes de responder. Preguntas sin respuesta se registran.

### FASE 8 — Dashboard (4-5 días)
1. Next.js 14 + shadcn/ui.
2. Auth + layout.
3. **Inbox omnicanal** (todas las conversaciones, todos los canales).
4. **Página de canales** (QR WhatsApp, login IG/FB/TT).
5. KPIs por canal.
6. CRUD catálogo (formularios dinámicos por vertical con JSONB).
7. Gestión pedidos + citas.
8. Config IA (knowledge base, training, prompts).
9. Analytics.
10. **Checkpoint:** Dashboard completo y funcional.

### FASE 9 — Producción (2 días)
1. Tests (Vitest + Supertest), coverage > 80%.
2. CI/CD (GitHub Actions).
3. Dockerfiles multi-stage.
4. README.md.
5. OpenAPI 3.1.
6. **Checkpoint:** Todo pasa, construye, documentado.

---

## 11. CRITERIOS DE ACEPTACIÓN

### AI Action Engine
- [ ] IA responde texto conversacional cuando falta info.
- [ ] IA responde JSON de acción cuando tiene todos los datos.
- [ ] El sistema (NO la IA) ejecuta la acción y confirma al cliente.
- [ ] La IA NUNCA confirma, NUNCA asume disponibilidad, NUNCA inventa productos.
- [ ] System prompt se construye dinámicamente por vertical + tenant + canal.
- [ ] Historial conversacional con ventana deslizante de 10 mensajes.
- [ ] getConfig() permite override por tenant sin tocar código.

### Vertical Salud
- [ ] CREAR_CITA: valida slot, solapamiento, límite, crea y confirma.
- [ ] VER_SLOTS: muestra horarios disponibles con formato natural.
- [ ] CANCELAR_CITA / REAGENDAR_CITA / VER_CITAS: funcionan correctamente.
- [ ] Scheduling engine calcula slots disponibles.

### Vertical Retail
- [ ] VER_CATALOGO: muestra productos con precio COP formateado.
- [ ] AGREGAR_CARRITO: agrega con variante (talla+color) y mantiene carrito activo.
- [ ] CREAR_PEDIDO: convierte carrito en orden.
- [ ] ENVIAR_PAGO: genera link Wompi y lo envía por el canal.

### Omnicanal
- [ ] WhatsApp via Evolution API: QR, enviar/recibir, typing indicator.
- [ ] Instagram: login, polling DMs, responder.
- [ ] Facebook: login cookies, MQTT, responder.
- [ ] TikTok: scraper comentarios, responder.
- [ ] Inbox unificado en dashboard.

### Infraestructura
- [ ] Multi-tenancy con RLS.
- [ ] RBAC: owner > admin > agent.
- [ ] JSONB dinámico para 3 verticales.
- [ ] Analytics por canal.
- [ ] Tests > 80%.
- [ ] Docker compose levanta todo.
- [ ] 3 tenants demo con seed.

---

## 12. NOTAS PARA CLAUDE CODE, OPENCODE,GEMINI

1. **Construyes desde cero.** No hay código existente. Cada archivo es nuevo.
2. **El patrón "IA recolecta, Sistema ejecuta" es sagrado.** La IA NUNCA ejecuta acciones. Solo responde texto o JSON. El backend parsea, valida, ejecuta, y responde.
3. **Evolution API es un Docker container.** No lo instales como npm. Se comunica vía HTTP REST + webhooks.
4. **TypeScript strict. Nunca `any`.** Usa `unknown` + type guards si es necesario.
5. **Código en inglés. UI/mensajes en español colombiano.**
6. **date-helpers.ts debe manejar timezone** `America/Bogota` con dayjs. Fechas en DB: UTC. Presentación: zona del negocio.
7. **getConfig() con cache Redis.** Permite personalización por tenant sin deploys.
8. **Los procesadores de acciones son independientes.** Cada uno en su archivo. Fácil de agregar nuevas acciones.
9. **Cada procesador envía la respuesta al cliente via channelManager.sendMessage()**, nunca directamente por un canal. Así funciona igual para WhatsApp, Instagram, Facebook y TikTok.
10. **El AI Engine NO sabe por qué canal llegó el mensaje** excepto para adaptar el tono. Toda la lógica de negocio es agnóstica al canal.
