# 🤖 ChatGÜIRE — SaaS Omnicanal con IA

> **Plataforma todo-en-uno** para gestionar conversaciones de clientes vía WhatsApp, Instagram, Facebook Messenger y TikTok, potenciada por inteligencia artificial. Diseñada para negocios que quieren automatizar atención, ventas y citas sin perder el toque humano.

[![Build](https://img.shields.io/badge/build-passing-22c55e)](https://github.com/mrelkin83/ChatG-IRE)
[![Tests](https://img.shields.io/badge/tests-19%2F19-22c55e)](https://github.com/mrelkin83/ChatG-IRE)
[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.26.2-000000)](https://fastify.dev)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F)](https://orm.drizzle.team)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://docker.com)

---

## ✨ Características Principales

| Módulo | Descripción |
|--------|-------------|
| 💬 **Inbox Omnicanal** | WhatsApp (Evolution API + WAHA dual engine), Instagram, Facebook Messenger, TikTok en un solo panel |
| 🤖 **IA Conversacional** | Motor de IA con OpenAI / Anthropic, embeddings, knowledge base, respuestas automáticas y detección de intenciones |
| 📊 **Analytics Real** | Métricas de conversaciones, mensajes, pedidos, ingresos y rendimiento por canal |
| 📦 **Catálogo & Pedidos** | Gestión de productos, carrito, órdenes y pagos integrados con Wompi |
| 📅 **Citas & Agenda** | Reserva de citas automatizada por IA con gestión de disponibilidad |
| 📢 **Campañas** | Envío masivo de mensajes con listas de contactos y plantillas |
| 🎯 **Kanban** | Pipeline visual de leads/oportunidades con drag & drop |
| ⚙️ **Configuración de Bot** | Menús interactivos, flujos conversacionales, horarios y respuestas fuera de horario |
| 👥 **Equipos** | Departamentos, agentes humanos, asignación de conversaciones |
| 🏢 **Multi-tenant SaaS** | Gestión de tenants, planes, resellers y facturación |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        MONOREPO                             │
│                  Turborepo + pnpm workspaces                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   apps/web      │   apps/api      │   apps/instagram-bridge │
│   Next.js 14    │   Fastify 4     │   Python / FastAPI      │
│   React 18      │   TypeScript    │                         │
│   Tailwind CSS  │   Drizzle ORM   │                         │
│   App Router    │   BullMQ        │                         │
│                 │   Redis         │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│  packages/db          │  packages/shared                     │
│  Drizzle ORM + pg     │  Zod schemas + utilities             │
│  PostgreSQL + pgvector│                                      │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐      ┌────────────┐
   │ PostgreSQL│      │    Redis     │      │   Docker   │
   │  (pgvector)│      │   BullMQ     │      │  Compose   │
   └──────────┘      └──────────────┘      └────────────┘
```

---

## 📁 Estructura del Proyecto

```
ChatG-IRE/
├── apps/
│   ├── api/                    # Backend Fastify
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── ai/         # Motor IA, embeddings, scheduling
│   │   │   │   ├── api/        # Rutas REST (dashboard, tenants, products, etc.)
│   │   │   │   ├── channels/   # Drivers de canales (WAHA, Evolution, IG, FB, TikTok)
│   │   │   │   └── webhooks/   # Webhooks de Evolution, WAHA, Wompi
│   │   │   ├── lib/            # Clientes API, logger, redis
│   │   │   └── server.ts       # Entry point
│   │   └── Dockerfile
│   │
│   ├── web/                    # Frontend Next.js
│   │   ├── src/app/
│   │   │   ├── PanelSaas/      # Panel superadmin (tenants, planes, resellers)
│   │   │   ├── dashboard/      # Panel del negocio (inbox, analytics, campañas, etc.)
│   │   │   └── admin/          # Redirecciones a PanelSaas (legacy)
│   │   ├── src/components/     # Componentes UI reutilizables
│   │   └── Dockerfile
│   │
│   └── instagram-bridge/       # Microservicio Python para Instagram
│       ├── main.py
│       └── requirements.txt
│
├── packages/
│   ├── db/                     # Esquema Drizzle ORM + migraciones
│   │   ├── src/schema/         # 15+ tablas (tenants, products, orders, messages...)
│   │   └── migrations/         # Migraciones SQL generadas
│   └── shared/                 # Utilidades compartidas (Zod, dayjs)
│
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.web
│
├── docker-compose.yml          # 6 servicios: postgres, redis, api, web, evolution, waha
├── turbo.json                  # Pipeline de build con caching
├── pnpm-workspace.yaml
└── package.json                # Scripts del monorepo
```

---

## 🚀 Requisitos Previos

- **Node.js** 20+
- **pnpm** 10+
- **Docker** + Docker Compose (para despliegue completo)
- **PostgreSQL** 16+ con extensión `pgvector` (si se corre sin Docker)
- **Redis** 7+ (si se corre sin Docker)

---

## 🛠️ Instalación Local

### 1. Clonar e instalar

```bash
git clone https://github.com/mrelkin83/ChatG-IRE.git
cd ChatG-IRE
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus claves reales
```

**Variables obligatorias:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/saas_omnichannel` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Clave secreta para JWT (mín. 32 chars) | `super-secret-key-...` |
| `OPENAI_API_KEY` | API key de OpenAI | `sk-...` |
| `API_BASE_URL` | URL pública del backend | `http://localhost:3001` |
| `WEB_BASE_URL` | URL pública del frontend | `http://localhost:3000` |

**Variables opcionales (integraciones):**

| Variable | Descripción |
|----------|-------------|
| `EVOLUTION_API_GLOBAL_KEY` | API key global de Evolution API |
| `WOMPI_SANDBOX_PUBLIC_KEY` | Public key de Wompi (sandbox) |
| `WOMPI_SANDBOX_PRIVATE_KEY` | Private key de Wompi (sandbox) |

### 3. Base de datos

```bash
# Crear base de datos
createdb saas_omnichannel

# Aplicar migraciones
pnpm db:migrate

# (Opcional) Sembrar datos de demo
pnpm db:seed
```

### 4. Iniciar en desarrollo

```bash
# Todos los servicios (backend + frontend + db jobs)
pnpm dev

# O por separado:
pnpm --filter @saas/api dev     # Backend en :3001
pnpm --filter @saas/web dev     # Frontend en :3000
```

---

## 🐳 Docker (Recomendado para Producción)

Levanta toda la stack con un solo comando:

```bash
docker compose up -d --build
```

**Servicios levantados:**

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `web` | `3000` | Next.js frontend |
| `api` | `3001` | Fastify backend |
| `postgres` | `5432` | PostgreSQL con pgvector |
| `redis` | `6379` | Redis para caché y colas |
| `evolution-api` | `8080` | WhatsApp Evolution API |
| `waha` | `3100` | WhatsApp WAHA (dual engine) |

**Aplicar migraciones dentro del contenedor:**

```bash
docker compose exec api pnpm db:migrate
```

**Ver logs:**

```bash
docker compose logs -f api
docker compose logs -f web
```

---

## 📜 Scripts del Monorepo

```bash
# Build completo (frontend + backend + packages)
pnpm build

# Desarrollo (concurrente)
pnpm dev

# Lint en todo el proyecto
pnpm lint

# Formatear código
pnpm format

# Base de datos
pnpm db:generate    # Generar migraciones
pnpm db:migrate     # Aplicar migraciones
pnpm db:seed        # Sembrar datos demo
pnpm db:studio      # Drizzle Studio (UI)

# Tests
pnpm --filter @saas/api test
```

---

## 🔌 API Endpoints Principales

### Dashboard Tenant
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats/:tenantId` | KPIs del dashboard |
| `GET` | `/api/conversations/:tenantId` | Lista de conversaciones |
| `GET` | `/api/products/:tenantId` | Catálogo de productos |
| `GET` | `/api/orders/:tenantId` | Historial de pedidos |
| `GET` | `/api/analytics/:tenantId` | Métricas reales por canal |

### IA
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/ai/config/:tenantId` | Configuración del bot |
| `PUT` | `/api/ai/config/:tenantId` | Actualizar config |
| `GET` | `/api/ai/knowledge/:tenantId` | Base de conocimiento |
| `POST` | `/api/ai/knowledge/:tenantId` | Crear entrada |
| `PUT` | `/api/ai/knowledge/:tenantId/:id` | Editar entrada |
| `DELETE` | `/api/ai/knowledge/:tenantId/:id` | Eliminar entrada |

### Superadmin (SaaS)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/superadmin/login` | Auth superadmin |
| `GET` | `/api/superadmin/dashboard` | Stats globales |
| `GET` | `/api/superadmin/tenants` | Lista de tenants |
| `GET` | `/api/superadmin/plans` | Planes de suscripción |
| `GET` | `/api/superadmin/resellers` | Distribuidores |

### Webhooks
| Método | Endpoint | Origen |
|--------|----------|--------|
| `POST` | `/api/webhooks/evolution` | Evolution API (WhatsApp) |
| `POST` | `/api/webhooks/waha` | WAHA (WhatsApp) |
| `POST` | `/api/webhooks/wompi` | Pasarela Wompi |

---

## 🧪 Tests

```bash
# Todos los tests del backend
pnpm --filter @saas/api test

# Con watch mode
pnpm --filter @saas/api test -- --watch
```

**Cobertura actual:** 4 suites, 19 tests ✅

---

## 🎨 Design System

- **Tema:** Obsidian Glass (dark mode nativo)
- **Colores primarios:** Ámbar (`#f59e0b`) + Púrpura (`#8b5cf6`)
- **Efectos:** Glassmorphism, gradientes sutiles, animaciones con Framer Motion
- **Tipografía:** Sistema de fuentes variables con `--font-display`

---

## 📦 Deployment

### ¿Qué se instala automáticamente?

| Componente | ¿Auto? | Método |
|------------|--------|--------|
| Node.js 20 | ✅ Sí | Incluido en imagen `node:20-alpine` |
| pnpm | ✅ Sí | Vía `corepack enable` en Docker |
| `node_modules` (todas las deps) | ✅ Sí | `pnpm install --frozen-lockfile` en build |
| PostgreSQL 16 + pgvector | ✅ Sí | Servicio `postgres` en `docker-compose.yml` |
| Redis 7 | ✅ Sí | Servicio `redis` en `docker-compose.yml` |
| WhatsApp (Evolution API) | ✅ Sí | Servicio `evolution-api` en Docker |
| WhatsApp (WAHA) | ✅ Sí | Servicio `waha` en Docker |
| Base de datos (migraciones) | ✅ Sí | Comando `db:migrate` post-build |
| Docker Engine | ⚠️ Pre-requisito | Instalar antes en el host |
| Nginx + SSL | ✅ Sí | Solo con `install-vps.sh` |
| Firewall (UFW) | ✅ Sí | Solo con `install-vps.sh` |

> **Nota importante:** No necesitas ejecutar `pnpm install` manualmente en el servidor. Los Dockerfiles ya lo hacen automáticamente durante el build de las imágenes.

---

### Opción A: VPS nuevo — Instalación completa automática (Recomendado)

Usa el script `install-vps.sh` incluido en el repo. **Un solo comando** instala todo: Docker, Nginx, SSL, base de datos, migraciones, SuperAdmin y firewall.

```bash
# 1. Clonar el repositorio
git clone https://github.com/mrelkin83/ChatG-IRE.git /opt/chatguire
cd /opt/chatguire

# 2. Ejecutar el instalador como root
sudo bash install-vps.sh
```

El script te hará preguntas interactivas (dominio, contraseñas, SSL) y luego:
- Instala Docker, Nginx, Certbot
- Genera el archivo `.env` con contraseñas aleatorias
- Construye las imágenes Docker (incluye `pnpm install` automático)
- Levanta PostgreSQL y Redis
- Ejecuta migraciones de Drizzle
- Crea el usuario SuperAdmin
- Configura Nginx como reverse proxy
- Obtiene certificados SSL de Let's Encrypt
- Configura el firewall UFW

**Al finalizar verás un resumen completo con URLs y credenciales.**

---

### Opción B: VPS con Docker ya instalado

Si tu servidor ya tiene Docker y Docker Compose:

```bash
# 1. Clonar o actualizar
cd /opt/chatguire
git pull origin main

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu editor favorito

# 3. Construir y levantar (instala deps automáticamente)
docker compose up -d --build

# 4. Ejecutar migraciones
docker compose exec api pnpm --filter @saas/db db:migrate

# 5. Verificar estado
docker compose ps
curl http://localhost:3001/health
```

**Lo que sucede automáticamente en el paso 3:**
1. Docker descarga la imagen base `node:20-alpine`
2. Activa `corepack` para obtener pnpm
3. Ejecuta `pnpm install --frozen-lockfile` (instala TODAS las dependencias del monorepo)
4. Compila la API con `tsup` (formato CJS + ESM)
5. Compila el frontend con `next build`
6. Copia solo los artefactos necesarios a la imagen final (runner)

---

### Opción C: Sin Docker (desarrollo local)

Para desarrollo en tu máquina local:

```bash
# 1. Instalar dependencias manualmente
pnpm install

# 2. Base de datos local
createdb saas_omnichannel

# 3. Migraciones
pnpm db:migrate

# 4. Build
pnpm build

# 5. Iniciar servicios
pnpm dev
```

En este modo **tú ejecutas cada paso manualmente**, incluyendo la instalación de PostgreSQL y Redis en tu sistema operativo.

---

### Variables de entorno para producción

Configura estas variables en tu archivo `.env` antes del build:

```env
NODE_ENV=production
API_BASE_URL=https://tu-dominio.com
WEB_BASE_URL=https://tu-dominio.com
API_PORT=3001
WEB_PORT=3000

# Base de datos
DATABASE_URL=postgresql://user:pass@postgres:5432/chatguire_db
REDIS_URL=redis://redis:6379

# Seguridad
JWT_SECRET=super-secret-key-minimo-32-caracteres
ENCRYPTION_KEY=tu-clave-de-32-bytes-para-aes

# Integraciones WhatsApp
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_GLOBAL_KEY=tu-api-key-evolution

WAHA_API_URL=http://waha:3000
WAHA_ENGINE=WEBJS

# Pagos (opcional)
WOMPI_SANDBOX_PUBLIC_KEY=pub_test_...
WOMPI_SANDBOX_PRIVATE_KEY=prv_test_...

# IA (requerido)
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

---

## 📸 Screenshots

> Las capturas de pantalla del proyecto se encuentran en la carpeta [`/parche/`](./parche/).

---

## 📄 Licencia

MIT © 2025 — ChatGÜIRE

---

## 🙋 Soporte

¿Preguntas o problemas? Abre un [issue](https://github.com/mrelkin83/ChatG-IRE/issues) en GitHub.

**Hecho con 💛 en Colombia**
