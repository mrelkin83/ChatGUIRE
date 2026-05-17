#!/bin/bash
#
# ChatGÜIRE — Instalador Local v1.0
# Compatible: Ubuntu, Debian, macOS
# Inicia PostgreSQL y Redis en Docker; corre la app con pnpm dev.
#
set -euo pipefail

REPO_URL="https://github.com/mrelkin83/ChatGUIRE.git"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ ERROR: $1${NC}"; exit 1; }

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  ChatGÜIRE — Instalador Local v1.0                          │"
echo "│  Entorno de desarrollo local                                │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# ─── PASO 1: Prerequisitos ───────────────────────────────────────────────────
echo "[1/5] Verificando prerequisitos..."

if ! command -v node &>/dev/null; then
    err "Node.js no instalado. Descarga desde https://nodejs.org (v20+)"
fi
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
[[ "$NODE_VER" -lt 20 ]] && err "Node.js v${NODE_VER} detectado. Se requiere v20+."
ok "Node.js $(node --version)"

if ! command -v pnpm &>/dev/null; then
    echo "   pnpm no encontrado — instalando..."
    if command -v corepack &>/dev/null; then
        corepack enable && corepack prepare pnpm@10.26.1 --activate
    else
        npm install -g pnpm@10.26.1
    fi
fi
ok "pnpm $(pnpm --version)"

if ! command -v docker &>/dev/null; then
    err "Docker no instalado. Descarga Docker Desktop desde https://docker.com"
fi
if ! docker info &>/dev/null 2>&1; then
    err "Docker no está corriendo. Inicia Docker Desktop y vuelve a ejecutar."
fi
ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'OK')"

if ! docker compose version &>/dev/null 2>&1; then
    err "Docker Compose no disponible. Actualiza Docker Desktop."
fi
ok "Docker Compose OK"

if ! command -v git &>/dev/null; then
    err "Git no instalado. Instala desde https://git-scm.com"
fi
ok "Git $(git --version | awk '{print $3}')"

# ─── PASO 2: Repositorio ─────────────────────────────────────────────────────
echo ""
echo "[2/5] Preparando repositorio..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR=""

# Detectar si el script ya está dentro del repositorio
if [[ -f "$SCRIPT_DIR/package.json" ]] && grep -q '"saas-omnichannel"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
    PROJECT_DIR="$SCRIPT_DIR"
    ok "Repositorio detectado en $PROJECT_DIR"
else
    DEFAULT_DIR="$HOME/ChatGUIRE"
    read -rp "   ¿Dónde instalar? [${DEFAULT_DIR}]: " INPUT_DIR
    PROJECT_DIR="${INPUT_DIR:-$DEFAULT_DIR}"

    if [[ -d "$PROJECT_DIR/.git" ]]; then
        ok "Repositorio ya existe — actualizando..."
        git -C "$PROJECT_DIR" pull origin main
    else
        echo "   Clonando repositorio..."
        git clone "$REPO_URL" "$PROJECT_DIR" || err "No se pudo clonar. Verifica tu conexión a internet."
        ok "Repositorio clonado en $PROJECT_DIR"
    fi
fi

cd "$PROJECT_DIR"

# ─── PASO 3: Dependencias npm ────────────────────────────────────────────────
echo ""
echo "[3/5] Instalando dependencias..."
pnpm install || err "Falló pnpm install. Revisa tu conexión o el pnpm-lock.yaml."
ok "Dependencias instaladas"

# ─── PASO 4: Variables de entorno ────────────────────────────────────────────
echo ""
echo "[4/5] Configurando entorno..."

if [[ -f ".env" ]]; then
    warn ".env ya existe — no se sobreescribe. Elimínalo si quieres regenerarlo."
else
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    BRIDGE_SECRET=$(openssl rand -hex 16)

    cat > .env <<EOF
NODE_ENV=development

# Puertos
API_PORT=3001
WEB_PORT=3000

# Base de datos (PostgreSQL en Docker local)
DATABASE_URL=postgresql://chatguire:chatguire_local@localhost:5432/chatguire
DB_USER=chatguire
DB_PASS=chatguire_local
DB_NAME=chatguire

# Redis (Docker local, sin contraseña)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Seguridad (generado automáticamente)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# URLs locales
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_BASE_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
WEB_BASE_URL=http://localhost:3000

# Servicios externos (opcional — configura cuando los necesites)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_GLOBAL_KEY=
WAHA_API_URL=http://localhost:3100
WAHA_ENGINE=WEBJS
INSTAGRAM_BRIDGE_URL=http://localhost:8000
INSTAGRAM_BRIDGE_PORT=8000
BRIDGE_SECRET=${BRIDGE_SECRET}
WEBHOOK_SECRET=${BRIDGE_SECRET}

# Pagos Wompi (opcional)
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_ENVIRONMENT=sandbox
WOMPI_INTEGRITY_SECRET=

# IA (opcional — necesario para funciones de IA)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
EOF
    ok ".env generado con claves aleatorias"
fi

# ─── PASO 5: Base de datos y migraciones ─────────────────────────────────────
echo ""
echo "[5/5] Iniciando PostgreSQL y Redis (Docker)..."

docker compose up -d postgres redis

echo "   Esperando PostgreSQL..."
retries=30
until docker compose exec -T postgres pg_isready -U chatguire -d chatguire &>/dev/null 2>&1; do
    sleep 2
    retries=$((retries - 1))
    [[ $retries -eq 0 ]] && err "PostgreSQL no respondió en 60s. Revisa: docker compose logs postgres"
done
ok "PostgreSQL listo"

echo "   Ejecutando migraciones Drizzle..."
pnpm --filter @saas/db db:migrate && ok "Migraciones aplicadas" || \
    warn "Migración falló — ejecuta manualmente después: pnpm --filter @saas/db db:migrate"

# ─── Resumen ─────────────────────────────────────────────────────────────────
echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  ✅ Instalación local completada                             │"
echo "│                                                             │"
echo "│  Para iniciar el desarrollo:                                │"
echo "│    pnpm dev                                                 │"
echo "│                                                             │"
echo "│  URLs:                                                      │"
echo "│    Frontend:  http://localhost:3000                         │"
echo "│    Backend:   http://localhost:3001                         │"
echo "│    API Docs:  http://localhost:3001/documentation           │"
echo "│                                                             │"
echo "│  Base de datos (Docker):                                    │"
echo "│    PostgreSQL: localhost:5432  user=chatguire               │"
echo "│    Redis:      localhost:6379                               │"
echo "│                                                             │"
echo "│  Comandos útiles:                                           │"
echo "│    docker compose stop postgres redis   # Detener BD        │"
echo "│    docker compose start postgres redis  # Reanudar BD       │"
echo "│    pnpm --filter @saas/db db:studio     # Drizzle Studio    │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "  👉  cd ${PROJECT_DIR} && pnpm dev"
echo ""
