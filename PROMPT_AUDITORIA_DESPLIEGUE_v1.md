# PROMPT MAESTRO DE AUDITORÍA DE DESPLIEGUE v1.0
# Plataforma Omnichannel SaaS — ChatGÜIRE
# Fecha: 2026-05-15
# Estado objetivo: Determinar si el proyecto está listo para producción

> **Instrucción para el Asistente de Código:**
> Actúa como **Auditor Principal de Calidad + Ingeniero de QA Senior**. Tu misión es realizar una auditoría forense del código existente, archivo por archivo, función por función, endpoint por endpoint, para determinar si el sistema está listo para despliegue en producción.
> 
> **REGLA DE ORO:** No asumas que algo funciona porque "debería". Cada línea de código debe ser verificada mediante lectura estática, análisis de flujo de datos, y validación de contratos (entrada/salida).

---

## 1. CONTEXTO DEL PROYECTO

**Arquitectura:** Monorepo Turborepo + pnpm
- `apps/api` — Fastify 4.x + TypeScript (strict) + Drizzle ORM
- `apps/web` — Next.js 14 (App Router) + Tailwind + Framer Motion
- `apps/instagram-bridge` — Python FastAPI (instagrapi)
- `packages/shared` — Zod schemas + tipos + constantes
- `packages/db` — Drizzle schema + migraciones + seed

**Base de datos:** PostgreSQL 16 (pgvector, RLS) + Redis 7 (BullMQ)
**Canales:** WhatsApp (Evolution API + WAHA), Instagram, Facebook, TikTok
**Pagos:** Wompi (sandbox/producción)
**IA:** OpenAI GPT-4o-mini (default) + sistema de acciones JSON

---

## 2. METODOLOGÍA DE AUDITORÍA: ARCHIVO POR ARCHIVO

### 2.1 Protocolo de Inspección por Archivo

Para CADA archivo `.ts`, `.tsx`, `.py`, `.sql`, `.yml`, `.json`:

```
ARCHIVO: [ruta completa]
TIPO: [api | web | db | bridge | config | test]

1. LECTURA ESTÁTICA:
   □ ¿El archivo compila sin errores de TypeScript (strict mode)?
   □ ¿Hay algún `any` implícito o explícito?
   □ ¿Hay imports no utilizados?
   □ ¿Hay variables no utilizadas?
   □ ¿Hay magic strings/numbers sin constantes?
   □ ¿El manejo de errores cubre TODOS los caminos de fallo?

2. CONTRATO DE ENTRADA/SALIDA:
   □ ¿Las funciones validan sus inputs con Zod antes de procesar?
   □ ¿Los endpoints HTTP validan query params, body, y headers?
   □ ¿Los returns tienen tipos explícitos y consistentes?
   □ ¿Hay casos donde una función puede retornar `undefined` sin que el caller lo maneje?

3. FLUJO DE DATOS:
   □ ¿De dónde viene cada dato? ¿Está sanitizado?
   □ ¿Hay SQL injection potencial (aunque use ORM, verificar raw queries)?
   □ ¿Hay race conditions en operaciones async?
   □ ¿Los callbacks/promises tienen manejo de rechazo?

4. SEGURIDAD:
   □ ¿Las claves API están hardcodeadas o usan env vars?
   □ ¿Hay exposición de datos sensibles en logs?
   □ ¿RLS está habilitado en TODAS las tablas tenant-scoped?
   □ ¿Los JWT tienen expiración y refresh adecuados?
   □ ¿El rate limiting funciona por tenant o es global?

5. INTEGRACIÓN EXTERNA:
   □ ¿Cada llamada a API externa (Evolution, WAHA, Wompi, OpenAI) tiene timeout?
   □ ¿Hay retry logic con backoff exponencial?
   □ ¿Qué pasa si la API externa responde 500/timeout?
   □ ¿Los webhooks validan la firma/autenticidad?

6. BASE DE DATOS:
   □ ¿Las migraciones son reversibles?
   □ ¿Los índices existen en campos de búsqueda frecuente?
   □ ¿Las constraints de foreign key están correctas?
   □ ¿Los campos JSONB tienen validación de schema?
   □ ¿Los enums de PostgreSQL mapean correctamente a TypeScript?

7. FRONTEND (si aplica):
   □ ¿Cada botón tiene handler definido y no es `() => {}` vacío?
   □ ¿Cada formulario valida antes de submit?
   □ ¿Los estados de loading/error/empty están implementados?
   □ ¿Las llamadas a API tienen manejo de error (toast/modal)?
   □ ¿Los datos sensibles se muestran enmascarados (keys, tokens)?
   □ ¿El responsive funciona en mobile (< 768px)?
   □ ¿Las animaciones Framer Motion tienen `reduced-motion`?
```

### 2.2 Clasificación de Hallazgos

```
CRÍTICO (Bloqueante para despliegue):
  - Error de compilación
  - SQL injection posible
  - Datos sensibles expuestos
  - RLS desactivado o roto
  - Pérdida de datos posible
  - Loop infinito / memory leak

ALTO (Debe corregirse antes de despliegue):
  - Función sin manejo de errores
  - Race condition
  - Contrato API roto (frontend espera X, backend retorna Y)
  - Botón que no hace nada (handler vacío)
  - Webhook sin validación

MEDIO (Debe corregirse en sprint siguiente):
  - Falta de índices en DB
  - No sanitiza inputs de texto libre
  - Falta rate limiting en endpoint
  - Magic numbers/strings

BAJO (Mejora técnica):
  - Refactor sugerido
  - Falta de tests
  - Documentación incompleta
```

---

## 3. INVENTARIO DE ARCHIVOS CRÍTICOS A AUDITAR

### 3.1 Backend (`apps/api/src/`)

#### Núcleo del Servidor
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 1 | `server.ts` | CRÍTICO | Plugins cargados en orden correcto, error handler global, graceful shutdown |
| 2 | `plugins/auth.ts` | CRÍTICO | JWT verify, RBAC middleware, refresh token logic |
| 3 | `plugins/tenant.ts` | CRÍTICO | Tenant resolver, RLS context injection, subdominio/header |
| 4 | `plugins/rate-limit.ts` | ALTO | Rate limit por tenant (no global), Redis store funciona |
| 5 | `plugins/error-handler.ts` | CRÍTICO | No filtra stack traces en prod, log estructurado con Pino |
| 6 | `plugins/swagger.ts` | MEDIO | Documentación OpenAPI 3.1 refleja endpoints reales |

#### Capa de Canales (Channel Abstraction Layer)
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 7 | `modules/channels/core/channel-driver.interface.ts` | CRÍTICO | IChannelDriver define TODOS los métodos obligatorios |
| 8 | `modules/channels/core/channel-manager.ts` | CRÍTICO | Singleton correcto, gestión de drivers por tenant, no memory leak |
| 9 | `modules/channels/core/channel-router.ts` | CRÍTICO | Rutea mensaje normalizado → AI Engine, no pierde mensajes |
| 10 | `modules/channels/core/message-normalizer.ts` | ALTO | Mapea formatos nativos a NormalizedMessage sin pérdida de datos |
| 11 | `modules/channels/core/rate-limiter.ts` | ALTO | Rate limit por canal por tenant, no bloquea globalmente |

#### Drivers WhatsApp
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 12 | `modules/channels/drivers/whatsapp/whatsapp.driver.ts` | CRÍTICO | Implementa IChannelDriver, llama Evolution API correctamente |
| 13 | `modules/channels/drivers/whatsapp/evolution-api.client.ts` | CRÍTICO | HTTP client tipado, timeouts, retries, manejo de errores Evolution |
| 14 | `modules/channels/drivers/whatsapp/evolution-api.webhook.ts` | CRÍTICO | Parsea MESSAGES_UPSERT, CONNECTION_UPDATE, QRCODE_UPDATED |
| 15 | `modules/channels/drivers/whatsapp/whatsapp-waha.driver.ts` | ALTO | Si existe: implementa IChannelDriver, mapeo endpoints WAHA correcto |
| 16 | `modules/webhooks/waha.webhook.ts` | ALTO | Si existe: parsea eventos WAHA, no colisiona con Evolution |

#### Drivers Instagram / Facebook / TikTok
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 17 | `modules/channels/drivers/instagram/instagram.driver.ts` | ALTO | Implementa IChannelDriver, llama bridge Python |
| 18 | `modules/channels/drivers/instagram/instagram.bridge-client.ts` | ALTO | HTTP client para bridge, timeouts |
| 19 | `modules/channels/drivers/instagram/instagram.poller.ts` | ALTO | BullMQ job, no duplica mensajes, maneja desconexión |
| 20 | `modules/channels/drivers/facebook/facebook.driver.ts` | ALTO | Implementa IChannelDriver, MQTT listener no bloquea event loop |
| 21 | `modules/channels/drivers/facebook/facebook.session.ts` | ALTO | Manejo de cookies/appState, refresh automático |
| 22 | `modules/channels/drivers/tiktok/tiktok.driver.ts` | MEDIO | Implementa IChannelDriver, scraper no viola ToS |
| 23 | `modules/channels/drivers/tiktok/tiktok.comment-scraper.ts` | MEDIO | BullMQ job, rate limiting, no banneo de IP |

#### AI Action Engine (CORAZÓN DEL SISTEMA)
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 24 | `modules/ai/ai.engine.ts` | CRÍTICO | Función process() orquesta flujo completo sin pérdida de mensajes |
| 25 | `modules/ai/ai.prompt-builder.ts` | CRÍTICO | Build system prompt por capabilities (no vertical), no excede tokens |
| 26 | `modules/ai/ai.action-parser.ts` | CRÍTICO | Parsea JSON de acciones, valida contra capabilities, ignora inválidas |
| 27 | `modules/ai/ai.context-builder.ts` | ALTO | Carga contexto por capabilities, no hace N+1 queries |
| 28 | `modules/ai/processors/crear-cita.processor.ts` | CRÍTICO | Valida slot, solapamiento, límite, crea, confirma, notifica |
| 29 | `modules/ai/processors/cancelar-cita.processor.ts` | ALTO | Cancela, verifica ownership, notifica |
| 30 | `modules/ai/processors/reagendar-cita.processor.ts` | ALTO | Reagenda con validaciones idénticas a crear |
| 31 | `modules/ai/processors/ver-slots.processor.ts` | ALTO | Scheduling engine no devuelve slots ocupados |
| 32 | `modules/ai/processors/ver-catalogo.processor.ts` | ALTO | Filtra por tenant, no expone productos inactivos |
| 33 | `modules/ai/processors/agregar-carrito.processor.ts` | ALTO | Maneja variantes (talla/color), valida stock |
| 34 | `modules/ai/processors/crear-pedido.processor.ts` | CRÍTICO | Convierte carrito en orden, calcula totales correctos (impuesto 19%) |
| 35 | `modules/ai/processors/enviar-pago.processor.ts` | CRÍTICO | Genera link Wompi válido, envía por canal, maneja expiración |
| 36 | `modules/ai/processors/escalamiento.processor.ts` | ALTO | Notifica al dueño, marca conversación para humano |
| 37 | `modules/ai/processors/cotizar.processor.ts` | MEDIO | Genera cotización formal, guarda items en JSONB |
| 38 | `modules/ai/processors/crear-reserva.processor.ts` | MEDIO | Valida disponibilidad de recurso (mesa/habitación) |
| 39 | `modules/ai/scheduling/scheduling.engine.ts` | CRÍTICO | Calcula slots disponibles, respeta timezone America/Bogota |
| 40 | `modules/ai/knowledge/knowledge-base.service.ts` | ALTO | CRUD + búsqueda semántica pgvector, embedding al guardar |
| 41 | `modules/ai/knowledge/knowledge-search.ts` | ALTO | Similarity search con umbral mínimo (0.75) |
| 42 | `modules/ai/learning/ai-learning.service.ts` | MEDIO | Procesa preguntas sin respuesta, no genera duplicados |

#### Lógica de Negocio
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 43 | `modules/orders/orders.service.ts` | CRÍTICO | CRUD pedidos, cálculo de totales, impuestos, envío |
| 44 | `modules/appointments/appointments.service.ts` | CRÍTICO | CRUD citas, validación de solapamiento, timezone |
| 45 | `modules/payments/payments.service.ts` | CRÍTICO | Integración Wompi, webhook handler idempotente |
| 46 | `modules/deliveries/deliveries.service.ts` | ALTO | CRUD domicilios, estados de ruta |
| 47 | `modules/conversations/conversations.service.ts` | ALTO | CRUD conversaciones, historial, estado IA/Agente |
| 48 | `modules/conversations/conversations.realtime.ts` | ALTO | WebSocket/SSE para inbox en tiempo real |
| 49 | `modules/products/products.service.ts` | ALTO | CRUD productos/servicios, atributos JSONB validados |
| 50 | `modules/tenants/tenants.service.ts` | CRÍTICO | Crear tenant con capabilities, getConfig con cache Redis |
| 51 | `modules/users/users.service.ts` | CRÍTICO | RBAC, hash de passwords, no expone hashes en responses |

#### Webhooks y Jobs
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 52 | `modules/webhooks/evolution.webhook.ts` | CRÍTICO | Valida firma si aplica, no procesa mensajes duplicados |
| 53 | `modules/webhooks/wompi.webhook.ts` | CRÍTICO | Idempotencia (mismo evento Wompi no procesa 2 veces), actualiza orden |
| 54 | `jobs/instagram-poller.job.ts` | ALTO | No duplica mensajes, maneja rate limits de IG |
| 55 | `jobs/tiktok-scraper.job.ts` | MEDIO | No excede límites de scraping, rota user-agents |
| 56 | `jobs/payment-checker.job.ts` | ALTO | Revisa pagos pendientes, expira los vencidos |
| 57 | `jobs/ai-learning.job.ts` | MEDIO | Procesa unanswered en batch, no sobrecarga LLM |
| 58 | `jobs/reminder.job.ts` | ALTO | Envía recordatorios de citas 24h antes, no duplica |
| 59 | `jobs/analytics-aggregator.job.ts` | MEDIO | Agrega métricas diarias sin bloquear DB |
| 60 | `jobs/campaign-sender.job.ts` | ALTO | Rate limit 30 msg/min, resuelve variables, loguea cada envío |
| 61 | `jobs/demo-expiration-checker.job.ts` | MEDIO | Suspende demos vencidas, envía email de notificación |

#### Librerías Core
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 62 | `lib/llm-client.ts` | CRÍTICO | Adaptador multi-proveedor, fallback si primario falla |
| 63 | `lib/wompi-client.ts` | CRÍTICO | Crea link de pago, consulta transacción, sandbox vs prod |
| 64 | `lib/tenant-config.ts` | CRÍTICO | getConfig() con cache Redis, invalidación de cache |
| 65 | `lib/redis.ts` | ALTO | Conexión Redis, reconnection logic, no bloquea |
| 66 | `lib/db.ts` | ALTO | Pool de conexiones PostgreSQL, migrations aplicadas |
| 67 | `lib/encryption.ts` | CRÍTICO | Cifrado de keys Wompi, algoritmo AES-256-GCM, IV único |
| 68 | `lib/logger.ts` | ALTO | Pino structured, no logea PII sensible, rotación de logs |

### 3.2 Frontend (`apps/web/src/`)

#### Layout y Navegación
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 69 | `app/(dashboard)/layout.tsx` | CRÍTICO | Sidebar, navbar, auth check, tenant resolver |
| 70 | `components/dashboard/sidebar.tsx` | ALTO | Navegación funcional, estado activo, collapse/expand |
| 71 | `components/dashboard/navbar.tsx` | ALTO | Breadcrumb, search, notificaciones, canal status |
| 72 | `components/dashboard/kpi-card.tsx` | ALTO | GlassCard, sparkline, number counter, responsive |

#### Páginas Principales
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 73 | `app/(dashboard)/inbox/page.tsx` | CRÍTICO | Tres columnas funcionan, mensajes se envían/reciben, typing indicator |
| 74 | `app/(dashboard)/channels/page.tsx` | CRÍTICO | Botones "Conectar" llaman API real, QR se muestra, SSE stream funciona |
| 75 | `app/(dashboard)/catalog/page.tsx` | ALTO | CRUD productos, atributos dinámicos JSONB, variantes, drag&drop imágenes |
| 76 | `app/(dashboard)/orders/page.tsx` | ALTO | Lista pedidos, filtros, estados, detalle |
| 77 | `app/(dashboard)/appointments/page.tsx` | ALTO | Calendario/agenda, CRUD citas, slots |
| 78 | `app/(dashboard)/settings/page.tsx` | CRÍTICO | TODAS las secciones del mockup HTML funcionan y guardan en DB |
| 79 | `app/(dashboard)/ai-config/page.tsx` | ALTO | Prompt, modelo, temperatura, KB CRUD funcional, unanswered |
| 80 | `app/(dashboard)/team/page.tsx` | ALTO | CRUD miembros, invitación, RBAC roles |
| 81 | `app/(dashboard)/kanban/page.tsx` | ALTO | Drag&drop columnas, filtros, cards con datos reales |
| 82 | `app/(dashboard)/campaigns/page.tsx` | ALTO | CRUD campañas, modal creación, programación, logs |
| 83 | `app/(dashboard)/campaigns/lists/page.tsx` | ALTO | Importar CSV/Excel, preview, mapeo variables |
| 84 | `app/(dashboard)/groups/page.tsx` | MEDIO | Listar grupos WA, enviar mensaje, crear grupo |
| 85 | `app/(dashboard)/bot-config/page.tsx` | MEDIO | Editor menú, nodos, integración con AI Engine |
| 86 | `app/(dashboard)/analytics/page.tsx` | MEDIO | Charts Recharts, filtros fecha, export CSV |

#### SuperAdmin
| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 87 | `app/(superadmin)/layout.tsx` | ALTO | Auth separada, no accesible para tenant users |
| 88 | `app/(superadmin)/page.tsx` | ALTO | KPIs MRR, tenants, demos, churn |
| 89 | `app/(superadmin)/tenants/page.tsx` | ALTO | Tabla tenants, acciones rápidas, impersonate |
| 90 | `app/(superadmin)/monitor/page.tsx` | ALTO | CPU/RAM/Disco gauges, estado servicios, no crash si servicio caído |

### 3.3 Base de Datos (`packages/db/src/`)

| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 91 | `schema/tenants.ts` | CRÍTICO | business_type + capabilities (array), RLS policy |
| 92 | `schema/users.ts` | CRÍTICO | password_hash, role enum, agent_status, RLS |
| 93 | `schema/customers.ts` | ALTO | phone normalizado +57, RLS |
| 94 | `schema/products.ts` | ALTO | type enum (product/service), attributes JSONB, RLS |
| 95 | `schema/orders.ts` | CRÍTICO | status enum, total calculado, tax, RLS |
| 96 | `schema/appointments.ts` | CRÍTICO | scheduled_at, duration, no solapamiento (constraint o app-level) |
| 97 | `schema/payments.ts` | CRÍTICO | wompi_transaction_id, status enum, idempotency_key |
| 98 | `schema/conversations.ts` | ALTO | status enum, kanban_column_id, department_id, RLS |
| 99 | `schema/messages.ts` | ALTO | type enum, status enum, RLS |
| 100 | `schema/channel-sessions.ts` | CRÍTICO | engine enum (evolution/waha), credentials cifrados, RLS |
| 101 | `schema/tenant-config.ts` | ALTO | key-value JSONB, RLS |
| 102 | `schema/conversation-state.ts` | ALTO | historial JSONB (ventana 10 msgs), state enum, RLS |
| 103 | `schema/ai-knowledge.ts` | ALTO | embedding vector(1536), RLS |
| 104 | `schema/carts.ts` | ALTO | status enum, expires_at, RLS |
| 105 | `schema/quotes.ts` | MEDIO | items JSONB, status enum, RLS |
| 106 | `schema/reservations.ts` | MEDIO | resource_type enum, status enum, RLS |
| 107 | `schema/kanban-columns.ts` | ALTO | color, sort_order, is_final, RLS |
| 108 | `schema/campaigns.ts` | ALTO | messages JSONB, recurrence enum, status enum, RLS |
| 109 | `schema/contact-lists.ts` | ALTO | type enum, filter_criteria JSONB, column_names, RLS |
| 110 | `schema/saas-plans.ts` | ALTO | limits JSONB, features JSONB |
| 111 | `schema/saas-resellers.ts` | MEDIO | commission_pct, referral_code unique |
| 112 | `schema/superadmin-users.ts` | CRÍTICO | role enum, password_hash, NO RLS (tabla global) |
| 113 | `schema/departments.ts` | ALTO | queue_order, auto_assign, business_hours JSONB, RLS |
| 114 | `schema/integrations.ts` | ALTO | provider enum, category enum, config JSONB, is_primary, RLS |
| 115 | `schema/bot-menus.ts` | MEDIO | trigger_type enum, channel enum, RLS |
| 116 | `schema/bot-menu-nodes.ts` | MEDIO | type enum, options JSONB, action enum, RLS |
| 117 | `migrations/` | CRÍTICO | Migraciones aplicadas en orden, sin conflictos, reversibles |
| 118 | `seed/demo-seed.ts` | ALTO | 5+ tenants demo con datos coherentes, no falla en re-run |

### 3.4 Configuración e Infraestructura

| # | Archivo | Prioridad | Qué verificar |
|---|---------|-----------|---------------|
| 119 | `docker-compose.yml` | CRÍTICO | Todos los servicios levantan, healthchecks, depends_on correctos |
| 120 | `docker/Dockerfile.api` | ALTO | Multi-stage, node:20-alpine, no incluye dev deps en prod |
| 121 | `docker/Dockerfile.web` | ALTO | Multi-stage, Next.js standalone output |
| 122 | `docker/Dockerfile.instagram-bridge` | ALTO | Python slim, requirements.txt completo |
| 123 | `.env.example` | ALTO | Todas las variables requeridas documentadas |
| 124 | `turbo.json` | MEDIO | Pipeline correcto, dependencias entre builds |
| 125 | `pnpm-workspace.yaml` | MEDIO | Todos los packages/apps declarados |

---

## 4. MATRIZ DE CASOS DE USO A TESTEAR

### 4.1 Autenticación y Tenant

```
UC-A1: Registro de nuevo tenant
  Frontend: Formulario → POST /api/auth/register
  Backend: Crear tenant + usuario owner + seed inicial
  DB: tenants, users, kanban_columns (default), tenant_config (default)
  Test: ¿Crea tenant con capabilities correctas según business_type?
  Test: ¿Genera kanban columns default?
  Test: ¿El owner puede loguearse inmediatamente?

UC-A2: Login
  Frontend: Email + password → JWT access + refresh
  Backend: Verify password, generar tokens, set cookie
  Test: ¿Token expira en 15m?
  Test: ¿Refresh token funciona después de expirar access?
  Test: ¿Bloquea después de 5 intentos fallidos?

UC-A3: Switch de tenant (si aplica multi-tenant por usuario)
  Test: ¿RLS filtra datos del tenant correcto?
  Test: ¿No puede ver datos de otro tenant cambiando header?

UC-A4: Invitar miembro al equipo
  Frontend: Modal invitación → email → POST /api/users/invite
  Backend: Crear user con role 'agent', enviar email (o mostrar link)
  Test: ¿El invitado recibe email/link?
  Test: ¿Al aceptar, se asigna al tenant correcto?
  Test: ¿RLS le permite ver solo datos de ese tenant?
```

### 4.2 Canales (Conexión)

```
UC-C1: Conectar WhatsApp (Evolution)
  Frontend: Click "Conectar" → POST /api/channels/whatsapp/connect
  Backend: Crear instancia Evolution → obtener QR base64
  Frontend: Modal QR con SSE stream
  Backend Webhook: Recibir CONNECTION_UPDATE → marcar conectado
  Test: ¿QR se genera en < 5 segundos?
  Test: ¿Al escanear, modal cierra y muestra número?
  Test: ¿channel_sessions guarda instanceName + token?
  Test: ¿RLS protege la sesión?

UC-C2: Conectar WhatsApp (WAHA)
  [Si aplica] Igual que C1 pero con WAHA endpoints
  Test: ¿Session se crea en WAHA? ¿Webhook se configura?

UC-C3: Conectar Instagram
  Frontend: Modal username + password → POST /api/channels/instagram/connect
  Backend: Llama bridge Python → crea sesión instagrapi
  Test: ¿Si pide 2FA, frontend muestra campo adicional?
  Test: ¿Bridge responde en < 10 segundos?
  Test: ¿Poller job inicia automáticamente?

UC-C4: Conectar Facebook
  Frontend: Modal textarea appState (cookies)
  Backend: Inicializa fca-unofficial, api.listenMqtt()
  Test: ¿Si appState inválido, muestra error claro?
  Test: ¿Recibe mensajes en tiempo real?

UC-C5: Conectar TikTok
  Frontend: Modal cookies JSON
  Backend: Guarda cookies, inicia scraper job
  Test: ¿Scraper obtiene comentarios de últimos 5 videos?
  Test: ¿No excede rate limits?

UC-C6: Desconectar canal
  Test: ¿Elimina sesión de DB? ¿Limpia cookies/tokens?
  Test: ¿No deja jobs BullMQ huérfanos?
```

### 4.3 AI Action Engine

```
UC-AI1: Mensaje de bienvenida (nuevo cliente)
  Input: "Hola"
  Proceso: AI Engine → prompt builder → LLM → respuesta texto
  Output: "¡Hola! Soy el asistente de [Negocio]. ¿En qué puedo ayudarte?"
  Test: ¿Contexto se carga? ¿Historial vacío manejado?
  Test: ¿Respuesta en español colombiano? ¿Tono correcto?

UC-AI2: Crear cita (vertical salud)
  Input: "Quiero manicure mañana a las 3pm"
  Proceso: Parser detecta CREAR_CITA → valida servicio → valida slot → crea
  Output: "✅ Tu cita confirmada: [fecha] [hora] [servicio]"
  Test: ¿La IA NUNCA confirma antes de que el sistema valide?
  Test: ¿Si slot no disponible, sugiere alternativas?
  Test: ¿Si excede límite de citas activas, rechaza?
  Test: ¿Notifica al dueño?

UC-AI3: Agregar al carrito (vertical retail)
  Input: "Quiero la camiseta roja talla M"
  Proceso: Parser AGREGAR_CARRITO → valida producto + variante → crea item
  Output: "Agregado al carrito: [producto] [variante]"
  Test: ¿Si variante no existe, pregunta opciones?
  Test: ¿Si stock insuficiente, avisa?
  Test: ¿Mantiene carrito activo por 24h?

UC-AI4: Crear pedido
  Input: "Eso es todo, quiero pagar"
  Proceso: Parser CREAR_PEDIDO → convierte carrito → calcula total → genera link Wompi
  Output: "Pedido #[número] creado. Total: $[total]. Link de pago: [url]"
  Test: ¿Calcula impuesto 19% correctamente?
  Test: ¿Genera link Wompi válido?
  Test: ¿Marca carrito como 'converted'?

UC-AI5: Escalamiento a humano
  Input: "Habla con un agente"
  Proceso: Parser ESCALAMIENTO → marca conversación → notifica dueño
  Output: "Te transfiero con un asesor. Espera un momento..."
  Test: ¿Conversación aparece en inbox con flag 'humano'?
  Test: ¿Notificación llega al dueño (email/WhatsApp)?
  Test: ¿Si fuera horario, avisa y ofrece dejar mensaje?

UC-AI6: Pregunta con respuesta en Knowledge Base
  Input: "¿Cuánto cuesta una consulta?"
  Proceso: knowledge-search.ts → similarity search → encuentra FAQ
  Output: "Una consulta general cuesta $[precio]"
  Test: ¿Embedding search encuentra la respuesta correcta?
  Test: ¿Si no encuentra, registra en ai_unanswered_queries?
  Test: ¿Umbral de similitud >= 0.75?

UC-AI7: Pregunta sin respuesta (aprendizaje)
  Input: "¿Aceptan criptomonedas?"
  Proceso: No encuentra en KB → responde genérico → registra unanswered
  Output: "No tengo esa información ahora. Te la confirmo pronto."
  Test: ¿Registra en ai_unanswered_queries con contexto?
  Test: ¿No responde inventando?

UC-AI8: Cancelar cita
  Input: "Cancela mi cita del martes"
  Proceso: Parser CANCELAR_CITA → busca cita → valida ownership → cancela
  Output: "✅ Cita cancelada. ¿Necesitas algo más?"
  Test: ¿Solo cancela citas del mismo cliente?
  Test: ¿Si no hay citas, informa amablemente?

UC-AI9: Reagendar cita
  Input: "Cambia mi cita al jueves a las 10am"
  Proceso: Parser REAGENDAR_CITA → valida nueva disponibilidad → actualiza
  Test: ¿Libera slot anterior? ¿Reserva nuevo?
  Test: ¿Notifica al cliente con nueva confirmación?

UC-AI10: Cotizar (vertical tech/profesional)
  Input: "Necesito cotizar un sitio web"
  Proceso: Parser COTIZAR → crea quote en DB → envía resumen
  Output: "Cotización #[número] generada. Total: $[total]. Válida por 7 días."
  Test: ¿Items se guardan correctamente en JSONB?
  Test: ¿Número de cotización es único por tenant?

UC-AI11: Reservar (restaurante/hotel)
  Input: "Reserva mesa para 4 personas el sábado a las 8pm"
  Proceso: Parser CREAR_RESERVA → valida disponibilidad mesa → crea
  Output: "✅ Reserva confirmada: Mesa [nombre] Sábado 8:00 PM, 4 personas"
  Test: ¿Valida capacidad del recurso (mesa/habitación)?
  Test: ¿No solapa con otra reserva?

UC-AI12: Menú de bot (si configurado)
  Input: "Hola" (primera vez)
  Proceso: Si hay bot_menu activo con trigger 'welcome' → enviar menú
  Output: "¡Hola! ¿En qué puedo ayudarte?\n1️⃣ Ver catálogo..."
  Test: ¿Si cliente selecciona "1", ejecuta VER_CATALOGO?
  Test: ¿Si escribe texto libre, pasa a IA normal?
```

### 4.4 Pagos (Wompi)

```
UC-P1: Generar link de pago
  Trigger: Procesador ENVIAR_PAGO o cliente dice "quiero pagar"
  Backend: POST Wompi API → crear transacción → obtener link
  Frontend (chat): Envía link por canal
  Test: ¿Usa keys correctas (sandbox vs prod)?
  Test: ¿Link es clickeable y válido?

UC-P2: Webhook Wompi (pago exitoso)
  Input: POST /api/webhooks/wompi con status "APPROVED"
  Backend: Busca pago por transaction_id → actualiza status → notifica
  Test: ¿Idempotente (mismo webhook 2 veces no procesa 2 veces)?
  Test: ¿Actualiza orden a 'paid'? ¿Notifica al cliente?
  Test: ¿Si es sandbox, marca como test?

UC-P3: Webhook Wompi (pago rechazado)
  Input: status "DECLINED"
  Backend: Actualiza pago, notifica cliente con opción de reintentar
  Test: ¿Mantiene orden en status 'pending_payment'?
```

### 4.5 Dashboard / Frontend

```
UC-D1: Inbox — Ver conversaciones
  Test: ¿Carga lista de conversaciones por tenant?
  Test: ¿Filtros por canal funcionan (WhatsApp, IG, FB, TikTok)?
  Test: ¿Badge de unread se actualiza en tiempo real?
  Test: ¿Al click, carga mensajes del hilo?
  Test: ¿Input envía mensaje y aparece en el hilo?
  Test: ¿Typing indicator se muestra mientras IA/Agente escribe?

UC-D2: Inbox — Perfil del cliente
  Test: ¿Muestra datos de contacto, pedidos recientes, citas?
  Test: ¿Tags se agregan/eliminan?
  Test: ¿Métricas (total gastado) calculan correctamente?

UC-D3: Catálogo — CRUD producto
  Test: ¿Crear producto con atributos JSONB?
  Test: ¿Subir imágenes (drag&drop)?
  Test: ¿Variantes (talla/color) se guardan y muestran?
  Test: ¿Filtros por categoría?

UC-D4: Ajustes — Info del negocio
  Test: ¿Editar nombre, teléfono, dirección, descripción?
  Test: ¿Subir logo (validación PNG/JPG < 2MB)?
  Test: ¿Sitio web opcional?

UC-D5: Ajustes — Actividad económica
  Test: ¿Selector grid muestra 70+ actividades?
  Test: ¿Al seleccionar, carga capabilities predeterminadas?
  Test: ¿Toggles de capabilities guardan en DB?
  Test: ¿AI Engine lee capabilities actualizadas sin reinicio?

UC-D6: Ajustes — Horarios
  Test: ¿Grid lunes-domingo con apertura/cierre?
  Test: ¿Toggle activo/inactivo por día?
  Test: ¿AI Engine respeta horarios (mensaje fuera de horario)?

UC-D7: Ajustes — Wompi
  Test: ¿Toggle sandbox/producción?
  Test: ¿Guardar public/private keys (cifrados en DB)?
  Test: ¿Webhook URL auto-generada (solo lectura)?
  Test: ¿Botón copiar webhook funciona?

UC-D8: Ajustes — Agente IA
  Test: ¿Nombre, tono (Formal/Semiformal/Casual)?
  Test: ¿Sliders: temperatura, max tokens, historial, escalamiento?
  Test: ¿Instrucciones adicionales (textarea)?
  Test: ¿Cambios se reflejan inmediatamente en prompts?

UC-D9: Ajustes — Base de conocimiento
  Test: ¿CRUD FAQs (pregunta, respuesta, categoría, keywords)?
  Test: ¿Genera embedding al guardar?
  Test: ¿Sección "Preguntas sin respuesta" muestra datos?
  Test: ¿Botón "Resolver" abre modal pre-llenado?
  Test: ¿Botón "Ignorar" marca como ignorada?

UC-D10: Ajustes — Notificaciones
  Test: ¿Toggles: pago recibido, escalamiento, cita, resumen?
  Test: ¿Email y WhatsApp para alertas?
  Test: ¿Si toggle activo, backend envía notificación real?

UC-D11: Ajustes — Apariencia
  Test: ¿Toggle modo claro/oscuro?
  Test: ¿Persiste en localStorage + DB?
  Test: ¿CSS variables se actualizan sin reload?

UC-D12: Equipo — CRUD
  Test: ¿Invitar miembro (email)?
  Test: ¿Asignar rol (owner/admin/agent)?
  Test: ¿Desactivar/eliminar miembro?
  Test: ¿No puede eliminar al owner único?

UC-D13: Kanban — Board
  Test: ¿Columnas se cargan por tenant?
  Test: ¿Drag&drop mueve conversación entre columnas?
  Test: ¿Filtros por canal, agente, fecha?
  Test: ¿Cards muestran: nombre, último msg, valor, agente, tiempo?

UC-D14: Campañas — Crear
  Test: ¿Modal con nombre, lista, conexión WA?
  Test: ¿Hasta 5 mensajes con checkboxes?
  Test: ¿Variables {{nombre}} se detectan y sugieren?
  Test: ¿Programación fecha/hora + recurrencia?
  Test: ¿Selector API (Evolution/WAHA/Meta)?

UC-D15: Campañas — Listas de contactos
  Test: ¿Crear lista manual?
  Test: ¿Importar CSV/Excel (preview, mapeo variables)?
  Test: ¿Descargar plantilla?
  Test: ¿Normaliza teléfonos a +57?

UC-D16: Campañas — Ejecución
  Test: ¿Programar envía en fecha/hora correcta?
  Test: ¿Rate limit 30 msg/min?
  Test: ¿Rotación aleatoria entre mensajes activos?
  Test: ¿Resuelve variables correctamente?
  Test: ¿Log de envío por contacto (sent/delivered/read/failed)?
  Test: ¿Pausa/reanuda sin perder estado?

UC-D17: Grupos WhatsApp
  Test: ¿Listar grupos del número conectado?
  Test: ¿Crear grupo nuevo?
  Test: ¿Enviar mensaje a grupo?
  Test: ¿Seleccionar grupo como destino de campaña?

UC-D18: Integraciones
  Test: ¿CRUD por provider (OpenAI, Groq, n8n, etc.)?
  Test: ¿Toggle activo/inactivo?
  Test: ¿Botón "Probar conexión" funciona?
  Test: ¿Radio "Principal" para LLMs?
  Test: ¿AI Engine usa provider principal automáticamente?

UC-D19: Bot Config — Menú builder
  Test: ¿Crear menú con trigger (welcome/keyword/after_hours)?
  Test: ¿Agregar nodos (mensaje, opciones, acción, input)?
  Test: ¿Opciones linkean a sub-nodos?
  Test: ¿Si nodo es acción, ejecuta acción IA correcta?
  Test: ¿Menú por canal funciona?
```

### 4.6 SuperAdmin

```
UC-S1: Login SuperAdmin
  Test: ¿Auth separada de tenant users?
  Test: ¿No puede loguearse con credenciales de tenant?

UC-S2: Dashboard SaaS
  Test: ¿MRR calculado correctamente?
  Test: ¿Contadores de tenants activos/inactivos/demos?
  Test: ¿Top 5 tenants por volumen?

UC-S3: Gestión de Tenants
  Test: ¿Crear tenant desde SuperAdmin?
  Test: ¿Suspender/activar tenant?
  Test: ¿Impersonate (acceder como tenant)?
  Test: ¿Cambiar plan?
  Test: ¿Eliminar tenant (cascade delete correcto)?

UC-S4: Planes
  Test: ¿CRUD planes con límites JSONB?
  Test: ¿Límites se respetan (max_messages, max_products, etc.)?

UC-S5: Demos
  Test: ¿Crear demo con fecha de expiración?
  Test: ¿Job BullMQ suspende demos vencidas?
  Test: ¿Convertir demo a cliente pago?

UC-S6: Resellers
  Test: ¿CRUD reseller con comisión %?
  Test: ¿Link de referido trackea correctamente?

UC-S7: Monitor VPS
  Test: ¿CPU/RAM/Disco se leen correctamente?
  Test: ¿Estado de servicios (PostgreSQL, Redis, etc.)?
  Test: ¿Si un servicio caído, muestra ❌ sin crash?

UC-S8: Logs de auditoría
  Test: ¿Registra acciones administrativas?
  Test: ¿Filtros por tipo, tenant, fecha?
  Test: ¿Exportar CSV?
```

---

## 5. PROTOCOLO DE TESTING AUTOMATIZADO

### 5.1 Tests Unitarios (Vitest)

```bash
# Ejecutar en cada package/app
pnpm test:unit

Cobertura mínima requerida:
- AI Action Engine: > 90%
- Procesadores de acciones: > 85%
- Channel drivers: > 80%
- Servicios de negocio: > 80%
- Utilidades (date-helpers, format-cop, etc.): > 90%
```

### 5.2 Tests de Integración (Supertest + Playwright)

```bash
# Backend integration tests
pnpm test:integration

Verificar:
□ Auth flow completo (register → login → refresh → logout)
□ CRUD de cada entidad con RLS (crear como tenant A, verificar que tenant B no ve)
□ AI Engine end-to-end: mensaje → respuesta IA → acción ejecutada → confirmación
□ Webhooks: Evolution, WAHA, Wompi (simular payloads)
□ Pagos: crear link → simular webhook → verificar estado orden
□ Canales: conectar/desconectar cada canal (simular APIs externas con nock/msw)

# Frontend E2E tests (Playwright)
pnpm test:e2e

Verificar:
□ Login → Dashboard → cada página navegable
□ Inbox: enviar mensaje, recibir mensaje (simular SSE)
□ Ajustes: cada sección guarda y persiste
□ Campañas: crear campaña, programar, verificar job ejecuta
```

### 5.3 Scripts de Verificación Rápida (Bash)

```bash
#!/bin/bash
# audit-check.sh — Script de verificación de despliegue

echo "=== AUDITORÍA DE DESPLIEGUE ==="

# 1. Compilación
echo "[1/10] Compilando TypeScript..."
cd apps/api && npx tsc --noEmit || exit 1
cd ../web && npx tsc --noEmit || exit 1

# 2. Lint
echo "[2/10] Linting..."
cd ../api && pnpm lint || exit 1
cd ../web && pnpm lint || exit 1

# 3. Tests unitarios
echo "[3/10] Tests unitarios..."
cd ../../ && pnpm test:unit || exit 1

# 4. Migraciones pendientes
echo "[4/10] Verificando migraciones..."
cd packages/db && npx drizzle-kit check || exit 1

# 5. Seed funciona
echo "[5/10] Seed de demo..."
cd ../../apps/api && npx tsx seed-demo.ts || exit 1

# 6. Docker compose levanta
echo "[6/10] Docker compose..."
docker compose up -d --build || exit 1
sleep 10

# 7. Healthchecks
echo "[7/10] Healthchecks..."
curl -f http://localhost:3001/health || exit 1
curl -f http://localhost:3000 || exit 1
curl -f http://localhost:8080 || exit 1  # Evolution API

# 8. Variables de entorno
echo "[8/10] Variables de entorno..."
[ -z "$DATABASE_URL" ] && echo "ERROR: DATABASE_URL" && exit 1
[ -z "$JWT_SECRET" ] && echo "ERROR: JWT_SECRET" && exit 1
[ -z "$OPENAI_API_KEY" ] && echo "ERROR: OPENAI_API_KEY" && exit 1
[ -z "$WOMPI_SANDBOX_PUBLIC_KEY" ] && echo "ERROR: WOMPI keys" && exit 1

# 9. RLS verificación (query directa)
echo "[9/10] Verificando RLS..."
psql "$DATABASE_URL" -c "\dt" | grep -q "tenants" || exit 1

# 10. No hay any implícitos
echo "[10/10] Verificando strict mode..."
grep -r "// @ts-ignore" apps/ packages/ | wc -l | xargs -I {} echo "@ts-ignore encontrados: {}"
grep -r ": any" apps/api/src/ | wc -l | xargs -I {} echo "any explícitos: {}"

echo "=== AUDITORÍA COMPLETADA ==="
```

### 5.4 Verificación de Seguridad

```bash
# Verificar que no hay claves hardcodeadas
grep -r "sk-[a-zA-Z0-9]" apps/ packages/ | grep -v ".env" | grep -v "example"
grep -r "prv_test_" apps/ packages/ | grep -v ".env" | grep -v "example"
grep -r "pub_test_" apps/ packages/ | grep -v ".env" | grep -v "example"

# Verificar que no hay console.log en producción
grep -r "console.log" apps/api/src/ | grep -v "logger.ts" | grep -v ".test."

# Verificar que RLS está habilitado en todas las tablas tenant-scoped
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('migrations', 'superadmin_users', 'saas_plans', 'saas_resellers');" | while read table; do
  psql "$DATABASE_URL" -c "SELECT relrowsecurity FROM pg_class WHERE relname='$table';" | grep -q "t" || echo "ALERTA: RLS desactivado en $table"
done
```

---

## 6. HALLAZGOS CONOCIDOS (Del Diagnóstico v6)

Antes de empezar, verificar SIEMPRE estos puntos que YA se sabe que están rotos:

```
□ CRÍTICO: Canales — Botones "Conectar" NO funcionan (solo UI)
  Archivos sospechosos: channels/page.tsx, whatsapp.driver.ts, evolution-api.client.ts

□ CRÍTICO: Config IA — Base de conocimiento muestra "0 entradas", botón Agregar no abre
  Archivos sospechosos: ai-config/page.tsx, knowledge-base.service.ts

□ CRÍTICO: Ajustes — Solo tiene nombre, vertical texto libre, zona horaria, modelo, temperatura, tokens
  Falta: teléfono, dirección, descripción, logo, web, actividad económica, horarios, Wompi, notificaciones, tema
  Archivos sospechosos: settings/page.tsx, tenants.service.ts

□ ALTO: AI Action Engine — No se sabe si el flujo completo funciona (mensaje → contexto → prompt → LLM → parser → procesador)
  Archivos sospechosos: ai.engine.ts, ai.action-parser.ts, todos los processors/

□ ALTO: Inbox — No hay capturas de pantalla, se desconoce estado
  Archivos sospechosos: inbox/page.tsx, conversations.realtime.ts

□ ALTO: Dashboard/KPIs — Probablemente placeholder
  Archivos sospechosos: page.tsx (dashboard), kpi-card.tsx

□ MEDIO: Pedidos/Citas — No hay capturas, estado desconocido
  Archivos sospechosos: orders/page.tsx, appointments/page.tsx

□ MEDIO: Catálogo — Falta atributos dinámicos JSONB, variantes, imágenes drag&drop
  Archivos sospechosos: catalog/page.tsx, products.service.ts
```

---

## 7. CRITERIOS DE ACEPTACIÓN PARA DESPLIEGUE

### 7.1 Bloqueantes (DEBEN estar 100% funcionales)

```
□ Auth: Registro, login, refresh, logout, RLS funcional
□ Canales: WhatsApp (Evolution o WAHA) conecta, envía y recibe mensajes
□ AI Engine: Flujo completo funciona sin alucinaciones ni errores
□ Procesadores: CREAR_CITA, CREAR_PEDIDO, ENVIAR_PAGO, ESCALAMIENTO
□ Pagos: Wompi sandbox funcional, webhook idempotente
□ Ajustes: TODAS las secciones del mockup HTML guardan en DB
□ Base de conocimiento: CRUD funcional, embeddings generados
□ Inbox: Carga conversaciones, envía mensajes, perfil cliente visible
□ Docker: docker compose up levanta todo sin errores
□ Tests: > 80% coverage, todos pasan
□ Seguridad: No hay secrets hardcodeados, RLS en todas las tablas, JWT seguro
```

### 7.2 Alto (Deben estar funcionales, no bloqueantes si hay workaround)

```
□ Instagram: Conecta y recibe/envía (si WA funciona, IG puede esperar 1 sprint)
□ Facebook: Conecta y recibe/envía
□ TikTok: Scraper funciona
□ Kanban: Board drag&drop con datos reales
□ Multiagente: Asignación round-robin, estados de agente
□ Campañas: Crear, programar, ejecutar con rate limit
□ SuperAdmin: Dashboard funcional, gestión de tenants
```

### 7.3 Medio (Pueden estar en MVP con funcionalidad básica)

```
□ Grupos WhatsApp: Listar y enviar (crear puede esperar)
□ Integraciones: OpenAI configurado (otros providers pueden esperar)
□ Bot builder: Menú de bienvenida básico
□ Analytics: KPIs básicos (charts avanzados pueden esperar)
□ Reservas: Crear reserva funcional
□ Cotizaciones: Generar cotización funcional
```

---

## 8. TEMPLATE DE REPORTE DE AUDITORÍA

Al finalizar, generar un reporte con esta estructura:

```markdown
# REPORTE DE AUDITORÍA DE DESPLIEGUE
# Fecha: [YYYY-MM-DD]
# Auditor: [Asistente de Código]
# Commit: [hash]

## RESUMEN EJECUTIVO
- Estado general: [NO LISTO / LISTO CON RESERVAS / LISTO]
- Bloqueantes encontrados: [N]
- Altos: [N]
- Medios: [N]
- Bajos: [N]
- Tests pasando: [N/N]
- Coverage: [%]

## HALLAZGOS CRÍTICOS (Bloqueantes)
1. [Archivo] — [Descripción] — [Cómo reproducir] — [Fix sugerido]
2. ...

## HALLAZGOS ALTOS
1. [Archivo] — [Descripción] — [Impacto] — [Fix sugerido]
2. ...

## HALLAZGOS MEDIOS
...

## HALLAZGOS BAJOS
...

## ESTADO POR MÓDULO
| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth | ✅/⚠️/❌ | ... |
| Canales | ... | ... |
| AI Engine | ... | ... |
| Pagos | ... | ... |
| Inbox | ... | ... |
| Ajustes | ... | ... |
| Kanban | ... | ... |
| Campañas | ... | ... |
| SuperAdmin | ... | ... |

## RECOMENDACIÓN FINAL
[NO DESPLEGAR / DESPLEGAR CON MONITORING / DESPLEGAR]
```

---

## 9. INSTRUCCIONES DE EJECUCIÓN PARA EL ASISTENTE

1. **Clona/Abre** el repositorio del proyecto en el IDE.
2. **Ejecuta** el script `audit-check.sh` (sección 5.3) para verificación rápida.
3. **Revisa** archivo por archivo siguiendo el inventario de la sección 3.
4. **Ejecuta** cada caso de uso de la sección 4 (manualmente o con tests).
5. **Documenta** hallazgos en el template de la sección 8.
6. **Clasifica** cada hallazgo según la escala de la sección 2.2.
7. **Genera** la recomendación final.

**REGLAS DURANTE LA AUDITORÍA:**
- No asumas que un import funciona solo porque existe. Verifica que el módulo exporta lo que se espera.
- No asumas que una API responde 200. Verifica el contrato de respuesta.
- No asumas que un botón hace algo. Lee su onClick y sigue la cadena de llamadas hasta el endpoint.
- Si encuentras un `TODO` o `FIXME`, clasifícalo como hallazgo (alto o medio según impacto).
- Si un archivo no existe pero debería según la arquitectura, marca como hallazgo crítico (falta implementación).
- Si un endpoint no tiene test, anótalo pero no bloquees por eso solo (es bajo, a menos que sea crítico).
