# PARCHE — SOPORTE DUAL: EVOLUTION API + WAHA
# Agregar WAHA como segunda opción de motor WhatsApp
# APLICA SOBRE: MODULOS_FALTANTES_IMPLEMENTAR.md

> **Impacto en el resto del proyecto:** CERO.
> Solo se agrega un driver nuevo y un selector en el dashboard.

---

## POR QUÉ NO AFECTA NADA

Tu arquitectura tiene un **Channel Abstraction Layer** con la interface `IChannelDriver`.
El WhatsApp driver actual (`whatsapp.driver.ts`) llama a Evolution API via HTTP REST.
WAHA es la misma idea: otro servidor Docker que expone REST API + webhooks.

Lo que haces es crear un SEGUNDO driver (`whatsapp-waha.driver.ts`) que implementa
la misma interface `IChannelDriver` pero llamando a endpoints de WAHA en vez de Evolution.

El Channel Manager decide cuál usar según la config del tenant.
El AI Engine, los procesadores, el Kanban, las campañas — TODO sigue igual.

```
                                    ┌─────────────────────────────┐
                                    │ IChannelDriver (interface)  │
                                    └──────┬──────────┬───────────┘
                                           │          │
                              ┌────────────▼──┐  ┌────▼────────────┐
                              │ WhatsApp      │  │ WhatsApp        │
                              │ Evolution     │  │ WAHA Driver     │
                              │ Driver        │  │ (NUEVO)         │
                              └──────┬────────┘  └──────┬──────────┘
                                     │                   │
                              ┌──────▼────────┐  ┌──────▼──────────┐
                              │ Evolution API │  │ WAHA            │
                              │ Docker :8080  │  │ Docker :3080    │
                              └───────────────┘  └─────────────────┘

El tenant elige cuál usar desde /dashboard/channels/whatsapp
```

---

## 1. DOCKER COMPOSE — Agregar WAHA

Agregar al `docker-compose.yml` existente:

```yaml
  # ═══ WAHA (Motor WhatsApp alternativo) ═══
  waha:
    image: devlikeapro/waha:latest
    ports: ["3080:3000"]
    environment:
      - WHATSAPP_DEFAULT_ENGINE=NOWEB
      - WAHA_API_KEY=${WAHA_API_KEY}
      - WHATSAPP_RESTART_ALL_SESSIONS=true
      - WAHA_LOG_LEVEL=info
      # Webhooks → tu API
      - WHATSAPP_HOOK_URL=${API_BASE_URL}/api/webhooks/waha
      - WHATSAPP_HOOK_EVENTS=message,session.status,message.ack
      # Storage en PostgreSQL (producción)
      # - WHATSAPP_SESSIONS_POSTGRESQL_URL=${DATABASE_URL}
    volumes:
      - waha_sessions:/app/.sessions

volumes:
  waha_sessions:
```

---

## 2. VARIABLES DE ENTORNO — Agregar

```env
# ═══ WAHA (alternativa a Evolution API) ═══
WAHA_API_URL=http://localhost:3080
WAHA_API_KEY=your-waha-api-key
```

---

## 3. MAPEO DE ENDPOINTS: Evolution vs WAHA

```
ACCIÓN                    │ EVOLUTION API                              │ WAHA
──────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────
Crear sesión              │ POST /instance/create                     │ POST /api/sessions/start
                          │   { instanceName, qrcode: true,           │   { name: "tenant-xxx",
                          │     webhook: { url, events } }            │     config: { webhooks: [{url, events}] } }
                          │   Auth: apikey header                     │   Auth: X-Api-Key header
                          │                                           │
Obtener QR                │ GET /instance/connect/{name}              │ GET /api/{session}/auth/qr
                          │   → { base64 }                            │   → imagen QR (o base64 con format=raw)
                          │                                           │
Estado de conexión        │ GET /instance/connectionState/{name}      │ GET /api/sessions/{name}
                          │   → { state: "open" }                     │   → { status: "WORKING" }
                          │                                           │
Enviar texto              │ POST /message/sendText/{name}             │ POST /api/sendText
                          │   { number, text }                        │   { session: "name", chatId: "57300...@c.us",
                          │                                           │     text: "Hola" }
                          │                                           │
Enviar imagen             │ POST /message/sendMedia/{name}            │ POST /api/sendImage
                          │   { number, mediatype:"image",            │   { session, chatId, file: { url },
                          │     media: url, caption }                 │     caption }
                          │                                           │
Enviar documento          │ POST /message/sendMedia/{name}            │ POST /api/sendFile
                          │   { number, mediatype:"document", ... }   │   { session, chatId, file: { url },
                          │                                           │     caption }
                          │                                           │
Enviar ubicación          │ POST /message/sendLocation/{name}         │ POST /api/sendLocation
                          │   { number, latitude, longitude, name }   │   { session, chatId, latitude,
                          │                                           │     longitude, title }
                          │                                           │
Typing indicator          │ POST /chat/updatePresence/{name}          │ POST /api/startTyping
                          │   { number, presence:"composing" }        │   { session, chatId }
                          │                                           │
Marcar leído              │ POST /chat/markMessageAsRead/{name}       │ POST /api/markAsRead  (Plus)
                          │   { readMessages: [...] }                 │   { session, chatId }
                          │                                           │
Cerrar sesión             │ DEL /instance/logout/{name}               │ POST /api/sessions/{name}/stop
                          │                                           │
Eliminar sesión           │ DEL /instance/delete/{name}               │ DELETE /api/sessions/{name}
                          │                                           │
Listar grupos             │ GET /group/fetchAllGroups/{name}          │ GET /api/{session}/groups
                          │                                           │
Enviar a grupo            │ POST /message/sendText/{name}             │ POST /api/sendText
                          │   { number: "groupJid@g.us" }             │   { chatId: "groupId@g.us" }
                          │                                           │
Webhook mensaje entrante  │ event: "messages.upsert"                  │ event: "message"
                          │ data.key.remoteJid, data.message          │ payload.from, payload.body
                          │                                           │
Webhook conexión          │ event: "connection.update"                │ event: "session.status"
                          │ data.state: "open"                        │ payload.status: "WORKING"
                          │                                           │
Webhook QR                │ event: "qrcode.updated"                   │ event: "session.status"
                          │ data.qrcode.base64                        │ status: "SCAN_QR_CODE" + GET /api/{s}/auth/qr
```

---

## 4. NUEVO ARCHIVO: whatsapp-waha.driver.ts

```typescript
// apps/api/src/modules/channels/drivers/whatsapp/whatsapp-waha.driver.ts
//
// Implementa IChannelDriver para WAHA.
// Es un espejo de whatsapp.driver.ts pero llamando endpoints de WAHA.
//
// class WhatsAppWahaDriver implements IChannelDriver {
//   readonly channel = 'whatsapp';
//   private wahaUrl = process.env.WAHA_API_URL || 'http://localhost:3080';
//   private apiKey = process.env.WAHA_API_KEY;
//   private sessionName: string;  // "tenant-{tenantId}"
//
//   async connect(config): Promise<void> {
//     // POST /api/sessions/start
//     // Body: {
//     //   name: this.sessionName,
//     //   config: {
//     //     webhooks: [{
//     //       url: `${API_BASE_URL}/api/webhooks/waha`,
//     //       events: ["message", "session.status", "message.ack"]
//     //     }]
//     //   }
//     // }
//     // Headers: { "X-Api-Key": this.apiKey }
//   }
//
//   async sendMessage(recipientId, message): Promise<MessageResult> {
//     // WAHA usa chatId con formato "573001234567@c.us" (no @s.whatsapp.net)
//     const chatId = recipientId.includes('@') ? recipientId : `${recipientId}@c.us`;
//
//     // Typing indicator:
//     // POST /api/startTyping { session: this.sessionName, chatId }
//
//     // Delay humano 1-3s
//
//     // Según message.type:
//     //   text:     POST /api/sendText     { session, chatId, text }
//     //   image:    POST /api/sendImage    { session, chatId, file: { url }, caption }
//     //   document: POST /api/sendFile     { session, chatId, file: { url }, caption }
//     //   audio:    POST /api/sendFile     { session, chatId, file: { url } }
//     //   location: POST /api/sendLocation { session, chatId, latitude, longitude, title }
//
//     // POST /api/stopTyping { session, chatId }
//   }
//
//   async disconnect(): Promise<void> {
//     // POST /api/sessions/{sessionName}/stop
//   }
//
//   getCapabilities(): ChannelCapabilities {
//     // Iguales que Evolution driver
//     return {
//       canSendText: true, canSendImage: true, canSendVideo: true,
//       canSendAudio: true, canSendDocument: true, canSendButtons: true,
//       canSendCarousel: false, canMarkAsRead: true, canSendTypingIndicator: true,
//       canReceiveRealtime: true, maxMessageLength: 65536,
//       supportsMedia: true, supportsReply: true
//     };
//   }
// }
```

---

## 5. NUEVO ARCHIVO: waha.webhook.ts

```typescript
// apps/api/src/modules/webhooks/waha.webhook.ts
//
// POST /api/webhooks/waha
//
// WAHA envía webhooks con esta estructura:
// {
//   "event": "message",
//   "session": "tenant-xxx",
//   "payload": {
//     "id": "msg-id",
//     "timestamp": 1714988400,
//     "from": "573001234567@c.us",
//     "to": "573009876543@c.us",
//     "body": "Hola, quiero una cita",
//     "fromMe": false,
//     "hasMedia": false,
//     "ack": 0
//   }
// }
//
// MAPEO DE EVENTOS:
//
// event: "message" (mensaje entrante)
//   → Filtrar: ignorar si payload.fromMe === true
//   → Filtrar: ignorar si payload.from termina en @g.us (grupos, a menos que se monitoree)
//   → Extraer: session → tenantId, payload.from → senderId, payload.body → text
//   → Normalizar a NormalizedMessage
//   → Pasar al Channel Router
//
// event: "session.status" (cambio de estado)
//   → payload.status: "WORKING" → conectado
//   → payload.status: "SCAN_QR_CODE" → necesita QR
//   → payload.status: "FAILED" → error
//   → Actualizar channel_sessions
//
// event: "message.ack" (confirmación de entrega)
//   → payload.ack: 1=sent, 2=delivered, 3=read
//   → Actualizar messages.status en DB
//
// DIFERENCIA CON EVOLUTION:
// - WAHA usa "from" con @c.us (Evolution usa @s.whatsapp.net)
// - WAHA envía "body" directo (Evolution envía message.conversation)
// - WAHA usa "session" como string (Evolution usa "instance")
// - WAHA no envía QR en el webhook — hay que hacer GET /api/{session}/auth/qr
```

---

## 6. MODIFICAR: channel-manager.ts

```typescript
// En el Channel Manager, modificar createDriver():
//
// private createDriver(channel: ChannelType, tenantId: string, engine?: string): IChannelDriver {
//   if (channel === 'whatsapp') {
//     const waEngine = engine || 'evolution'; // default
//     if (waEngine === 'waha') {
//       return new WhatsAppWahaDriver(tenantId);
//     }
//     return new WhatsAppEvolutionDriver(tenantId);
//   }
//   // ... otros canales igual
// }
//
// El engine se lee de channel_sessions.config.engine
```

---

## 7. MODIFICAR: channel_sessions (tabla DB)

```sql
-- Agregar columna para identificar qué motor usa:
ALTER TABLE channel_sessions ADD COLUMN engine VARCHAR(20) DEFAULT 'evolution';
-- Valores: 'evolution', 'waha'

-- Agregar campos específicos de WAHA:
ALTER TABLE channel_sessions ADD COLUMN waha_session_name VARCHAR(100);
```

---

## 8. FRONTEND — Selector de motor en /dashboard/channels/whatsapp

En el modal de conexión de WhatsApp, agregar un selector ANTES del QR:

```
┌──────────────────────────────────────────┐
│ Conectar WhatsApp                   [X]  │
│                                          │
│ Motor de conexión:                       │
│ ┌──────────────┐ ┌──────────────┐       │
│ │ ● Evolution  │ │ ○ WAHA       │       │
│ │   API        │ │              │       │
│ └──────────────┘ └──────────────┘       │
│                                          │
│ [QR CODE AQUÍ]                          │
│                                          │
│ Escanea con WhatsApp                     │
│ O vincular con código: [Usar código]     │
│                                          │
│ Esperando vinculación...                 │
└──────────────────────────────────────────┘
```

El tenant elige Evolution o WAHA. La elección se guarda en `channel_sessions.engine`.
Todo lo demás (QR, conexión, mensajes) funciona igual — solo cambia los endpoints internos.

---

## 9. PARA CAMPAÑAS — Selector de motor

En el modal de campañas masivas, el campo "Elección de API" ahora tiene 3 opciones:

```
── API de envío ──
(●) Evolution API
( ) WAHA
( ) API Oficial Meta
```

El job `campaign-sender.job.ts` lee la opción y usa el driver correspondiente.

---

## RESUMEN

| Qué se toca | Cambio | Impacto en lo existente |
|---|---|---|
| docker-compose.yml | Agregar servicio `waha` | Ninguno, es un container adicional |
| .env | Agregar WAHA_API_URL + WAHA_API_KEY | Ninguno |
| channel_sessions (tabla) | Agregar columna `engine` | Backward compatible (default 'evolution') |
| whatsapp-waha.driver.ts | Archivo nuevo | Ninguno |
| waha.webhook.ts | Archivo nuevo | Ninguno |
| channel-manager.ts | Agregar if/else para engine | 2 líneas |
| Frontend modal WhatsApp | Agregar selector Evolution/WAHA | UI only |
| Frontend modal campañas | Agregar opción WAHA | UI only |

**Total: 2 archivos nuevos + 3 líneas modificadas en código existente. Cero riesgo.**
