# MÓDULOS FALTANTES — IMPLEMENTAR SOBRE EL PROYECTO EXISTENTE
# Creador de menú, Multiagente, Kanban, Campañas, Grupos, Integraciones, PanelSaaS
# + Correcciones de funcionalidad rota

> **Contexto:** El proyecto ya tiene la base implementada (auth, tenants, productos,
> conversaciones, mensajes, citas, pedidos, pagos, AI engine, canales UI).
> Este documento contiene SOLO lo que falta por construir.

---

## INSTRUCCIÓN PARA CLAUDE CODE

El proyecto ya existe y tiene estructura funcional parcial. NO reconstruyas lo que ya funciona. Este documento contiene los módulos que faltan por implementar y las correcciones de lo que está roto. Implementa cada módulo en orden, integrándolo con el código existente.

Aplica el Design System "Obsidian Glass" (glassmorphism, gradientes, Plus Jakarta Sans, Framer Motion) a cada componente nuevo que crees.

---

## MÓDULO 1 — CORRECCIONES URGENTES (lo que está roto)

### 1.1 Canales — Los botones "Conectar" no funcionan

Los 4 botones de conexión en `/dashboard/channels` son solo UI sin backend. Implementar la conexión real:

**WhatsApp (via Evolution API):**
```
1. POST /api/channels/whatsapp/connect
   → Crea instancia en Evolution API: POST http://evolution-api:8080/instance/create
     Body: {
       instanceName: "tenant-{tenantId}",
       integration: "WHATSAPP-BAILEYS",
       qrcode: true,
       webhook: {
         enabled: true,
         url: "{API_BASE_URL}/api/webhooks/evolution",
         events: ["QRCODE_UPDATED","MESSAGES_UPSERT","CONNECTION_UPDATE","MESSAGES_UPDATE"]
       }
     }
   → Guardar instanceId + token en channel_sessions
   → Obtener QR: GET /instance/connect/{instanceName}
   → Devolver QR base64 al frontend

2. Frontend: al click "Conectar WhatsApp"
   → Abre modal con QR (usar qrcode.react para renderizar)
   → SSE stream en GET /api/channels/whatsapp/stream?tenantId=xxx
   → Escucha eventos: 'qr' (actualiza QR), 'connected' (cierra modal, muestra ✅)
   → Si no se escanea en 5 intentos → timeout, cerrar modal

3. Webhook receiver: POST /api/webhooks/evolution
   → Procesa eventos QRCODE_UPDATED, CONNECTION_UPDATE, MESSAGES_UPSERT
   → MESSAGES_UPSERT: normalizar mensaje → Channel Router → AI Engine
```

**Instagram (via instagrapi bridge Python):**
```
1. POST /api/channels/instagram/connect
   Body: { username, password, twoFactorCode? }
   → Llama al sidecar Python: POST http://instagram-bridge:8000/sessions/create
   → Si pide 2FA → responder 202 con { requires2FA: true }
   → Si éxito → guardar session_data en channel_sessions
   → Iniciar BullMQ polling job (cada 20 segundos)

2. Frontend: modal con campos username + password + 2FA opcional
   → Spinner mientras conecta
   → Si 2FA requerido → mostrar campo adicional
   → Éxito: ✅ Conectado como @username
```

**Facebook (via fca-unofficial):**
```
1. POST /api/channels/facebook/connect
   Body: { appState } (cookies JSON exportadas del navegador)
   → Inicializar fca-unofficial con appState
   → api.listenMqtt() para recibir mensajes en realtime
   → Guardar appState en channel_sessions

2. Frontend: modal con instrucciones paso a paso para exportar cookies
   + textarea para pegar el JSON de appState
```

**TikTok (scraper de comentarios):**
```
1. POST /api/channels/tiktok/connect
   Body: { cookies, username }
   → Guardar cookies en channel_sessions
   → Iniciar BullMQ scraper job (cada 60 segundos)
   → Scrapea comentarios de los últimos 5 videos

2. Frontend: modal con instrucciones + textarea para cookies
```

### 1.2 Config IA — Base de Conocimiento no funciona

```
Implementar CRUD completo para ai_knowledge_entries:

1. GET /api/ai/knowledge?tenantId=xxx → lista entradas
2. POST /api/ai/knowledge → crear entrada
   Body: { question, answer, category, keywords[] }
   → Al guardar: generar embedding via OpenAI embeddings API
   → INSERT en ai_knowledge_entries con embedding VECTOR(1536)
3. PUT /api/ai/knowledge/:id → editar
4. DELETE /api/ai/knowledge/:id → eliminar

5. GET /api/ai/unanswered?tenantId=xxx → preguntas sin respuesta
6. POST /api/ai/unanswered/:id/resolve → convierte en entrada KB
7. POST /api/ai/unanswered/:id/ignore → marca como ignorada

Frontend:
- Modal "Agregar entrada": pregunta, respuesta, categoría (dropdown), keywords (tags)
- Lista de FAQs con editar/eliminar
- Sección "Preguntas sin respuesta" con botones Resolver / Ignorar
- "Resolver" pre-llena modal con la pregunta y sugerencia de respuesta
```

### 1.3 Ajustes — Completar todas las secciones faltantes

Usar el mockup `ajustes_chatguire_completo.html` como referencia. Implementar estas secciones que NO existen:

```
A) Info negocio extendida:
   Campos: teléfono, dirección, descripción (textarea), logo (upload), sitio web
   Endpoint: PUT /api/tenants/:id/info

B) Selector actividad económica + capacidades:
   Grid visual con 70+ tipos de BUSINESS_TYPES (del parche v5.1)
   Toggles para activar/desactivar capacidades
   Endpoint: PUT /api/tenants/:id/capabilities

C) Horarios de atención:
   Grid lunes-domingo con hora apertura, hora cierre, toggle activo
   Endpoint: PUT /api/tenants/:id/schedule

D) Pagos Wompi:
   Toggle Sandbox/Producción
   Campos: Public Key, Private Key (con show/hide y cifrado)
   Webhook URL auto-generada (solo lectura + botón copiar)
   Endpoint: PUT /api/tenants/:id/wompi

E) Agente IA ampliado:
   Campos: nombre agente, tono (Formal/Semiformal/Casual),
   ventana historial (slider 5-20), umbral escalamiento (slider 1-5),
   instrucciones adicionales (textarea)
   Endpoint: PUT /api/tenants/:id/ai-config

F) Notificaciones:
   Toggles: pago recibido, escalamiento, nueva cita, resumen diario
   Campos: email alertas, WhatsApp alertas
   Endpoint: PUT /api/tenants/:id/notifications

G) Apariencia:
   Toggle modo claro/oscuro (data-theme="light")
   Guardar preferencia en localStorage + user preferences
```

---

## MÓDULO 2 — CREADOR DE MENÚ / FLUJOS DE BOT

```
UBICACIÓN: /dashboard/bot-config/menu-builder
DESCRIPCIÓN: Editor visual donde el dueño diseña los menús interactivos
del bot sin escribir código. Es como un Typebot simplificado.

FUNCIONALIDAD:
- Crear menú de bienvenida con opciones:
  "¡Hola! ¿En qué puedo ayudarte?
   1️⃣ Ver catálogo
   2️⃣ Agendar cita
   3️⃣ Estado de mi pedido
   4️⃣ Hablar con alguien"

- Cada opción tiene un flujo: qué pasa cuando el cliente la selecciona
  → Puede ser: ejecutar acción IA, enviar mensaje, pedir dato, submenú

- Editor visual tipo drag&drop (simplificado):
  ┌────────────────────────────────────┐
  │ MENÚ PRINCIPAL                     │
  │ Mensaje: "¡Hola! ¿En qué..."     │
  │                                    │
  │ Opción 1: Ver catálogo             │
  │   → Acción: VER_CATALOGO          │
  │                                    │
  │ Opción 2: Agendar cita            │
  │   → Acción: preguntar servicio    │
  │     → Sub: "¿Qué servicio?"       │
  │       → Listar servicios del tenant│
  │                                    │
  │ Opción 3: Estado pedido            │
  │   → Acción: pedir # pedido        │
  │     → Acción: VER_ESTADO_PEDIDO   │
  │                                    │
  │ Opción 4: Hablar con alguien      │
  │   → Acción: ESCALAMIENTO          │
  └────────────────────────────────────┘

- Menú fuera de horario (diferente al principal)
- Menú por canal (WhatsApp puede tener botones, IG solo texto)

TABLA DB:
CREATE TABLE bot_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,           -- 'main', 'after_hours', 'whatsapp_welcome'
    trigger_type VARCHAR(20) NOT NULL,    -- 'welcome', 'keyword', 'after_hours', 'custom'
    trigger_keywords TEXT[],              -- Para trigger_type='keyword'
    channel VARCHAR(20) DEFAULT 'all',    -- 'all', 'whatsapp', 'instagram', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_menu_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES bot_menus(id) ON DELETE CASCADE,
    parent_node_id UUID REFERENCES bot_menu_nodes(id),  -- NULL = nodo raíz
    type VARCHAR(20) NOT NULL,            -- 'message', 'options', 'action', 'input', 'submenu'
    content TEXT,                          -- Texto del mensaje
    options JSONB,                         -- [{"label": "Ver catálogo", "value": "1"}]
    action VARCHAR(50),                    -- Acción IA: 'VER_CATALOGO', 'ESCALAMIENTO', etc.
    action_params JSONB,                   -- Parámetros de la acción
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ENDPOINTS:
GET    /api/bot-menus?tenantId=xxx              → Lista menús
POST   /api/bot-menus                           → Crear menú
PUT    /api/bot-menus/:id                       → Editar menú
DELETE /api/bot-menus/:id                       → Eliminar menú
GET    /api/bot-menus/:id/nodes                 → Árbol de nodos
POST   /api/bot-menus/:id/nodes                 → Agregar nodo
PUT    /api/bot-menus/nodes/:nodeId             → Editar nodo
DELETE /api/bot-menus/nodes/:nodeId             → Eliminar nodo

INTEGRACIÓN CON AI ENGINE:
- Cuando llega un mensaje y NO hay conversación activa:
  1. Verificar si hay menú de bienvenida activo para el canal
  2. Si sí → enviar el menú en vez de pasar a la IA directo
  3. El cliente selecciona opción → buscar nodo hijo
  4. Si el nodo es tipo 'action' → ejecutar acción IA correspondiente
  5. Si el nodo es tipo 'submenu' → enviar siguiente nivel de opciones
  6. En cualquier momento, si el cliente escribe texto libre → pasar a IA
```

---

## MÓDULO 3 — WHATSAPP MULTIAGENTE + DEPARTAMENTOS

```
UBICACIÓN: /dashboard/team (expandir) + /dashboard/departments

TABLAS DB:
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    queue_order INTEGER DEFAULT 0,
    auto_assign BOOLEAN DEFAULT true,    -- Round-robin automático
    max_queue_size INTEGER DEFAULT 50,
    business_hours JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'agent',    -- 'lead', 'agent'
    UNIQUE(department_id, user_id)
);

-- Agregar a tabla users:
ALTER TABLE users ADD COLUMN agent_status VARCHAR(20) DEFAULT 'offline';
  -- 'available', 'busy', 'away', 'offline'
ALTER TABLE users ADD COLUMN max_concurrent_chats INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN current_chat_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN default_department_id UUID REFERENCES departments(id);

-- Agregar a tabla conversations:
ALTER TABLE conversations ADD COLUMN department_id UUID REFERENCES departments(id);
ALTER TABLE conversations ADD COLUMN queue_position INTEGER;
ALTER TABLE conversations ADD COLUMN waiting_since TIMESTAMPTZ;

FUNCIONALIDAD:
A) Gestión de departamentos:
   - CRUD departamentos con nombre, descripción, orden de cola
   - Asignar agentes a departamentos
   - Horarios por departamento

B) Asignación automática (round-robin):
   - Cuando la IA escala o el cliente pide hablar con alguien:
     1. Clasificar departamento según intención (venta→ventas, soporte→soporte)
     2. Buscar agentes disponibles en ese departamento
     3. Asignar al agente con menos chats activos
     4. Si no hay disponibles → poner en cola con mensaje:
        "Todos nuestros asesores están ocupados. Eres el #3 en la cola."

C) Panel del agente en Inbox:
   - Ver solo conversaciones asignadas a mí
   - Toggle estado: Disponible / Ocupado / Ausente
   - Transferir conversación a otro agente o departamento
   - Ver cola del departamento

D) Métricas por agente:
   - Tiempo promedio de respuesta
   - Conversaciones atendidas hoy/semana
   - Satisfacción (si se implementa encuesta post-chat)

ENDPOINTS:
GET    /api/departments?tenantId=xxx
POST   /api/departments
PUT    /api/departments/:id
DELETE /api/departments/:id
POST   /api/departments/:id/members { userId }
DELETE /api/departments/:id/members/:userId
PUT    /api/users/:id/agent-status { status: 'available' }
POST   /api/conversations/:id/transfer { targetAgentId | targetDepartmentId }
GET    /api/departments/:id/queue
```

---

## MÓDULO 4 — SISTEMA KANBAN

```
UBICACIÓN: /dashboard/kanban

TABLAS DB:
CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366F1',
    sort_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ADD COLUMN kanban_column_id UUID REFERENCES kanban_columns(id);
ALTER TABLE conversations ADD COLUMN potential_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE conversations ADD COLUMN kanban_moved_at TIMESTAMPTZ;

COLUMNAS DEFAULT (al crear tenant):
1. Nuevo (color: #3B82F6)
2. En conversación (color: #F59E0B)
3. Cotización enviada (color: #8B5CF6)
4. Pago pendiente (color: #EF4444)
5. Cerrado ganado (color: #10B981, is_final: true)
6. Perdido (color: #6B7280, is_final: true)

FRONTEND:
- Board con columnas drag&drop (usar @dnd-kit/core para React)
- Cards muestran:
  ┌──────────────────────────┐
  │ 🟢 Juan Pérez            │  ← canal dot + nombre
  │ "Quiero 3 camisetas..."  │  ← último mensaje truncado
  │ 💰 $185.000              │  ← valor potencial
  │ 📅 hace 2h │ @María      │  ← tiempo + agente
  └──────────────────────────┘
- Filtros: por canal, agente, rango de fechas, rango de valor
- Vista por canal: tabs "Todos", "WhatsApp", "Instagram", "Facebook", "TikTok"
- Al mover card: PUT /api/conversations/:id/kanban { columnId }

ENDPOINTS:
GET    /api/kanban/columns?tenantId=xxx
POST   /api/kanban/columns
PUT    /api/kanban/columns/:id
DELETE /api/kanban/columns/:id
PUT    /api/kanban/columns/reorder { orderedIds: [] }
PUT    /api/conversations/:id/kanban { columnId, potentialValue? }
GET    /api/kanban/board?tenantId=xxx&channel=all → conversaciones agrupadas por columna
```

---

## MÓDULO 5 — CAMPAÑAS DE MENSAJES MASIVOS

```
UBICACIÓN: /dashboard/campaigns

TABLAS DB:
CREATE TABLE contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'static',
    filter_criteria JSONB,
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_list_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    list_id UUID NOT NULL REFERENCES contact_lists(id),
    channel_session_id UUID REFERENCES channel_sessions(id),
    messages JSONB NOT NULL,
    media_url VARCHAR(500),
    media_type VARCHAR(20),
    scheduled_at TIMESTAMPTZ,
    recurrence VARCHAR(20) DEFAULT 'once',
    next_run_at TIMESTAMPTZ,
    api_provider VARCHAR(20) DEFAULT 'evolution',
    status VARCHAR(20) DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_phone VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    message_index INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

FRONTEND — Modal de creación:
┌──────────────────────────────────────────────────┐
│ ✨ Nueva Campaña                          [X]    │
│                                                  │
│ Nombre: [____________________________________]  │
│                                                  │
│ Lista de contactos: [Dropdown ▼]  [+ Crear lista]│
│                                                  │
│ Conexión WhatsApp: [+57 300... ▼]               │
│ [+ Agregar WA] [🔄 Reiniciar] [✏️ Editar] [🗑️] │
│                                                  │
│ ── Mensajes (rotación aleatoria) ──              │
│ MSG 1: [Hola {{nombre}}, tenemos...  ]    [✅]   │
│ MSG 2: [{{nombre}}, no te pierdas... ]    [✅]   │
│ MSG 3: [Última oportunidad...        ]    [☐]    │
│ MSG 4: [_____________________________]    [☐]    │
│ MSG 5: [_____________________________]    [☐]    │
│                                                  │
│ Variables: {{nombre}}, {{telefono}},             │
│   {{variable1}}, {{variable2}}                   │
│                                                  │
│ 📎 Adjuntar archivo [Seleccionar]                │
│                                                  │
│ ── Programación ──                               │
│ Fecha: [2026-05-15]  Hora: [09:00]               │
│ Recurrencia: [Única ▼]                           │
│   Única | Diaria | Semanal | Quincenal |         │
│   Mensual | Trimestral | Semestral | Anual       │
│                                                  │
│ ── API de envío ──                               │
│ (●) Evolution API  ( ) API Oficial Meta          │
│                                                  │
│ [Cancelar]  [💾 Guardar borrador]  [🚀 Programar]│
└──────────────────────────────────────────────────┘

LISTAS DE CONTACTOS — Página /dashboard/campaigns/lists:
- Tabla de listas con nombre, # contactos, fecha creación
- Crear lista manual (agregar contactos uno a uno)
- Listas dinámicas: filtro por tags, última compra, canal

IMPORTACIÓN EXCEL/CSV — Flujo completo:

El Excel/CSV es la fuente principal de contactos para campañas.
Las COLUMNAS del archivo SON las variables disponibles en los mensajes.

Paso 1: Descargar plantilla
  - Botón "📥 Descargar plantilla Excel"
  - Genera un .xlsx con columnas predeterminadas:
    | nombre | telefono | email | ciudad | variable1 | variable2 | variable3 |
    |--------|----------|-------|--------|-----------|-----------|-----------|
    | (ejemplo) Juan Pérez | 573001234567 | juan@mail.com | Bogotá | VIP | Talla M | |
  - El tenant puede agregar columnas al Excel. Cada columna extra
    se convierte automáticamente en una variable disponible.
  - La columna "telefono" es OBLIGATORIA (sin ella no se puede enviar).

Paso 2: Subir archivo
  - Botón "📤 Importar Excel/CSV"
  - Acepta: .xlsx, .xls, .csv
  - Usar librería SheetJS (xlsx) en el backend para parsear
  - Validar: columna "telefono" existe, formatos de número válidos

Paso 3: Mapeo automático de variables
  - El sistema lee los nombres de columna del Excel
  - Cada columna se convierte en variable: {{nombre}}, {{email}}, {{ciudad}}, etc.
  - Mostrar preview con las primeras 5 filas + variables detectadas:
    ┌──────────────────────────────────────────────────────┐
    │ 📊 Preview de importación                            │
    │                                                      │
    │ Archivo: clientes_mayo.xlsx                          │
    │ Contactos encontrados: 347                           │
    │ Variables detectadas:                                │
    │   {{nombre}}, {{telefono}}, {{email}},               │
    │   {{ciudad}}, {{variable1}}, {{variable2}}           │
    │                                                      │
    │ ┌────────┬──────────────┬──────────┬────────┐       │
    │ │ nombre │ telefono     │ email    │ ciudad │       │
    │ ├────────┼──────────────┼──────────┼────────┤       │
    │ │ Juan   │ 573001234567 │ juan@... │ Bogotá │       │
    │ │ María  │ 573109876543 │ maria@...│ Cali   │       │
    │ │ Carlos │ 573207654321 │          │ Medellín│      │
    │ └────────┴──────────────┴──────────┴────────┘       │
    │                                                      │
    │ ⚠️ 3 contactos sin teléfono (serán ignorados)       │
    │ ⚠️ 12 teléfonos sin formato +57 (se agregarán auto) │
    │                                                      │
    │ [Cancelar]  [✅ Importar 347 contactos]              │
    └──────────────────────────────────────────────────────┘

Paso 4: Guardar en DB
  - Crear contact_list con nombre del archivo o nombre personalizado
  - Para cada fila del Excel:
    INSERT INTO contact_list_entries (
      list_id, phone, name, variables
    ) VALUES (
      listId,
      row.telefono,       -- normalizado a formato +57
      row.nombre,
      {                   -- TODAS las demás columnas como JSONB
        "email": row.email,
        "ciudad": row.ciudad,
        "variable1": row.variable1,
        "variable2": row.variable2
      }
    )
  - Actualizar contact_lists.contact_count

Paso 5: Variables disponibles en mensajes de campaña
  - Al crear campaña y seleccionar una lista, el sistema lee
    las variables de la lista (de los column names guardados)
  - Las muestra como sugerencias debajo del campo de mensaje:
    "Variables disponibles: {{nombre}} {{telefono}} {{email}} {{ciudad}} {{variable1}}"
  - Al escribir {{ el editor muestra autocompletado con las variables

IMPLEMENTACIÓN BACKEND — Endpoint de importación:

POST /api/contact-lists/:id/import
  Content-Type: multipart/form-data
  Body: { file: <archivo.xlsx> }

  Proceso:
  1. Recibir archivo con @fastify/multipart
  2. Parsear con SheetJS (xlsx):
     const workbook = XLSX.read(buffer, { type: 'buffer' });
     const sheet = workbook.Sheets[workbook.SheetNames[0]];
     const rows = XLSX.utils.sheet_to_json(sheet);
  3. Extraer nombres de columna: Object.keys(rows[0])
  4. Validar columna 'telefono' existe
  5. Normalizar teléfonos (agregar +57 si falta, quitar espacios/guiones)
  6. Guardar column_names en contact_lists.metadata.columns
  7. Batch insert en contact_list_entries
  8. Response: { imported: 347, skipped: 3, variables: ["nombre","telefono","email","ciudad"] }

GET /api/contact-lists/:id/template
  → Genera y descarga plantilla .xlsx con columnas predeterminadas
  Usar SheetJS para crear el Excel:
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre', 'telefono', 'email', 'ciudad', 'variable1', 'variable2', 'variable3'],
      ['Juan Pérez', '573001234567', 'juan@mail.com', 'Bogotá', '', '', '']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

GET /api/contact-lists/:id/variables
  → Devuelve las variables disponibles de la lista
  Response: { variables: ["nombre", "telefono", "email", "ciudad", "variable1"] }

RESOLUCIÓN DE VARIABLES EN ENVÍO (campaign-sender.job.ts):

function resolveVariables(template: string, contact: ContactListEntry): string {
  let result = template;
  // Variables base
  result = result.replace(/\{\{nombre\}\}/g, contact.name || '');
  result = result.replace(/\{\{telefono\}\}/g, contact.phone || '');
  // Variables custom del JSONB
  if (contact.variables) {
    for (const [key, value] of Object.entries(contact.variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value || ''));
    }
  }
  // Limpiar variables no resueltas
  result = result.replace(/\{\{\w+\}\}/g, '');
  return result.trim();
}

MODIFICAR TABLA contact_lists — agregar columnas:
ALTER TABLE contact_lists ADD COLUMN column_names TEXT[] DEFAULT '{}';
  -- Nombres de columnas del Excel importado
ALTER TABLE contact_lists ADD COLUMN file_name VARCHAR(255);
  -- Nombre del archivo original

EJECUCIÓN (BullMQ):
- Job campaign-sender.job.ts
- Rate limit: 30 msg/min (configurable)
- Para cada contacto: seleccionar MSG aleatorio de los activos
- Resolver variables: {{nombre}} → contact.name, {{variable1}} → contact.variables.variable1
- Si tiene media → enviar con caption
- Log cada envío en campaign_logs
- Si recurrence != 'once' → calcular next_run_at y programar siguiente job

ENDPOINTS:
POST   /api/contact-lists                     → Crear lista
POST   /api/contact-lists/:id/import          → Importar CSV
GET    /api/contact-lists?tenantId=xxx        → Listar
DELETE /api/contact-lists/:id

POST   /api/campaigns                         → Crear campaña
PUT    /api/campaigns/:id                     → Editar
POST   /api/campaigns/:id/schedule            → Programar envío
POST   /api/campaigns/:id/pause               → Pausar
POST   /api/campaigns/:id/resume              → Reanudar
DELETE /api/campaigns/:id/cancel              → Cancelar
GET    /api/campaigns/:id/logs                → Logs de envío
GET    /api/campaigns?tenantId=xxx            → Listar campañas
```

---

## MÓDULO 6 — GRUPOS WHATSAPP

```
UBICACIÓN: /dashboard/groups

FUNCIONALIDAD (via Evolution API):
- GET /group/fetchAllGroups/{instance}     → Listar grupos
- POST /group/create/{instance}            → Crear grupo
- POST /group/updateParticipant/{instance} → Agregar/remover miembros
- POST /message/sendText/{instance}        → Enviar a grupo (number = groupJid@g.us)

FRONTEND:
- Tabla de grupos: nombre, # participantes, último mensaje
- Crear grupo nuevo (nombre + participantes)
- Enviar mensaje a grupo (texto + media)
- Seleccionar grupos como destino de campaña

TABLA DB:
CREATE TABLE whatsapp_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    group_jid VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    participant_count INTEGER DEFAULT 0,
    is_monitored BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, group_jid)
);

ENDPOINTS:
GET    /api/groups?tenantId=xxx             → Lista desde Evolution + DB
POST   /api/groups/create                   → Crear grupo
POST   /api/groups/:groupJid/send           → Enviar mensaje
POST   /api/groups/sync                     → Sincronizar con Evolution
```

---

## MÓDULO 7 — INTEGRACIONES EXTERNAS

```
UBICACIÓN: /dashboard/settings/integrations

TABLA DB:
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    category VARCHAR(20) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

PROVIDERS SOPORTADOS:

LLM (categoría 'llm'):
- openai:     { api_key, model: 'gpt-4o-mini', base_url }
- groq:       { api_key, model: 'llama-3.1-70b' }
- openrouter: { api_key, model }
- anthropic:  { api_key, model: 'claude-sonnet-4-20250514' }

Automatización (categoría 'automation'):
- n8n:        { webhook_url }
- typebot:    { url, bot_id }
- dify:       { api_key, url }

CRM (categoría 'crm'):
- chatwoot:   { url, api_token, account_id }

FRONTEND:
Grid de cards por integración:
┌────────────────────────┐
│ [Logo] OpenAI     [✅] │
│ Modelo: gpt-4o-mini    │
│ API Key: sk-••••••     │
│ ★ Principal             │
│ [Configurar] [Probar]  │
└────────────────────────┘

- Toggle activo/inactivo
- Botón "Probar conexión" → llama endpoint de test
- Radio "Principal" para LLMs (solo uno puede ser principal)
- Al cambiar el LLM principal → el AI Engine usa ese provider

INTEGRACIÓN CON AI ENGINE:
En lib/llm-client.ts:
1. Leer integración activa: SELECT FROM integrations WHERE tenant_id AND category='llm' AND is_primary
2. Usar config.api_key y config.model para la llamada
3. Si no hay integración → usar OPENAI_API_KEY del .env como fallback

ENDPOINTS:
GET    /api/integrations?tenantId=xxx
POST   /api/integrations
PUT    /api/integrations/:id
DELETE /api/integrations/:id
POST   /api/integrations/:id/test          → Probar conexión
PUT    /api/integrations/:id/set-primary   → Marcar como principal
```

---

## MÓDULO 8 — PANEL SUPERADMIN SaaS

```
UBICACIÓN: /app/(superadmin)/
AUTH SEPARADA: superadmin_users (no son tenant users)
RUTA DE ACCESO: /admin (o /superadmin)

TABLAS DB:
CREATE TABLE superadmin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price_cop DECIMAL(12,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    limits JSONB NOT NULL,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saas_resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    commission_pct DECIMAL(5,2) DEFAULT 10.00,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES saas_plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES saas_resellers(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mrr DECIMAL(12,2) DEFAULT 0;

PÁGINAS:
1. /admin                    → Dashboard KPIs (MRR, tenants activos, demos, churn)
2. /admin/tenants            → Tabla de todos los tenants + acciones
3. /admin/tenants/create     → Wizard crear tenant
4. /admin/tenants/[id]       → Detalle + impersonate + suspender
5. /admin/plans              → CRUD planes con límites
6. /admin/demos              → Demos activas + conversión
7. /admin/resellers          → CRUD resellers + comisiones
8. /admin/monitor            → CPU, RAM, Disco, servicios, backups
9. /admin/logs               → Auditoría
10. /admin/settings          → Config global SaaS

MONITOR VPS:
- Endpoint: GET /api/superadmin/system/health
  → Usa os.cpus(), os.totalmem(), os.freemem() de Node.js
  → Checa servicios: ping PostgreSQL, Redis, Evolution API
  → Cachea en Redis (TTL 10s)
- Frontend: gauges circulares para CPU, RAM, Disco
  + tabla de estado de servicios (✅ / ❌)
  + último backup + próximo backup

DEMO EXPIRATION (BullMQ):
- Job demo-expiration-checker.job.ts (cada hora)
- SELECT FROM tenants WHERE is_demo = true AND demo_expires_at < NOW()
- Para cada demo vencida → UPDATE status = 'suspended'
- Enviar email al tenant: "Tu demo ha expirado. Activa tu plan para continuar."
```

---

## FASES DE IMPLEMENTACIÓN (solo lo nuevo)

```
Fase A: Correcciones urgentes (2-3 días)
  → Canales que conecten de verdad
  → KB CRUD funcional
  → Ajustes completar todas las secciones
  Checkpoint: Los 4 canales conectan y la página de Ajustes tiene todo.

Fase B: Creador de menú (2 días)
  → CRUD bot_menus + bot_menu_nodes
  → Editor visual simplificado
  → Integración con AI Engine (menú antes que IA si es primer mensaje)
  Checkpoint: Dueño configura menú de bienvenida y funciona.

Fase C: Multiagente + Departamentos (2-3 días)
  → CRUD departamentos + asignación de agentes
  → Round-robin automático
  → Estados de agente + transferencia
  Checkpoint: Múltiples agentes atienden simultáneamente.

Fase D: Kanban (2 días)
  → Columnas configurables + drag&drop
  → Filtros por canal, agente, valor
  Checkpoint: Board funcional con datos reales.

Fase E: Campañas masivas (3-4 días)
  → Listas de contactos (CRUD + importar CSV)
  → Modal de campaña (5 msgs, variables, recurrencia, API selector)
  → BullMQ sender con rate limiting
  Checkpoint: Enviar campaña masiva programada.

Fase F: Grupos WhatsApp (1-2 días)
  → Listar/crear grupos via Evolution
  → Enviar mensajes a grupos
  Checkpoint: Gestionar grupos desde el dashboard.

Fase G: Integraciones (2 días)
  → CRUD providers (LLM, automation, CRM)
  → Adaptador LLM dinámico en AI Engine
  → Test de conexión por provider
  Checkpoint: Cambiar LLM desde el dashboard.

Fase H: Panel SuperAdmin (4-5 días)
  → Auth separada + layout
  → Dashboard KPIs SaaS
  → CRUD tenants/planes/demos/resellers
  → Monitor VPS
  → Logs auditoría
  Checkpoint: SuperAdmin completamente funcional.

Fase I: Diseño Premium (2-3 días)
  → Aplicar Design System Obsidian Glass a TODOS los módulos nuevos
  → Animaciones, glassmorphism, responsive
  Checkpoint: Todo se ve espectacular.
```

---

## INSTRUCCIÓN PARA CLAUDE CODE

Este documento contiene SOLO los módulos que faltan por implementar. El proyecto base ya existe. No reconstruyas auth, tenants, productos, conversaciones, mensajes, citas, pedidos, ni pagos — esos ya están.

Implementa en orden: Fase A primero (correcciones), luego B, C, D, E, F, G, H, I. Cada fase tiene un checkpoint de verificación.

Aplica el Design System Premium (glassmorphism, Plus Jakarta Sans, gradientes, Framer Motion) a cada componente nuevo.
