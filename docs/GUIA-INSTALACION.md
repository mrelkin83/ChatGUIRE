# ChatGÜIRE — Guia de Instalacion Completa

> Guia paso a paso para instalar ChatGÜIRE en desarrollo local o produccion.

---

## Requisitos Previos

| Requisito | Version | Descarga |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm` |
| Git | 2.40+ | https://git-scm.com |
| PostgreSQL | 16+ con pgvector | https://postgresql.org |
| Redis | 7+ | https://redis.io |

**Para produccion con Docker:**
- Docker Engine 24+
- Docker Compose v2+

**API keys necesarias:**
- OpenAI API Key (obligatorio para IA)
- Evolution API Key (obligatorio para WhatsApp)
- Wompi Keys (opcional, para pagos)

---

## Opcion 1: Instalacion Local (Desarrollo)

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/mrelkin83/ChatG-IRE.git
cd ChatG-IRE
```

### Paso 2 — Instalar dependencias

```bash
pnpm install
```

Esto instala todas las dependencias del monorepo (api, web, db, shared).

### Paso 3 — Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus valores reales:

```env
# Base de datos (ajusta usuario, password y host)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_omnichannel

# Redis
REDIS_URL=redis://localhost:6379

# Seguridad — genera un secret largo y aleatorio
JWT_SECRET=cambia-esto-por-un-secret-aleatorio-de-32-chars-minimo
ENCRYPTION_KEY=cambia-esto-por-32-bytes-hex

# IA — obligatorio para el motor conversacional
OPENAI_API_KEY=sk-tu-api-key-de-openai
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# URLs de la aplicacion
API_BASE_URL=http://localhost:3001
WEB_BASE_URL=http://localhost:3000
API_PORT=3001
WEB_PORT=3000

# WhatsApp — Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_GLOBAL_KEY=tu-evolution-api-key

# WhatsApp — WAHA (dual engine)
WAHA_ENGINE=WEBJS

# Entorno
NODE_ENV=development
```

### Paso 4 — Crear la base de datos

Asegurate de que PostgreSQL este corriendo y crea la base de datos:

```bash
# Con psql
psql -U postgres
CREATE DATABASE saas_omnichannel;
\q
```

Si usas pgvector (requerido para embeddings), habilita la extension:

```sql
psql -U postgres -d saas_omnichannel -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Paso 5 — Aplicar migraciones

```bash
pnpm db:migrate
```

Esto ejecuta las migraciones de Drizzle ORM y crea todas las tablas.

### Paso 6 — (Opcional) Cargar datos de demostracion

```bash
pnpm db:seed
```

Esto inserta datos de ejemplo para probar la plataforma.

### Paso 7 — Iniciar en modo desarrollo

```bash
# Iniciar todo (backend + frontend)
pnpm dev
```

O por separado en terminales distintas:

```bash
# Terminal 1 — Backend en puerto 3001
pnpm --filter @saas/api dev

# Terminal 2 — Frontend en puerto 3000
pnpm --filter @saas/web dev
```

### Paso 8 — Verificar que funciona

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Backend | http://localhost:3001/health |
| Evolution API | http://localhost:8080 |

---

## Opcion 2: Docker (Produccion)

### Paso 1 — Clonar el repositorio en el servidor

```bash
git clone https://github.com/mrelkin83/ChatG-IRE.git /opt/chatguire
cd /opt/chatguire
```

### Paso 2 — Crear el archivo .env

```bash
cp .env.example .env
nano .env
```

Configura con valores de produccion:

```env
NODE_ENV=production

# Base de datos — usa las credenciales del contenedor Docker
DB_NAME=chatguire_db
DB_USER=chatguire_user
DB_PASS=una-password-segura-aqui
DATABASE_URL=postgresql://chatguire_user:una-password-segura-aqui@postgres:5432/chatguire_db

# Redis
REDIS_URL=redis://redis:6379

# Seguridad
JWT_SECRET=genera-un-secret-aleatorio-largo
ENCRYPTION_KEY=genera-32-bytes-hex-aleatorios
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# URLs publicas
API_BASE_URL=https://api.tu-dominio.com
WEB_BASE_URL=https://tu-dominio.com
API_PORT=3001
WEB_PORT=3000

# IA
OPENAI_API_KEY=sk-tu-api-key-real
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# WhatsApp
EVOLUTION_API_GLOBAL_KEY=una-clave-segura-para-evolution
WAHA_ENGINE=WEBJS

# Pagos (opcional)
WOMPI_SANDBOX_PUBLIC_KEY=pub_test_...
WOMPI_SANDBOX_PRIVATE_KEY=prv_test_...
```

### Paso 3 — Construir y levantar

```bash
docker compose up -d --build
```

Esto levanta 6 servicios:

| Servicio | Puerto | Descripcion |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 con pgvector |
| `redis` | 6379 | Redis 7 para cache y colas |
| `api` | 3001 | Backend Fastify |
| `web` | 3000 | Frontend Next.js |
| `evolution-api` | 8080 | WhatsApp Evolution API |
| `waha` | 3100 | WhatsApp WAHA (dual engine) |

### Paso 4 — Ejecutar migraciones

```bash
docker compose exec api pnpm --filter @saas/db db:migrate
```

### Paso 5 — Crear usuario SuperAdmin

```bash
docker compose exec postgres psql -U chatguire_user -d chatguire_db -c "
INSERT INTO superadmin_users (id, email, password_hash, full_name, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'admin@tudominio.com',
  crypt('TuPasswordSeguro', gen_salt('bf', 10)),
  'Administrador',
  'superadmin',
  true,
  now()
)
ON CONFLICT (email) DO NOTHING;
"
```

### Paso 6 — Verificar servicios

```bash
# Estado de los contenedores
docker compose ps

# Health check de la API
curl http://localhost:3001/health

# Ver logs
docker compose logs -f api
docker compose logs -f web
```

---

## Opcion 3: Instalacion Automatica en VPS (Recomendado)

El proyecto incluye un script de instalacion automatica para Ubuntu/Debian que configura todo: Docker, Nginx, SSL, base de datos, migraciones y SuperAdmin.

### Paso 1 — Clonar y ejecutar

```bash
git clone https://github.com/mrelkin83/ChatG-IRE.git /opt/chatguire
cd /opt/chatguire
sudo bash install-vps.sh
```

### Paso 2 — Responder las preguntas interactivas

El script te preguntara:

1. **Base de datos** — nombre, usuario y password
2. **Dominio** — tu dominio principal (ej: `chatguire.com`)
3. **Tenants** — cuantos tenants y subdominios crear
4. **SuperAdmin** — email, password y nombre
5. **SSL** — si quieres certificados Let's Encrypt automaticos
6. **JWT Secret** — o genera uno automatico
7. **Puertos** — por defecto 3000 (web) y 3001 (api)

### Paso 3 — Esperar a que termine

El script hace todo automaticamente:
- Instala Docker, Nginx y Certbot
- Genera el `.env` con contrasenas aleatorias
- Construye las imagenes Docker
- Levanta PostgreSQL y Redis
- Ejecuta migraciones
- Crea el SuperAdmin
- Configura Nginx como reverse proxy
- Obtiene certificados SSL
- Configura el firewall UFW

### Paso 4 — Acceder

Al finalizar veras un resumen con:

```
Dominio:        https://tudominio.com
API:            https://api.tudominio.com
Panel SaaS:     https://tudominio.com/PanelSaas

SuperAdmin:
  Email:        admin@tudominio.com
  Password:     (la que elegiste)
```

---

## Pos-Instalacion

### Conectar WhatsApp

1. Accede a `http://tu-servidor:8080` (Evolution API)
2. Crea una instancia con la API key que configuraste
3. Escanea el codigo QR con tu WhatsApp
4. Los mensajes empezaran a llegar al inbox

### Conectar WAHA (segundo engine)

1. Accede a `http://tu-servidor:3100` (WAHA)
2. Inicia una sesion y escanea el QR
3. Ambos engines funcionan en paralelo

### Configurar IA

1. Ve al Dashboard > IA Config
2. Configura el modelo (gpt-4o-mini recomendado)
3. Agrega entradas a la Knowledge Base
4. Configura menus de bot y flujos conversacionales

### Configurar pasarela de pagos (Wompi)

1. Crea una cuenta en https://wompi.co
2. Obtén tus llaves public y privada
3. Agregalas al `.env`:
   ```env
   WOMPI_SANDBOX_PUBLIC_KEY=pub_test_...
   WOMPI_SANDBOX_PRIVATE_KEY=prv_test_...
   ```
4. Reinicia los servicios: `docker compose restart api`

---

## Comandos Utiles

```bash
# Estado de los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres

# Reiniciar un servicio
docker compose restart api
docker compose restart web

# Reconstruir despues de cambios
docker compose up -d --build api
docker compose up -d --build web

# Ejecutar migraciones
docker compose exec api pnpm --filter @saas/db db:migrate

# Acceder a la base de datos
docker compose exec postgres psql -U chatguire_user -d chatguire_db

# Drizzle Studio (UI visual de la DB)
pnpm --filter @saas/db db:studio

# Ejecutar tests
pnpm --filter @saas/api test
```

---

## Solucion de Problemas

### Error: "Cannot connect to PostgreSQL"

```bash
# Verificar que PostgreSQL esta corriendo
docker compose ps postgres

# Verificar la conexion
docker compose exec postgres pg_isready -U chatguire_user -d chatguire_db

# Revisar las credenciales en .env coincidan con docker-compose.yml
```

### Error: "Cannot connect to Redis"

```bash
# Verificar que Redis esta corriendo
docker compose exec redis redis-cli ping
# Debe responder: PONG
```

### Error: "JWT_SECRET is required"

Agrega o corrige `JWT_SECRET` en tu archivo `.env`. Debe tener al menos 32 caracteres.

### Error: "OPENAI_API_KEY is required"

Agrega tu API key de OpenAI en `.env`:
```env
OPENAI_API_KEY=sk-proj-...
```

### La build de Docker falla

```bash
# Limpiar cache y reconstruir
docker compose down
docker system prune -f
docker compose up -d --build --no-cache
```

### Los contenedores se reinician constantemente

```bash
# Ver los logs del contenedor que falla
docker compose logs api --tail 50
docker compose logs web --tail 50

# Verificar que los puertos no esten en uso
netstat -tlnp | grep -E '3000|3001|5432|6379|8080|3100'
```

---

## Estructura de Puertos

| Puerto | Servicio | Protocolo |
|---|---|---|
| 3000 | Web (Next.js) | HTTP |
| 3001 | API (Fastify) | HTTP |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 8080 | Evolution API | HTTP |
| 3100 | WAHA | HTTP |
| 80 | Nginx (produccion) | HTTP |
| 443 | Nginx con SSL (produccion) | HTTPS |

---

## Actualizar a una nueva version

```bash
cd /opt/chatguire
git pull origin main
docker compose up -d --build
docker compose exec api pnpm --filter @saas/db db:migrate
```
