# Remediación de Auditoría de Despliegue — ChatGÜIRE
**Fecha:** 2026-05-15  
**Auditoría base:** `PROMPT_AUDITORIA_DESPLIEGUE_v1.md`  
**Estado:** COMPLETADO (5/5 fases + 5 bugs post-auditoría)

---

## FASE 1 — Seguridad crítica

### 1.1 `GET /api/tenants` expuesto públicamente
**Hallazgo:** El endpoint devolvía todos los tenants de la BD sin autenticación.  
**Fix:** `apps/api/src/modules/api/api.routes.ts`  
- Superadmin → devuelve todos; usuario normal → solo su propio tenant (`request.user.tenantId`).

### 1.2 Endpoints de escritura sin verificación de tenant
**Hallazgo:** Rutas PUT/POST/DELETE no validaban que el `tenantId` de la URL perteneciera al usuario autenticado.  
**Fix:** `verifyTenantAccess(request, reply, tenantId)` agregado en:
- `POST /conversations/:tenantId/:conversationId/messages`
- `POST|PUT|DELETE /products/:tenantId`
- `PUT /tenants/:tenantId`, `PUT /tenants/:tenantId/config`
- `PUT|DELETE /ai/config/:tenantId`, `POST|PUT|DELETE /ai/knowledge/:tenantId`
- `PUT|DELETE /tenant-config/:tenantId`
- `POST /users/:tenantId/invite`

### 1.3 Frontend usando fetch sin autenticación
**Hallazgo:** Todos los dashboards llamaban `GET /api/tenants` y usaban `fetch()` sin token.  
**Fix:** 10 páginas migradas a `getTenantId()` + `dfetch()`:
`campaigns`, `ai-config`, `analytics`, `kanban`, `bot-config`, `integrations`, `groups`, `departments`, `deliveries`, `channels`

### 1.4 Contraseña de invitación en texto plano
**Hallazgo:** `POST /users/:tenantId/invite` insertaba password temporal sin hash.  
**Fix:** `bcrypt.hash(tempPassword, 10)` antes del insert.

---

## FASE 2 — Pagos

### 2.1 `encryption.ts` inexistente
**Hallazgo:** Integrations guardaban API keys de terceros en texto plano.  
**Fix:** `apps/api/src/lib/encryption.ts` creado con AES-256-GCM:
- `encrypt(plaintext)` → `iv:authTag:ciphertext` (hex)
- `decrypt(ciphertext)`, `safeDecrypt(value)` (null-safe)
- Clave desde `ENCRYPTION_KEY` (64 hex chars = 32 bytes)

### 2.2 Wompi hardcodeado a sandbox
**Hallazgo:** `wompi-client.ts` ignoraba el modo del tenant, siempre usaba sandbox.  
**Fix:** `apps/api/src/lib/wompi-client.ts`
- Constructor acepta `mode: 'sandbox' | 'production'`
- `WompiClient.forTenant(config)` selecciona URL y key según `config.wompiMode`
- Lee `WOMPI_PROD_PRIVATE_KEY` o `WOMPI_SANDBOX_PRIVATE_KEY` según modo

### 2.3 rawBody para verificación de firma Wompi
**Fix:** `apps/api/src/server.ts` — content-type parser captura `rawBody` antes del JSON parse.

---

## FASE 3 — AI / Negocio

### 3.1 Citas sin validación de disponibilidad
**Hallazgo:** `crear-cita.processor.ts` creaba citas en slots ya ocupados.  
**Fix:** Consulta a `getAvailableSlots()` antes de insertar; si el slot pedido no está disponible, se envía lista de alternativas al cliente.

### 3.2 Pedidos sin IVA
**Hallazgo:** `crear-pedido.processor.ts` calculaba total sin impuesto.  
**Fix:** `subtotal + IVA 19% = total`; mensaje de confirmación muestra desglose.

### 3.3 Contrato Facebook erróneo
**Hallazgo:** Frontend enviaba `{ appState }` pero backend esperaba `{ pageId, accessToken }`.  
**Fix:** `channels/page.tsx` reemplaza textarea de estado por dos campos: `Page ID` + `Access Token`.

### 3.4 TikTok sin username
**Hallazgo:** Frontend no enviaba el campo `username` requerido por el backend.  
**Fix:** `channels/page.tsx` agrega campo `ttUsername` enviado en `handleTikTokConnect`.

---

## FASE 4 — Fixes menores

### 4.1 Umbral de similitud KB demasiado bajo
**Fix:** `knowledge-base.service.ts` — `> 0.7` → `>= 0.75`

### 4.2 Race condition en singleton LLM
**Hallazgo:** `llmClient` compartía `_tenantConfig` / `_currentProvider` entre requests concurrentes.  
**Fix:** `llm-client.ts` — `chat()` carga config por request desde DB usando variables locales; el estado compartido deja de usarse para routing.

---

## FASE 5 — Infraestructura

### 5.1 Rate limiting
**Fix:** `apps/api/src/plugins/rate-limit.ts` creado:
- Redis INCR + EXPIRE, 100 req/min por IP+path
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
- Fail-open si Redis no está disponible

Registrado en `server.ts` entre auth guard y error handler.

### 5.2 Docker — instagram-bridge faltante
**Fix:** `docker-compose.yml`
- Servicio `instagram-bridge` agregado (build desde `apps/instagram-bridge/`, port 8000)
- `INSTAGRAM_BRIDGE_URL=http://instagram-bridge:8000` inyectado al servicio `api`

**Fix:** `apps/instagram-bridge/Dockerfile` creado (python:3.11-slim + uvicorn).

### 5.3 Variables de entorno incompletas
**Fix:** `.env.example` reorganizado con secciones:

| Variable añadida | Propósito |
|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASS` | Credenciales explícitas para docker-compose |
| `ENCRYPTION_KEY` | AES-256-GCM (64 hex chars); incluye instrucción de generación |
| `ANTHROPIC_API_KEY` | Proveedor LLM Anthropic |
| `GROQ_API_KEY` | Proveedor LLM Groq |
| `ALLOWED_ORIGINS` | Lista CORS separada por comas |
| `WAHA_API_URL` | URL del servicio WAHA WhatsApp |
| `WOMPI_PROD_PUBLIC_KEY` / `WOMPI_PROD_PRIVATE_KEY` | Credenciales Wompi producción |
| `INSTAGRAM_BRIDGE_PORT` | Puerto expuesto del bridge Python |

### 5.4 Schema DB — columnas `subtotal` / `tax` faltantes
**Hallazgo:** `orders` no tenía estas columnas pero `crear-pedido.processor.ts` las insertaba.  
**Fix:**
- `packages/db/src/schema/orders.ts` — `subtotal decimal(12,2)`, `tax decimal(12,2)`
- `packages/db/migrations/0004_orders_subtotal_tax.sql` — `ALTER TABLE` con `DEFAULT '0'`

---

## FASE 6 — Bugs detectados en verificación post-fases

### 6.1 `settings/page.tsx` — variable `t` indefinida en load
**Hallazgo:** Líneas 246-248 referenciaban `t.ai_model`, `t.ai_temperature`, `t.ai_max_tokens` donde `t` no estaba declarado (campos del tenant que vienen del endpoint `GET /api/tenants`, no de `tenant-config`). Causaba crash de runtime al cargar la página de ajustes.  
**Fix:** `load()` ahora hace `Promise.all` con `GET /tenant-config/:id` y `GET /tenants`, usa primer elemento del array como `t`.

### 6.2 `ai.engine.ts` — race condition LLM nunca activada
**Hallazgo:** `chat()` solo carga config por request si recibe `tenantId`, pero el caller nunca lo pasaba. Además seguía llamando `loadTenantIntegration()` (mutación de estado compartido).  
**Fix:** Eliminado `loadTenantIntegration()` call; `chat()` recibe `tenantId: input.tenantId` explícitamente, activando la carga per-request del FASE 4.

### 6.3 `enviar-pago.processor.ts` — Wompi hardcodeado a singleton sandbox
**Hallazgo:** Usaba `wompiClient` (singleton global sandbox) en lugar del cliente por-tenant introducido en FASE 2. Los pagos de tenants en producción se procesaban contra sandbox.  
**Fix:** Carga config `wompi` vía `getConfig(tenantId, 'wompi', {})`, instancia `WompiClient.forTenant()` por request.

### 6.4 `wompi.webhook.ts` — no idempotente
**Hallazgo:** El mismo webhook procesado dos veces (reintento Wompi) actualizaba pago y pedido dos veces y notificaba al cliente dos veces.  
**Fix:** Consulta `existingPayment.status` antes de procesar; retorna 200 con `already_processed` si ya está en el estado final.

### 6.5 `wompi.webhook.ts` — sin notificación en DECLINED
**Hallazgo:** Pagos rechazados solo logueaban warning; el cliente no sabía que podía reintentar.  
**Fix:** Al recibir `DECLINED/ERROR`, consulta orden → cliente → envía mensaje de reintento por WhatsApp.

### 6.6 `inbox/page.tsx` + `api.routes.ts` — Inbox roto (4 problemas)
**Hallazgo 1:** `handleTransfer` y `handleClose` llamaban `POST /conversations/:id/transfer|close` sin `tenantId`, rutas que no existían en el backend.  
**Fix:** Rutas corregidas a `POST /conversations/:tenantId/:id/transfer|close`; endpoints añadidos al backend con `verifyTenantAccess`.

**Hallazgo 2:** Contrato roto en POST mensajes — frontend enviaba `{ content, senderType }`, backend esperaba `{ text }`.  
**Fix:** Backend acepta ambos (`body.content || body.text`); también persiste `senderType` en la columna nueva.

**Hallazgo 3:** Panel de perfil del cliente completamente hardcodeado (pedidos, citas, métricas siempre vacíos).  
**Fix:** Nuevo endpoint `GET /customers/:tenantId/:customerId/profile` devuelve datos reales; frontend carga y renderiza al seleccionar conversación.

**Hallazgo 4:** `senderType` no existía en schema `messages` pero era necesario para distinguir mensajes IA/agente/sistema en el inbox.  
**Fix:** Columna `sender_type` añadida al schema + migración `0005`; `ai.engine.ts`, `bot-menu.service.ts` y `scalamiento.processor.ts` ahora lo persisten.

---

## FASE 7 — Jobs y canales

### 7.1 `evolution-api.client.ts` — sin timeout
**Hallazgo:** `AxiosInstance` no tenía `timeout`; llamadas a Evolution API podían colgar indefinidamente.  
**Fix:** `timeout: 15_000` en el constructor.

### 7.2 `message-normalizer.ts` — fallback de timestamp nunca se activaba
**Hallazgo:** `new Date(NaN)` es truthy, por lo que `|| new Date()` nunca corregía timestamps inválidos.  
**Fix:** Ternario: `payload.data?.messageTimestamp ? new Date(...) : new Date()`.

### 7.3 `reminder.job.ts` — archivo inexistente
**Hallazgo:** El sistema de recordatorios no existía.  
**Fix:** `apps/api/src/jobs/reminder.job.ts` creado:
- Ventana: citas entre 23 h y 25 h desde ahora
- Clave Redis `reminder:sent:{id}` con TTL 30 h para idempotencia
- Envía WhatsApp vía `channelManager`

### 7.4 `payment-checker.job.ts` — archivo inexistente
**Hallazgo:** Pagos en estado `pending` podían quedar abiertos indefinidamente (links Wompi de un solo uso).  
**Fix:** `apps/api/src/jobs/payment-checker.job.ts` creado:
- Expiración configurable vía `PAYMENT_EXPIRY_HOURS` (default 2 h)
- Marca payment como `voided` y orden asociada como `cancelled` (solo si aún está `pending`)

### 7.5 `campaign-sender.job.ts` — envío de campaña bloqueaba HTTP request
**Hallazgo:** `POST /campaigns/:id/send` ejecutaba el loop completo de envío de forma sincrónica, con `setTimeout 2000 ms` por contacto. Con listas grandes el endpoint colgaba hasta timeout de cliente.  
**Fix:** `apps/api/src/jobs/campaign-sender.job.ts` creado:
- Selecciona campañas `status='scheduled'` con `nextRunAt <= now`
- Atomicidad anti-doble-disparo: UPDATE con WHERE `status='scheduled'` + `.returning()` — si otro proceso ya la tomó, el resultado es vacío y se salta
- Calcula `nextRunAt` según recurrencia (`daily`, `weekly`, `biweekly`, `monthly`) y re-agenda o marca `completed`
- `POST /campaigns/:id/send` queda como activación manual inmediata; el job cubre el scheduling automático

### 7.6 Registro de jobs en `server.ts`
**Fix:** Los 3 nuevos jobs registrados con sus intervalos:
- `sendAppointmentReminders` → cada 1 h
- `expireStalePayments` → cada 15 min
- `processDueCampaigns` → cada 1 min
- Los 3 incluidos en `gracefulShutdown` para limpieza de intervalos

---

## FASE 8 — Schema faltante, URLs rotas y jobs restantes

### 8.1 `ai.context-builder.ts` — tablas `quotes` y `reservations` inexistentes
**Hallazgo:** El archivo importaba `quotes` y `reservations` de `@saas/db` pero esas tablas no existían en el schema ni en las migraciones → fallo de compilación TypeScript.  
**Fix:**
- `packages/db/src/schema/quotes-reservations.ts` creado con ambas tablas
- `packages/db/src/schema/index.ts` actualizado para exportarlas
- `packages/db/migrations/0006_quotes_reservations.sql` creado

### 8.2 Frontend — 4 páginas con query param incorrecto en URLs GET
**Hallazgo:** Los frontends llamaban `GET /recurso?tenantId=...` pero el backend tiene rutas con path param `GET /recurso/:tenantId`. Todos esos fetch devolvían 404.

| Página | URL incorrecta | URL correcta |
|---|---|---|
| `orders/page.tsx` | `GET /orders?tenantId=...` | `GET /orders/:tenantId` |
| `appointments/page.tsx` | `GET /appointments?tenantId=...` | `GET /appointments/:tenantId` |
| `catalog/page.tsx` | `GET /products?tenantId=...` | `GET /products/:tenantId` |
| `departments/page.tsx` | `GET /users?tenantId=...` | `GET /users/:tenantId` |

### 8.3 `api.routes.ts` — endpoints PUT faltantes para pedidos y citas
**Hallazgo:** `orders/page.tsx` llama `PUT /orders/:tenantId/:id` y `appointments/page.tsx` llama `PUT /appointments/:tenantId/:id` para cambiar estado — ninguno de los dos existía en el backend.  
**Fix:** Ambos endpoints añadidos con `verifyTenantAccess` y `updatedAt`.

### 8.4 `demo-expiration-checker.job.ts` — archivo inexistente
**Fix:** Job creado:
- Consulta tenants `isDemo=true`, `isActive=true`, `demoExpiresAt <= now`
- Marca `isActive=false`, `suspendedAt=now` para cada uno

### 8.5 `ai-learning.job.ts` — archivo inexistente
**Fix:** Job creado (intervalo: 30 min, batch: `AI_LEARNING_BATCH_SIZE` o 10):
- Lee registros de `aiUnanswered` con `isResolved=false`
- Llama a LLM con `tenantId` y prompt del negocio para generar respuesta
- Llama `addKnowledge()` para indexar con embedding
- Marca entrada como resuelta

### 8.6 `analytics-aggregator.job.ts` — archivo inexistente
**Fix:** Job creado (intervalo: 24 h, + ejecución al iniciar):
- Agrega métricas de ayer por `tenantId` y `channel`
- Cuenta mensajes inbound/outbound, pedidos, citas, revenue
- Inserta en `analyticsDaily` con `onConflictDoNothing`

### 8.7 Registro de jobs adicionales en `server.ts`
- `expireDemoTenants` → cada 1 h
- `processUnansweredQueries` → cada 30 min
- `aggregateDailyAnalytics` → cada 24 h + ejecución inicial al arrancar
- Los 3 incluidos en `gracefulShutdown`

---

---

## FASE 9 — Procesadores, seguridad en citas, timezone, RLS e índices

### 9.1 Migración 0007 — `external_id` en messages + unique constraint en conversations
**Fix:** `packages/db/migrations/0007_messages_externalid_conversations_unique.sql`
- `ALTER TABLE messages ADD COLUMN external_id varchar(255)`
- `ALTER TABLE messages ADD COLUMN created_at timestamp DEFAULT now() NOT NULL`
- `ALTER TABLE conversations ADD CONSTRAINT ...UNIQUE (tenant_id, customer_id, channel)`

### 9.2 `cancelar-cita.processor.ts` — sin verificación de ownership
**Hallazgo:** `UPDATE appointments WHERE id = appointmentId` podía cancelar la cita de otro cliente si el atacante conocía el UUID.  
**Fix:** WHERE ampliado: `AND tenant_id = tenantId AND customer_id = params.customerId`. Si no se actualiza ninguna fila (`.returning()` vacío), se responde con error de permisos.

### 9.3 `reagendar-cita.processor.ts` — sin verificación de ownership ni disponibilidad
**Hallazgo (a):** UPDATE sin ownership check — mismo vector que 9.2.  
**Hallazgo (b):** Reagendaba directamente sin verificar si el nuevo slot estaba disponible, creando solapamientos.  
**Fix (a):** WHERE ampliado igual que 9.2.  
**Fix (b):** Llama `getAvailableSlots()` antes del UPDATE; si el slot solicitado está ocupado, devuelve alternativas al cliente.

### 9.4 `cotizar.processor.ts` — cotización no persistida
**Hallazgo:** Solo enviaba el mensaje al cliente pero no guardaba la cotización en la BD, imposibilitando seguimiento.  
**Fix:** Inserta en tabla `quotes` con `quoteNumber`, `items`, `subtotal`, `total`, `validUntil (3 días)`, status `pending` antes de enviar el mensaje.

### 9.5 `tenant-config.ts` — error Redis propaga y rompe la API
**Hallazgo:** Si Redis estaba caído, cualquier llamada a `getConfig()` o `setConfig()` lanzaba excepción, colapsando el procesador de mensajes.  
**Fix:** Ambas operaciones Redis (GET y SETEX) envueltas en try/catch con fallback a BD. Modo fail-open.

### 9.6 `auth.routes.ts` — nuevo tenant no tiene columnas kanban
**Hallazgo:** Al registrarse un tenant, el tablero kanban aparecía vacío sin columnas predeterminadas.  
**Fix:** Después del seed de `tenantConfig`, inserta 6 columnas default: Nuevo, En contacto, En progreso, Esperando, Cerrado (isFinal=true), Perdido (isFinal=true).

### 9.7 `ver-citas.processor.ts` — bugs de timezone y orden
**Hallazgo (a):** Ordenaba `DESC` para citas próximas — el cliente veía la más lejana primero.  
**Hallazgo (b):** `cita.scheduledAt.getHours()` devuelve hora UTC, no la del tenant. Para Bogotá (UTC-5) mostraría la hora 5 horas adelantada.  
**Fix (a):** `orderBy(asc(appointments.scheduledAt))`.  
**Fix (b):** `dayjs(cita.scheduledAt).tz(params.timezone).hour()` para extraer hora local del tenant.

### 9.8 `crear-cita.processor.ts` + `reagendar-cita.processor.ts` — timezone en scheduledAt
**Hallazgo:** `new Date(\`${fecha}T${hora}\`)` interpreta la fecha en timezone del servidor (UTC en producción), no del tenant. Para un tenant en Bogotá (UTC-5), una cita agendada para las 10:00 AM quedaría guardada como 10:00 UTC (= 5:00 AM hora local).  
**Fix:** `dayjs.tz(\`${fecha}T${hora}\`, params.timezone).toDate()` — interpreta la cadena EN el timezone del tenant.

### 9.9 Migración 0008 — RLS para tablas nuevas + índices de performance
**Fix:** `packages/db/migrations/0008_rls_new_tables.sql`
- RLS habilitado + política de aislamiento para `quotes`, `reservations`, `kanban_columns`
- 8 índices `CONCURRENTLY` en: `messages(conversation_id, created_at)`, `messages(tenant_id, external_id)`, `conversations(tenant_id, customer_id, channel)`, `appointments(tenant_id, status, scheduled_at)`, `orders(tenant_id, customer_id, created_at)`, `payments(tenant_id, status, created_at)`, `analytics_daily(tenant_id, date)`, `quotes(tenant_id, customer_id, created_at)`

---

## Archivos modificados / creados

| Archivo | Acción |
|---|---|
| `apps/api/src/modules/api/api.routes.ts` | Modificado |
| `apps/api/src/modules/ai/ai.engine.ts` | Modificado |
| `apps/api/src/modules/ai/processors/enviar-pago.processor.ts` | Modificado |
| `apps/api/src/modules/webhooks/wompi.webhook.ts` | Modificado |
| `apps/web/src/app/dashboard/settings/page.tsx` | Modificado |
| `apps/api/src/lib/encryption.ts` | **Creado** |
| `apps/api/src/lib/wompi-client.ts` | Modificado |
| `apps/api/src/lib/llm-client.ts` | Modificado |
| `apps/api/src/plugins/rate-limit.ts` | **Creado** |
| `apps/api/src/server.ts` | Modificado |
| `apps/api/src/modules/ai/processors/crear-cita.processor.ts` | Modificado |
| `apps/api/src/modules/ai/processors/crear-pedido.processor.ts` | Modificado |
| `apps/api/src/modules/ai/knowledge/knowledge-base.service.ts` | Modificado |
| `apps/web/src/app/dashboard/campaigns/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/ai-config/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/analytics/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/kanban/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/bot-config/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/integrations/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/groups/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/departments/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/deliveries/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/channels/page.tsx` | Modificado |
| `packages/db/src/schema/orders.ts` | Modificado |
| `packages/db/migrations/0004_orders_subtotal_tax.sql` | **Creado** |
| `apps/instagram-bridge/Dockerfile` | **Creado** |
| `docker-compose.yml` | Modificado |
| `.env.example` | Modificado |
| `apps/api/src/lib/evolution-api.client.ts` | Modificado |
| `apps/api/src/modules/channels/core/message-normalizer.ts` | Modificado |
| `apps/api/src/jobs/reminder.job.ts` | **Creado** |
| `apps/api/src/jobs/payment-checker.job.ts` | **Creado** |
| `apps/api/src/jobs/campaign-sender.job.ts` | **Creado** |
| `packages/db/src/schema/messages.ts` | Modificado |
| `packages/db/migrations/0005_messages_sender_type.sql` | **Creado** |
| `apps/api/src/modules/ai/processors/scalamiento.processor.ts` | Modificado |
| `packages/db/src/schema/quotes-reservations.ts` | **Creado** |
| `packages/db/src/schema/index.ts` | Modificado |
| `packages/db/migrations/0006_quotes_reservations.sql` | **Creado** |
| `apps/web/src/app/dashboard/orders/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/appointments/page.tsx` | Modificado |
| `apps/web/src/app/dashboard/catalog/page.tsx` | Modificado |
| `apps/api/src/jobs/demo-expiration-checker.job.ts` | **Creado** |
| `apps/api/src/jobs/ai-learning.job.ts` | **Creado** |
| `apps/api/src/jobs/analytics-aggregator.job.ts` | **Creado** |
| `packages/db/migrations/0007_messages_externalid_conversations_unique.sql` | **Creado** |
| `packages/db/migrations/0008_rls_new_tables.sql` | **Creado** |
| `apps/api/src/modules/ai/processors/cancelar-cita.processor.ts` | Modificado |
| `apps/api/src/modules/ai/processors/reagendar-cita.processor.ts` | Modificado |
| `apps/api/src/modules/ai/processors/cotizar.processor.ts` | Modificado |
| `apps/api/src/modules/ai/processors/ver-citas.processor.ts` | Modificado |
| `apps/api/src/modules/ai/processors/crear-cita.processor.ts` | Modificado |
| `apps/api/src/lib/tenant-config.ts` | Modificado |
| `apps/api/src/modules/auth/auth.routes.ts` | Modificado |

---

## FASE 10 — Bridge Instagram, acciones AI faltantes, LLM fallback

### 10.1 `instagram-bridge/main.py` — sin autenticación en ningún endpoint
**Hallazgo:** Cualquier proceso que alcanzara el puerto 8000 podía iniciar sesiones de Instagram, enviar mensajes o leer DMs sin credencial alguna.  
**Fix:** Dependencia `verify_secret` en FastAPI que valida el header `X-Bridge-Secret` contra `BRIDGE_SECRET` env var en los 3 endpoints operativos. Endpoint `/health` queda público (para Docker healthcheck).

### 10.2 `instagram.driver.ts` — llamadas al bridge sin header de auth
**Hallazgo:** El driver TypeScript no enviaba `X-Bridge-Secret` en ninguna llamada al bridge Python, por lo que con el fix 10.1 todas las llamadas habrían retornado 401.  
**Fix:** Propiedad `bridgeSecret` + getter `authHeaders` → `{ 'x-bridge-secret': ... }` inyectado en todos los `axios.get/post`.

### 10.3 `docker-compose.yml` — `BRIDGE_SECRET` no inyectado al bridge
**Fix:** Sección `environment` agregada al servicio `instagram-bridge` con `BRIDGE_SECRET=${BRIDGE_SECRET}`.

### 10.4 `AI_ACTIONS` — `CREAR_RESERVA` no en la lista y sin procesador
**Hallazgo (a):** `CREAR_RESERVA` no figuraba en el array `AI_ACTIONS` de `packages/shared` → el parser lo descartaba como acción inválida antes de procesarla.  
**Hallazgo (b):** No existía `crear-reserva.processor.ts`.  
**Fix:** `CREAR_RESERVA` agregado a `AI_ACTIONS`. Procesador creado con:
- Validación de fecha y hora obligatorios
- Verificación de solapamiento por `(fecha, hora, recurso)` antes de insertar
- Insert en tabla `reservations` con `tenantId`, `customerId`, `partySize`, `resourceName`

### 10.5 `VER_SERVICIOS` — en `AI_ACTIONS` pero sin procesador
**Hallazgo:** La acción aparecía en la lista de acciones válidas pero el router caía en `default` y logueaba un warning; el cliente no recibía respuesta.  
**Fix:** Procesador `ver-servicios.processor.ts` creado; filtra `products` por `type='service'` y `isActive=true`, devuelve lista con nombre, descripción, precio y duración.

### 10.6 `ai.engine.ts` — regex de limpieza de texto no maneja JSON multilínea
**Hallazgo:** `replace(/\{[^{}]*"accion"[^{}]*\}/g, '')` no coincide con JSON multilínea (el punto `.` en regex JavaScript no captura `\n` por defecto), dejando JSON crudo visible al cliente.  
**Fix:** Usa `extractFirstJson()` (ahora exportada de `ai.action-parser.ts`) para localizar y remover la porción exacta del JSON.

### 10.7 `agregar-carrito.processor.ts` — race condition en find-or-create
**Hallazgo:** Dos mensajes concurrentes del mismo cliente podían ambos encontrar que no hay carrito activo e intentar crear dos, resultando en dos carritos simultáneos donde los items quedarían distribuidos entre ellos.  
**Fix:** La secuencia SELECT → INSERT queda dentro de una transacción Drizzle: si ya existe carrito al momento del INSERT la transacción usa el existente.

### 10.8 `llm-client.ts` — sin fallback si proveedor primario falla
**Hallazgo:** Si el proveedor configurado por el tenant (Groq, Anthropic, OpenRouter) retornaba error o timeout, el error se propagaba y el cliente recibía el mensaje genérico de error técnico.  
**Fix:** Bloque catch: si `provider !== 'openai'`, intenta `chatOpenAI(input, null)` con las credenciales globales. Si OpenAI también falla, relanza la excepción.

---

## Archivos modificados / creados (continuación FASE 10)

| Archivo | Acción |
|---|---|
| `apps/instagram-bridge/main.py` | Modificado |
| `apps/api/src/modules/channels/drivers/instagram/instagram.driver.ts` | Modificado |
| `docker-compose.yml` | Modificado |
| `.env.example` | Modificado |
| `packages/shared/src/constants/shared.ts` | Modificado |
| `apps/api/src/modules/ai/ai.action-router.ts` | Modificado |
| `apps/api/src/modules/ai/ai.action-parser.ts` | Modificado |
| `apps/api/src/modules/ai/ai.engine.ts` | Modificado |
| `apps/api/src/modules/ai/processors/ver-servicios.processor.ts` | **Creado** |
| `apps/api/src/modules/ai/processors/crear-reserva.processor.ts` | **Creado** |
| `apps/api/src/modules/ai/processors/agregar-carrito.processor.ts` | Modificado |
| `apps/api/src/lib/llm-client.ts` | Modificado |

---

## FASE 11 — Cifrado de claves, timezone context-builder, brute-force login

### 11.1 `PUT /tenants/:tenantId/config` — claves sensibles en texto plano
**Hallazgo:** Wompi private/public key, OpenAI key, Evolution API key y similares se guardaban sin cifrar en `tenant_config`. Acceso a la BD = acceso a todas las claves de pago de todos los tenants.  
**Fix:** `SENSITIVE_CONFIG_KEYS` en `api.routes.ts` — en PUT cifra con `encrypt()`, en GET descifra con `safeDecrypt()`. Usa `lib/encryption.ts` (AES-256-GCM existente).

### 11.2 `ai.context-builder.ts` — hora de citas extraída en UTC
**Hallazgo:** `c.scheduledAt.toISOString().split('T')[1]` devuelve hora UTC. La IA veía "15:00" para una cita a las "10:00 AM" en Bogotá.  
**Fix:** `dayjs(c.scheduledAt).tz(timezone).format('HH:mm:ss')`.

### 11.3 `crear-reserva.processor.ts` — timezone en fecha de confirmación
**Fix:** `dayjs.tz(\`${fecha}T${hora}\`, params.timezone).toDate()`.

### 11.4 `auth.routes.ts` — login sin protección contra fuerza bruta
**Hallazgo:** Intentos ilimitados de login sin ningún bloqueo.  
**Fix:** Redis key `login:fail:{ip}:{email}` — al 5° intento → HTTP 429, bloqueo 15 min. Login exitoso limpia el contador. Fail-open si Redis no está disponible.

---

## Archivos modificados (FASE 11)

| Archivo | Acción |
|---|---|
| `apps/api/src/modules/api/api.routes.ts` | Modificado |
| `apps/api/src/modules/ai/ai.context-builder.ts` | Modificado |
| `apps/api/src/modules/ai/processors/crear-reserva.processor.ts` | Modificado |
| `apps/api/src/modules/auth/auth.routes.ts` | Modificado |
