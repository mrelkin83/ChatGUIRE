# ChatGÜIRE — Plan de Corrección Crítica al 100%

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir todos los bugs críticos (template strings rotos, endpoints faltantes, Docker networking, analytics) para llevar el proyecto del 78% al 100% funcional.

**Architecture:** Fixes mínimos invasivos en frontend (corregir URLs), backend (agregar endpoints faltantes), Docker (variables de entorno) y migraciones (RLS). Sin reescrituras.

**Tech Stack:** Next.js 14, Fastify, Drizzle ORM, PostgreSQL, Docker, Tailwind.

---

## Chunk 1: Template Strings Rotos en Dashboard (Frontend)

**Problema:** 4 páginas usan comillas dobles `"${API_BASE}"` en lugar de backticks `` `${API_BASE}` ``, rompiendo las URLs.

**Archivos afectados:**
- `apps/web/src/app/dashboard/campaigns/page.tsx` (líneas 63, 88, 108, 192)
- `apps/web/src/app/dashboard/kanban/page.tsx` (líneas 45, 70)
- `apps/web/src/app/dashboard/ai-config/page.tsx` (línea 35)
- `apps/web/src/app/dashboard/team/page.tsx` (líneas 61, 86)

---

### Task 1.1: Campaigns Page

**Files:**
- Modify: `apps/web/src/app/dashboard/campaigns/page.tsx`

- [ ] **Step 1: Corregir línea 63**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/tenants")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/tenants`)
```

- [ ] **Step 2: Corregir línea 88**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/contact-lists")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/contact-lists`)
```

- [ ] **Step 3: Corregir línea 108**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/campaigns")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/campaigns`)
```

- [ ] **Step 4: Corregir línea 192**

```tsx
// ANTES (roto):
window.open("${API_BASE}/api/contact-lists/template", "_blank")

// DESPUÉS (fix):
window.open(`${API_BASE}/api/contact-lists/template`, "_blank")
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/campaigns/page.tsx
git commit -m "fix: corrige template strings rotos en campaigns"
```

---

### Task 1.2: Kanban Page

**Files:**
- Modify: `apps/web/src/app/dashboard/kanban/page.tsx`

- [ ] **Step 1: Corregir línea 45**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/tenants")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/tenants`)
```

- [ ] **Step 2: Corregir línea 70**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/kanban/columns")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/kanban/columns`)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/kanban/page.tsx
git commit -m "fix: corrige template strings rotos en kanban"
```

---

### Task 1.3: AI Config Page

**Files:**
- Modify: `apps/web/src/app/dashboard/ai-config/page.tsx`

- [ ] **Step 1: Corregir línea 35**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/tenants")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/tenants`)
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/ai-config/page.tsx
git commit -m "fix: corrige template strings rotos en ai-config"
```

---

### Task 1.4: Team Page

**Files:**
- Modify: `apps/web/src/app/dashboard/team/page.tsx`

- [ ] **Step 1: Corregir línea 61**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/tenants")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/tenants`)
```

- [ ] **Step 2: Corregir línea 86**

```tsx
// ANTES (roto):
fetch("${API_BASE}/api/departments")

// DESPUÉS (fix):
fetch(`${API_BASE}/api/departments`)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/team/page.tsx
git commit -m "fix: corrige template strings rotos en team"
```

---

## Chunk 2: Endpoints Faltantes (Backend)

**Problema:** El frontend llama endpoints que no existen en el backend.

---

### Task 2.1: Tenant Config (GET + PUT)

**Archivo:** `apps/api/src/modules/api/api.routes.ts`

**Contexto:** El endpoint `/api/tenant-config/:tenantId` YA EXISTE en `api.routes.ts`. Se debe agregar un alias más corto `/api/tenants/:tenantId/config` que redirija o reutilice la misma lógica.

- [ ] **Step 1: Localizar el endpoint existente**

Buscar en `apps/api/src/modules/api/api.routes.ts`:
```ts
server.get('/tenant-config/:tenantId', ...)
server.put('/tenant-config/:tenantId', ...)
```

- [ ] **Step 2: Agregar alias para el frontend**

```ts
// Alias para compatibilidad con frontend
server.get('/tenants/:tenantId/config', async (request, reply) => {
  const { tenantId } = request.params as { tenantId: string };
  const [config] = await db.select().from(tenantConfig)
    .where(eq(tenantConfig.tenantId, tenantId));
  return config || {};
});

server.put('/tenants/:tenantId/config', async (request, reply) => {
  const { tenantId } = request.params as { tenantId: string };
  const data = request.body as any;
  const [existing] = await db.select().from(tenantConfig)
    .where(eq(tenantConfig.tenantId, tenantId));
  
  if (existing) {
    const [updated] = await db.update(tenantConfig)
      .set({ value: data, updatedAt: new Date() })
      .where(eq(tenantConfig.tenantId, tenantId))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(tenantConfig)
      .values({ tenantId, key: 'general', value: data })
      .returning();
    return created;
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/api/api.routes.ts
git commit -m "feat: agrega alias /tenants/:tenantId/config para compatibilidad frontend"
```

---

### Task 2.2: Transactions/Payments History

**Archivo:** `apps/api/src/modules/api/api.routes.ts`

- [ ] **Step 1: Agregar endpoint GET /api/transactions/:tenantId**

```ts
server.get('/transactions/:tenantId', async (request, reply) => {
  const { tenantId } = request.params as { tenantId: string };
  try {
    const data = await db.select().from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt));
    return data;
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
```

- [ ] **Step 2: Verificar import de `payments` y `desc`**

Asegurar que `payments` está importado desde `@saas/db` y `desc` desde `drizzle-orm`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/api/api.routes.ts
git commit -m "feat: agrega GET /api/transactions/:tenantId para historial de pagos"
```

---

### Task 2.3: Knowledge Base PUT (Editar)

**Archivo:** `apps/api/src/modules/ai/knowledge/knowledge.routes.ts`

- [ ] **Step 1: Localizar archivo y agregar endpoint PUT**

```ts
server.put('/ai/knowledge/:tenantId/:knowledgeId', async (request, reply) => {
  const { tenantId, knowledgeId } = request.params as { tenantId: string; knowledgeId: string };
  const data = request.body as any;
  try {
    const [updated] = await db.update(aiKnowledge)
      .set({ 
        question: data.question,
        answer: data.answer,
        category: data.category,
        keywords: data.keywords,
        updatedAt: new Date()
      })
      .where(and(
        eq(aiKnowledge.id, knowledgeId),
        eq(aiKnowledge.tenantId, tenantId)
      ))
      .returning();
    return updated;
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
```

- [ ] **Step 2: Verificar import de `and`**

```ts
import { eq, desc, and } from 'drizzle-orm';
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/ai/knowledge/knowledge.routes.ts
git commit -m "feat: agrega PUT /ai/knowledge/:tenantId/:knowledgeId para editar knowledge"
```

---

### Task 2.4: Bot Menus Endpoint Consistente

**Archivo:** `apps/web/src/app/dashboard/bot-config/page.tsx`

**Nota:** El backend YA tiene `GET /api/bot-menus?tenantId=xxx`. Solo hay que corregir el frontend.

- [ ] **Step 1: Localizar la llamada incorrecta**

Buscar en `bot-config/page.tsx`:
```tsx
fetch(`${API_BASE}/api/bot-menus/${tenantId}`)
```

- [ ] **Step 2: Corregir a query param**

```tsx
fetch(`${API_BASE}/api/bot-menus?tenantId=${tenantId}`)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/bot-config/page.tsx
git commit -m "fix: corrige endpoint de bot-menus a query param"
```

---

## Chunk 3: Docker Networking

**Problema:** El backend dentro del contenedor `api` no puede comunicarse con Evolution ni WAHA porque usa `localhost`.

---

### Task 3.1: docker-compose.yml — Variables de entorno

**Archivo:** `docker-compose.yml`

- [ ] **Step 1: Agregar variables al servicio `api`**

```yaml
  api:
    # ... existing config ...
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-postgres}:${DB_PASS:-postgres}@postgres:5432/${DB_NAME:-saas_omnichannel}
      - EVOLUTION_API_URL=http://evolution-api:8080
      - WAHA_API_URL=http://waha:3000
    # ... rest of config ...
```

- [ ] **Step 2: Agregar variables al servicio `web`**

```yaml
  web:
    # ... existing config ...
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
    # ... rest of config ...
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "fix: agrega variables de networking interno a docker-compose"
```

---

### Task 3.2: Backend — Usar variables de entorno para URLs

**Archivo:** `apps/api/src/lib/evolution-api.client.ts`

- [ ] **Step 1: Corregir URL base**

```ts
// ANTES:
const baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';

// DESPUÉS (ya está así probablemente, verificar):
const baseUrl = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
```

**Archivo:** `apps/api/src/lib/waha-api.client.ts`

- [ ] **Step 2: Corregir URL base**

```ts
// ANTES:
const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3100';

// DESPUÉS:
const baseUrl = process.env.WAHA_API_URL || 'http://waha:3000';
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/evolution-api.client.ts apps/api/src/lib/waha-api.client.ts
git commit -m "fix: actualiza URLs por defecto de evolution y waha para docker network"
```

---

## Chunk 4: Analytics (Conectar a datos reales)

**Problema:** La página de analytics está 100% hardcodeada.

---

### Task 4.1: Backend — Endpoint de Analytics

**Archivo:** `apps/api/src/modules/api/api.routes.ts`

- [ ] **Step 1: Agregar endpoint GET /api/analytics/:tenantId**

```ts
server.get('/analytics/:tenantId', async (request, reply) => {
  const { tenantId } = request.params as { tenantId: string };
  try {
    const daily = await db.select().from(analyticsDaily)
      .where(eq(analyticsDaily.tenantId, tenantId))
      .orderBy(desc(analyticsDaily.date))
      .limit(30);
    
    const totals = await db.select({
      totalConversations: sql<number>`COALESCE(SUM(${analyticsDaily.conversations}), 0)`,
      totalMessages: sql<number>`COALESCE(SUM(${analyticsDaily.messages}), 0)`,
      totalOrders: sql<number>`COALESCE(SUM(${analyticsDaily.orders}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${analyticsDaily.revenue}), 0)`,
    }).from(analyticsDaily)
      .where(eq(analyticsDaily.tenantId, tenantId));
    
    return { daily, totals: totals[0] };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
```

- [ ] **Step 2: Verificar imports**

```ts
import { analyticsDaily } from '@saas/db';
import { eq, desc, sql } from 'drizzle-orm';
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/api/api.routes.ts
git commit -m "feat: agrega GET /api/analytics/:tenantId con métricas agregadas"
```

---

### Task 4.2: Frontend — Conectar Analytics a API real

**Archivo:** `apps/web/src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Reemplazar datos hardcodeados por fetch real**

```tsx
"use client";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantId = localStorage.getItem("tenant_id") || "";
    fetch(`${API_BASE}/api/analytics/${tenantId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analytics</h1>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs text-[#8b8b9e]">Conversaciones</p>
          <p className="text-xl font-bold">{data?.totals?.totalConversations ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[#8b8b9e]">Mensajes</p>
          <p className="text-xl font-bold">{data?.totals?.totalMessages ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[#8b8b9e]">Pedidos</p>
          <p className="text-xl font-bold">{data?.totals?.totalOrders ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[#8b8b9e]">Ingresos</p>
          <p className="text-xl font-bold">${(data?.totals?.totalRevenue ?? 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/analytics/page.tsx
git commit -m "feat: conecta analytics a endpoint real con datos agregados"
```

---

## Chunk 5: Unificación /admin y /PanelSaas

**Problema:** Hay dos paneles superadmin duplicados.

---

### Task 5.1: Redireccionar /admin a /PanelSaas

**Archivo:** `apps/web/src/app/admin/page.tsx`

- [ ] **Step 1: Reemplazar página de login admin por redirect**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas");
  }, [router]);
  return null;
}
```

- [ ] **Step 2: Hacer lo mismo para todas las subpáginas de /admin**

Crear/actualizar:
- `apps/web/src/app/admin/dashboard/page.tsx`
- `apps/web/src/app/admin/tenants/page.tsx`
- `apps/web/src/app/admin/plans/page.tsx`
- `apps/web/src/app/admin/resellers/page.tsx`
- `apps/web/src/app/admin/monitor/page.tsx`
- `apps/web/src/app/admin/logs/page.tsx`

Cada una debe hacer `router.replace("/PanelSaas")` o `router.replace("/PanelSaas/tenants")` etc.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/
git commit -m "refactor: redirige /admin a /PanelSaas para eliminar duplicación"
```

---

## Chunk 6: Validación Final

---

### Task 6.1: Build Local

- [ ] **Step 1: Ejecutar build del frontend**

```bash
cd apps/web
pnpm build
```

**Expected:** Build exitoso sin errores de webpack.

- [ ] **Step 2: Ejecutar build del backend**

```bash
cd apps/api
pnpm build
```

**Expected:** Build exitoso con tsup.

---

### Task 6.2: Docker Build

- [ ] **Step 1: Build de imágenes**

```bash
docker compose build
```

**Expected:** Build exitoso para `api` y `web`.

- [ ] **Step 2: Levantar servicios**

```bash
docker compose up -d
```

- [ ] **Step 3: Verificar healthchecks**

```bash
docker compose ps
```

**Expected:** Todos los servicios en estado `healthy` o `Up`.

---

### Task 6.3: Pruebas Manuales

- [ ] **Step 1: Login SuperAdmin**

URL: `http://localhost:3000/PanelSaas/login`
**Expected:** Login exitoso, redirección a `/PanelSaas`.

- [ ] **Step 2: Crear Tenant**

URL: `http://localhost:3000/PanelSaas/tenants`
**Expected:** Formulario abre, crear tenant con nombre "Test", aparece en la lista.

- [ ] **Step 3: Dashboard principal**

URL: `http://localhost:3000/dashboard`
**Expected:** Datos del tenant cargan sin errores 404.

- [ ] **Step 4: Campaigns**

URL: `http://localhost:3000/dashboard/campaigns`
**Expected:** Lista de tenants carga, crear campaña funciona.

- [ ] **Step 5: Kanban**

URL: `http://localhost:3000/dashboard/kanban`
**Expected:** Columnas cargan, drag & drop funciona.

- [ ] **Step 6: Analytics**

URL: `http://localhost:3000/dashboard/analytics`
**Expected:** Muestra datos reales (0 si no hay actividad).

---

### Task 6.4: Push y Deploy

- [ ] **Step 1: Push al repo**

```bash
git push origin main
```

- [ ] **Step 2: Deploy en VPS**

```bash
cd /opt/chatguire
git pull origin main
docker compose up -d --build
```

- [ ] **Step 3: Verificar en producción**

URL: `https://shopyhit.com/PanelSaas`
**Expected:** Todo funciona igual que en local.

---

## RESUMEN DE ARCHIVOS A TOCAR

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/app/dashboard/campaigns/page.tsx` | Fix 4 template strings |
| `apps/web/src/app/dashboard/kanban/page.tsx` | Fix 2 template strings |
| `apps/web/src/app/dashboard/ai-config/page.tsx` | Fix 1 template string |
| `apps/web/src/app/dashboard/team/page.tsx` | Fix 2 template strings |
| `apps/web/src/app/dashboard/bot-config/page.tsx` | Fix endpoint URL |
| `apps/web/src/app/dashboard/analytics/page.tsx` | Reemplazar por datos reales |
| `apps/web/src/app/admin/*/page.tsx` | Redirigir a /PanelSaas |
| `apps/api/src/modules/api/api.routes.ts` | Agregar 3 endpoints |
| `apps/api/src/modules/ai/knowledge/knowledge.routes.ts` | Agregar PUT endpoint |
| `apps/api/src/lib/evolution-api.client.ts` | Corregir URL por defecto |
| `apps/api/src/lib/waha-api.client.ts` | Corregir URL por defecto |
| `docker-compose.yml` | Agregar env vars |

**Tiempo estimado total:** 3-4 horas de trabajo.
**Commits esperados:** 10-12 commits.
