# DIAGNÓSTICO COMPLETO + PLAN DE ACCIÓN v6
# Todo lo que falta, lo que está roto, y los módulos nuevos
# APLICA SOBRE: PROMPT_MAESTRO_v5 + PARCHE_v5.1 + DESIGN_SYSTEM

> **Estado actual:** Existe un frontend parcialmente construido con funcionalidad limitada.
> **Objetivo:** Cerrar TODAS las brechas funcionales + agregar módulos nuevos + PanelSaaS SuperAdmin.

---

## PARTE 1 — DIAGNÓSTICO: QUÉ EXISTE vs QUÉ FALTA vs QUÉ ESTÁ ROTO

### 1.1 Estado actual por página (según capturas)

| Página | Estado | Problema |
|---|---|---|
| Ajustes | Parcial | Solo tiene nombre, vertical (texto libre), zona horaria, modelo IA, temperatura, max tokens. Falta TODO lo del mockup HTML adjunto. |
| Catálogo | Parcial | Tiene CRUD básico de productos/servicios. Falta: atributos dinámicos JSONB, variantes (talla/color), imágenes drag&drop, formularios por vertical. |
| Canales | Roto | Los 4 botones "Conectar" NO hacen nada. No hay integración con Evolution API, ni con instagrapi bridge, ni fca-unofficial, ni scraper TikTok. Es solo UI sin backend. |
| Config IA | Parcial | Tiene system prompt, modelo, temperatura. Falta: nombre agente, tono, historial configurable, umbral escalamiento, instrucciones adicionales. Base de conocimiento muestra "0 entradas" pero el CRUD no funciona. |
| Equipo | Parcial | Tiene botón "Invitar Miembro" y tabla vacía. Falta verificar si el CRUD y RBAC funcionan realmente. |
| Dashboard/KPIs | Desconocido | No hay capturas. Probablemente placeholder. |
| Inbox | Desconocido | No hay capturas. Módulo más crítico del sistema. |
| Pedidos | Desconocido | No hay capturas. |
| Citas | Desconocido | No hay capturas. |

### 1.2 Lo que falta implementar según el mockup HTML (ajustes_chatguire_completo.html)

El HTML que adjuntaste ya tiene el diseño correcto de la página de Ajustes con TODAS las secciones. Pero actualmente tu sistema real NO tiene estas secciones. Aquí está la lista de lo que falta:

```
SECCIÓN                         │ ESTADO EN TU APP   │ ESTADO EN MOCKUP HTML
────────────────────────────────┼────────────────────┼──────────────────────
Info negocio extendida          │ ❌ Solo nombre     │ ✅ Teléfono, dirección, descripción, logo, web
Actividad económica + Caps      │ ❌ Texto libre     │ ✅ Grid selector + toggles capacidades
Horarios de atención            │ ❌ No existe       │ ✅ Grid lun-dom con hora apertura/cierre
Pagos Wompi                     │ ❌ No existe       │ ✅ Modo sandbox/prod, keys, webhook URL
Agente IA ampliado              │ ⚠️ Básico         │ ✅ Nombre, tono, historial, escalamiento
Base de conocimiento            │ ⚠️ UI sin datos   │ ✅ CRUD FAQs + preguntas sin respuesta
Notificaciones                  │ ❌ No existe       │ ✅ Toggles + email/WhatsApp alertas
Apariencia (tema)               │ ❌ No existe       │ ✅ Toggle modo claro/oscuro
```

---

## PARTE 2 — MÓDULOS NUEVOS SOLICITADOS (no existían en el prompt v5)

### 2.1 WhatsApp Multiagente / Multiusuario

```
MÓDULO: Multiagente
UBICACIÓN: /dashboard/team + /dashboard/inbox (asignación)
FUNCIONALIDAD:
- Múltiples asesores gestionan conversaciones simultáneamente
- Asignación automática (round-robin) o manual
- Estado del agente: Disponible / Ocupado / Ausente
- Cola de espera con orden de llegada
- Transferencia de conversación entre agentes
- Métricas por agente: tiempo respuesta, satisfacción, volumen

DEPARTAMENTOS:
- CRUD departamentos: nombre, descripción, agentes asignados
- Integración con el Channel Router: la IA clasifica la intención
  y rutea al departamento correcto
- Orden de cola por departamento
- Horarios por departamento (no todos atienden 24/7)

TABLA DB:
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    queue_order INTEGER DEFAULT 0,
    auto_assign BOOLEAN DEFAULT true,
    business_hours JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'agent',  -- 'lead', 'agent'
    UNIQUE(department_id, user_id)
);

-- Modificar tabla users:
ALTER TABLE users ADD COLUMN agent_status VARCHAR(20) DEFAULT 'available';
-- 'available', 'busy', 'away', 'offline'
ALTER TABLE users ADD COLUMN max_concurrent_chats INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN current_chat_count INTEGER DEFAULT 0;
```

### 2.2 Sistema Kanban

```
MÓDULO: Kanban Board
UBICACIÓN: /dashboard/kanban
FUNCIONALIDAD:
- Board visual tipo Trello por canal y por estado
- Columnas configurables por tenant: "Nuevo", "En conversación",
  "Cotización enviada", "Pago pendiente", "Cerrado", "Perdido"
- Drag & drop entre columnas (actualiza estado en DB)
- Filtros: por canal, agente, fecha, valor
- Vista por canal: un board para WhatsApp, otro para Instagram, etc.
- Cards muestran: nombre cliente, último mensaje, valor potencial,
  canal, agente asignado, tiempo en columna

TABLA DB:
CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366F1',
    sort_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,  -- Columnas finales no se procesan más
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Las conversaciones ya tienen un campo 'status'.
-- Agregar referencia a columna kanban:
ALTER TABLE conversations ADD COLUMN kanban_column_id UUID REFERENCES kanban_columns(id);
ALTER TABLE conversations ADD COLUMN potential_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE conversations ADD COLUMN kanban_moved_at TIMESTAMPTZ;
```

### 2.3 Campañas de Mensajes Masivos

```
MÓDULO: Campañas
UBICACIÓN: /dashboard/campaigns
FUNCIONALIDAD:

A) LISTAS DE CONTACTOS:
   - Importar CSV/Excel con contactos (nombre, teléfono, variables custom)
   - Crear listas manualmente
   - Listas dinámicas: "Todos los clientes que compraron en el último mes"
   - Tags para segmentación

B) CAMPAÑAS:
   Modal de creación:
   ┌─────────────────────────────────────────────┐
   │ Nombre de campaña: [________________]       │
   │ Lista de contactos: [Dropdown ▼]            │
   │ Conexión WhatsApp: [+57 300... ▼] [+ Agregar]│
   │                                              │
   │ ── Mensajes (hasta 5 variaciones) ──         │
   │ MSG 1: [Hola {{nombre}}, tenemos...]   [✓]  │
   │ MSG 2: [{{nombre}}, no te pierdas...]  [✓]  │
   │ MSG 3: [Última oportunidad {{nombre}}] [ ]   │
   │ MSG 4: [________________________]      [ ]   │
   │ MSG 5: [________________________]      [ ]   │
   │                                              │
   │ Variables: {{nombre}}, {{telefono}},          │
   │            {{variable1}}, {{variable2}}       │
   │                                              │
   │ 📎 Adjuntar archivo (imagen/PDF/video)       │
   │                                              │
   │ ── Programación ──                           │
   │ Fecha: [2026-05-15]  Hora: [09:00]           │
   │ Recurrencia: [Única ▼]                       │
   │   Opciones: Única, Diaria, Semanal,          │
   │   Quincenal, Mensual, Trimestral,            │
   │   Semestral, Anual                           │
   │                                              │
   │ ── API de envío ──                           │
   │ (●) Evolution API                            │
   │ ( ) API Oficial Meta                         │
   │                                              │
   │ [Cancelar]  [Programar campaña]              │
   └─────────────────────────────────────────────┘

C) GESTIÓN DE CONEXIONES:
   - Ver números WhatsApp conectados
   - Agregar nueva conexión (redirige a /channels/whatsapp)
   - Reiniciar conexión
   - Eliminar conexión
   - Editar configuración de conexión

D) EJECUCIÓN:
   - BullMQ job que ejecuta el envío
   - Rate limiting: 30 msg/min para evitar baneo
   - Selección aleatoria entre MSG 1-5 por contacto (A/B testing)
   - Resolución de variables personalizadas
   - Log de envío: enviado/fallido/leído por contacto
   - Pausa/reanudación de campaña en curso

TABLAS DB:
CREATE TABLE contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'static',  -- 'static', 'dynamic'
    filter_criteria JSONB,               -- Para listas dinámicas
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_list_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    variables JSONB DEFAULT '{}',  -- {"variable1": "valor", "variable2": "valor"}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    list_id UUID NOT NULL REFERENCES contact_lists(id),
    channel_session_id UUID REFERENCES channel_sessions(id),  -- Conexión WA a usar
    messages JSONB NOT NULL,          -- [{"text": "...", "media_url": "...", "active": true}]
    variables_schema JSONB,           -- Describe las variables disponibles
    media_url VARCHAR(500),
    media_type VARCHAR(20),
    scheduled_at TIMESTAMPTZ,
    recurrence VARCHAR(20) DEFAULT 'once',  -- 'once','daily','weekly','biweekly','monthly','quarterly','semiannual','annual'
    next_run_at TIMESTAMPTZ,
    api_provider VARCHAR(20) DEFAULT 'evolution',  -- 'evolution', 'meta_official'
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft','scheduled','running','paused','completed','cancelled'
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
    message_index INTEGER,            -- Qué variación de mensaje se envió (1-5)
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending','sent','delivered','read','failed'
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);
```

### 2.4 Grupos de WhatsApp

```
MÓDULO: Grupos WhatsApp
UBICACIÓN: /dashboard/groups
FUNCIONALIDAD:
- Listar grupos del número conectado (via Evolution API)
- Crear grupos nuevos
- Agregar/remover participantes
- Enviar mensajes a grupos
- Campañas a grupos (seleccionar grupos destino)
- Monitorear mensajes de grupos (opcional)

NOTA: Evolution API soporta grupos vía:
  POST /group/create/{instance}
  POST /group/updateParticipant/{instance}
  POST /message/sendText/{instance} → con number = groupJid@g.us
```

### 2.5 Integraciones externas

```
MÓDULO: Integraciones
UBICACIÓN: /dashboard/settings/integrations

Cada integración tiene: nombre, API key, URL, estado (activo/inactivo), toggle.

INTEGRACIONES SOPORTADAS:
┌────────────────────────────────────────────────────────┐
│ LLM Providers (seleccionar uno principal):             │
│ ├── OpenAI       │ API Key: [sk-...]         [✓ Activo]│
│ ├── Groq         │ API Key: [gsk-...]        [ ]       │
│ ├── OpenRouter   │ API Key: [or-...]         [ ]       │
│ └── Claude/Anthropic │ API Key: [sk-ant...]  [ ]       │
│                                                        │
│ Automatización:                                        │
│ ├── n8n          │ Webhook URL: [https://...] [ ]      │
│ ├── Typebot      │ URL: [https://...]        [ ]       │
│ └── Dify         │ API Key + URL             [ ]       │
│                                                        │
│ CRM/Soporte:                                           │
│ └── Chatwoot     │ URL + API Token           [ ]       │
└────────────────────────────────────────────────────────┘

TABLA DB:
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,   -- 'openai','groq','openrouter','anthropic','n8n','typebot','dify','chatwoot'
    category VARCHAR(20) NOT NULL,   -- 'llm','automation','crm'
    config JSONB NOT NULL,           -- {"api_key": "encrypted...", "base_url": "...", "model": "..."}
    is_active BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false, -- Para LLMs: cuál es el principal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);
```

---

## PARTE 3 — PANEL SUPERADMIN SaaS (/PanelSaas/)

### 3.1 Qué es

Un panel SEPARADO del dashboard de tenants. Es para el **operador del SaaS** — quien vende, crea cuentas, gestiona planes, y monitorea la infraestructura.

### 3.2 Estructura de carpetas

```
apps/web/src/app/
  └── (superadmin)/                    # Grupo de rutas SuperAdmin
      ├── layout.tsx                   # Layout propio con navbar SuperAdmin
      ├── page.tsx                     # Dashboard KPIs SaaS
      ├── tenants/
      │   ├── page.tsx                 # Lista de todos los tenants
      │   ├── [id]/page.tsx            # Detalle de tenant + acciones
      │   └── create/page.tsx          # Wizard crear tenant
      ├── plans/
      │   └── page.tsx                 # CRUD planes y límites
      ├── demos/
      │   └── page.tsx                 # Cuentas demo + conversión
      ├── resellers/
      │   └── page.tsx                 # Resellers + comisiones
      ├── billing/
      │   └── page.tsx                 # Facturación y cobros
      ├── monitor/
      │   └── page.tsx                 # Monitor VPS (CPU, RAM, Disco)
      ├── logs/
      │   └── page.tsx                 # Auditoría y logs
      └── settings/
          └── page.tsx                 # Config global del SaaS
```

### 3.3 Módulos del SuperAdmin

```
A) DASHBOARD SAAS (KPIs):
   - MRR (Monthly Recurring Revenue)
   - Total tenants activos / inactivos / suspendidos
   - Demos activas + próximas a vencer
   - Nuevos registros esta semana/mes
   - Churn rate
   - Uso de recursos (CPU, RAM, disco)
   - Top 5 tenants por volumen de mensajes
   - Ingresos por plan

B) GESTIÓN DE TENANTS:
   - Tabla con: nombre, plan, estado, MRR, mensajes/mes, fecha registro
   - Acciones rápidas: Suspender, Activar, Acceder como tenant (impersonate),
     Cambiar plan, Ver métricas, Eliminar
   - Wizard de creación: nombre → plan → credenciales → canales
   - Filtros: por plan, estado, fecha, reseller

C) PLANES:
   - CRUD de planes: nombre, precio, límites
   - Límites por plan:
     max_messages_month, max_conversations_month, max_agents,
     max_channels, max_products, max_campaigns_month,
     ai_enabled, ai_model_allowed, storage_mb,
     custom_domain, priority_support
   - Comparativa visual de planes

D) DEMOS:
   - Crear cuenta demo (plan trial con caducidad)
   - Caducidad automática: BullMQ job que revisa demos vencidas
   - Convertir demo a cliente pago (cambiar plan + agregar billing)
   - Extender demo
   - Métricas de conversión demo → pago

E) RESELLERS:
   - CRUD resellers: nombre, empresa, comisión (%), tenants referidos
   - Dashboard de comisiones por reseller
   - Link de referido con tracking
   - Pago de comisiones (manual o automático)

F) MONITOR VPS:
   - CPU usage % (gráfico tiempo real)
   - RAM usage % (gráfico tiempo real)
   - Disco usage % (barra)
   - Estado de servicios: PostgreSQL, Redis, Evolution API, API, Web
   - Último backup y próximo programado
   - Logs de errores recientes

   Implementación:
   - Endpoint Fastify: GET /api/superadmin/system/health
   - Lee métricas vía os module (Node.js) + docker stats
   - Redis para cachear métricas (TTL 10s)

G) LOGS Y AUDITORÍA:
   - Tabla de acciones administrativas (quién hizo qué cuándo)
   - Filtros por tipo de acción, tenant, fecha
   - Exportar a CSV

TABLAS DB SUPERADMIN:
CREATE TABLE saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price_cop DECIMAL(12,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    limits JSONB NOT NULL,  -- Todos los límites técnicos
    features JSONB DEFAULT '[]',  -- Lista de features para mostrar
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

-- Modificar tabla tenants para SaaS:
ALTER TABLE tenants ADD COLUMN plan_id UUID REFERENCES saas_plans(id);
ALTER TABLE tenants ADD COLUMN reseller_id UUID REFERENCES saas_resellers(id);
ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN demo_expires_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN mrr DECIMAL(12,2) DEFAULT 0;

CREATE TABLE saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),   -- 'tenant', 'plan', 'reseller'
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SuperAdmin users (separados de tenant users)
CREATE TABLE superadmin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',  -- 'superadmin', 'admin', 'support'
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## PARTE 4 — CORRECCIONES URGENTES (lo que está roto)

### 4.1 Canales — Botones de conexión no funcionan

```
PROBLEMA: Los 4 botones "Conectar WhatsApp/Instagram/Facebook/TikTok"
          son solo UI. No hay backend detrás.

SOLUCIÓN POR CANAL:

WhatsApp:
1. Al click "Conectar WhatsApp":
   a. Llamar POST /api/channels/whatsapp/connect
   b. El endpoint crea instancia en Evolution API: POST /instance/create
   c. Obtiene QR: GET /instance/connect/{instanceName}
   d. Abre modal con QR code (base64 → qrcode.react)
   e. SSE stream escucha CONNECTION_UPDATE de Evolution webhook
   f. Al conectar: modal muestra ✅ + número vinculado
   g. Guardar en channel_sessions

Instagram:
1. Al click "Conectar Instagram":
   a. Abre modal con campos: username, password, 2FA code (opcional)
   b. POST /api/channels/instagram/connect { username, password }
   c. El endpoint llama al Instagram Bridge: POST /sessions/create
   d. Si pide 2FA → mostrar campo adicional
   e. Si éxito → guardar sesión en channel_sessions
   f. Iniciar polling job

Facebook:
1. Al click "Conectar Facebook":
   a. Abre modal con instrucciones para exportar cookies
   b. Campo para pegar appState (JSON de cookies)
   c. POST /api/channels/facebook/connect { appState }
   d. El endpoint inicializa fca-unofficial con las cookies
   e. Guardar appState en channel_sessions

TikTok:
1. Al click "Conectar TikTok":
   a. Abre modal con instrucciones para exportar cookies del navegador
   b. Campo para pegar cookies JSON
   c. POST /api/channels/tiktok/connect { cookies }
   d. Iniciar scraper job
```

### 4.2 Config IA — Base de conocimiento no funciona

```
PROBLEMA: Muestra "0 entradas" y el botón "Agregar" no abre nada.

SOLUCIÓN:
1. Implementar CRUD completo ai_knowledge_entries
2. Modal "Agregar entrada":
   - Campo: Pregunta / Trigger
   - Campo: Respuesta
   - Campo: Categoría (dropdown: Precios, Servicios, Horarios, Políticas, Otro)
   - Campo: Keywords (tags)
3. Generar embedding al guardar (OpenAI embeddings API)
4. Sección "Preguntas sin respuesta":
   - Lista de ai_unanswered_queries
   - Botón "Resolver" → abre modal pre-llenado para crear entrada KB
   - Botón "Ignorar" → marca como ignorada
```

### 4.3 Ajustes — Falta el 80% de la página

```
PROBLEMA: Solo tiene nombre, vertical texto libre, zona horaria, modelo, temperatura, tokens.

SOLUCIÓN: Implementar TODAS las secciones del mockup HTML adjunto:
1. Info negocio extendida (teléfono, dirección, descripción, logo, web)
2. Selector actividad económica + toggles de capacidades
3. Horarios de atención (grid lun-dom)
4. Pagos Wompi (keys, modo, webhook URL)
5. Agente IA ampliado (nombre, tono, historial, escalamiento)
6. Base de conocimiento (FAQs + preguntas sin respuesta)
7. Notificaciones (toggles + email/WhatsApp)
8. Apariencia (toggle tema)
```

---

## PARTE 5 — FASES DE IMPLEMENTACIÓN ACTUALIZADAS

### Fase 1: Corregir lo roto (2-3 días)
1. Implementar conexión real de WhatsApp via Evolution API
2. Implementar conexión Instagram via bridge
3. Implementar conexión Facebook via fca-unofficial
4. Implementar conexión TikTok via scraper
5. CRUD real de Base de Conocimiento
6. **Checkpoint:** Los 4 canales se conectan y reciben/envían mensajes

### Fase 2: Completar Ajustes (2 días)
1. Todas las secciones del mockup HTML
2. Endpoints CRUD para cada sección
3. getConfig() funcional con cache Redis
4. **Checkpoint:** Página de Ajustes completa y guardando en DB

### Fase 3: AI Action Engine (3-4 días)
1. Flujo completo: mensaje → contexto → prompt → LLM → parser → procesador
2. Procesadores por acción (citas, pedidos, catálogo, pagos, etc.)
3. Scheduling engine
4. **Checkpoint:** IA responde y ejecuta acciones en los 4 canales

### Fase 4: Multiagente + Departamentos (2 días)
1. CRUD departamentos
2. Asignación automática round-robin
3. Estados de agente (disponible/ocupado/ausente)
4. Transferencia entre agentes
5. **Checkpoint:** Múltiples agentes atienden simultáneamente

### Fase 5: Kanban (2 días)
1. Columnas configurables por tenant
2. Drag & drop con actualización en DB
3. Filtros por canal, agente, valor
4. **Checkpoint:** Board Kanban funcional con datos reales

### Fase 6: Campañas Masivas (3-4 días)
1. CRUD listas de contactos (importar CSV, crear manual)
2. Modal de creación de campaña (5 mensajes, variables, programación)
3. BullMQ job de envío con rate limiting
4. Logs de envío por contacto
5. Recurrencia automática
6. **Checkpoint:** Enviar campaña masiva con variables y programación

### Fase 7: Grupos WhatsApp (1-2 días)
1. Listar grupos via Evolution API
2. Enviar mensajes a grupos
3. Campañas a grupos
4. **Checkpoint:** Gestionar y enviar a grupos

### Fase 8: Integraciones (2 días)
1. Página de integraciones con CRUD por provider
2. Adaptador LLM que lee integración activa
3. Webhooks para n8n/Typebot
4. **Checkpoint:** Cambiar proveedor LLM desde el dashboard

### Fase 9: Panel SuperAdmin (4-5 días)
1. Layout y auth separada
2. Dashboard KPIs SaaS (MRR, tenants, demos)
3. CRUD tenants con acciones rápidas
4. CRUD planes con límites
5. Módulo demos (caducidad BullMQ)
6. Módulo resellers
7. Monitor VPS
8. Logs y auditoría
9. **Checkpoint:** SuperAdmin completamente funcional

### Fase 10: Diseño Premium (3 días)
1. Aplicar Design System "Obsidian Glass" a TODAS las páginas
2. Glassmorphism, gradientes, animaciones Framer Motion
3. Responsive mobile
4. **Checkpoint:** Cada página se ve espectacular

### Fase 11: Testing + Producción (2-3 días)
1. Tests unitarios e integración
2. Dockerfiles optimizados
3. CI/CD
4. Documentación
5. **Checkpoint:** Listo para producción

---

## PARTE 6 — INSTRUCCIONES PARA CLAUDE CODE

Entregar estos documentos a Claude Code en este orden:

```
1. PROMPT_MAESTRO_v5_DEFINITIVO.md        → Arquitectura base
2. PARCHE_v5.1_ACTIVIDADES_ECONOMICAS.md  → Sistema de capacidades
3. DESIGN_SYSTEM_PREMIUM.md               → Diseño visual
4. DIAGNOSTICO_PLAN_ACCION_v6.md          → Este documento (qué falta y módulos nuevos)
5. ajustes_chatguire_completo.html        → Mockup real de la página de Ajustes
```

Decirle: **"Lee los 5 documentos en orden. El documento 4 tiene prioridad sobre los anteriores donde haya conflicto. Ejecuta Fase 1: Corregir lo roto."**
