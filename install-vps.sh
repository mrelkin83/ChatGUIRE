#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════
#  ChatGÜIRE — Auto Instalador para VPS (Ubuntu/Debian)
# ═══════════════════════════════════════════════════════════
#  Usa los Dockerfiles y docker-compose.yml nativos del proyecto.
# ═══════════════════════════════════════════════════════════

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Ejecuta este script como root (sudo)."
  exit 1
fi

LOG_FILE="/var/log/chatguire-install.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "  ChatGÜIRE — Instalador VPS v3.0"
echo "=========================================="

# ── Helpers ───────────────────────────────────────────────
ask() {
  local prompt="$1"
  local default="${2:-}"
  local var
  if [[ -n "$default" ]]; then
    read -rp "$prompt [$default]: " var
    echo "${var:-$default}"
  else
    read -rp "$prompt: " var
    echo "$var"
  fi
}

ask_secret() {
  local prompt="$1"
  local var
  read -rsp "$prompt: " var
  echo ""
  echo "$var"
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-n}"
  local var
  read -rp "$prompt [s/N]: " var
  var="${var:-$default}"
  if [[ "$var" =~ ^[Ss]$ ]]; then
    return 0
  else
    return 1
  fi
}

gen_pass() {
  openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 16
}

wait_for_service() {
  local svc="$1"
  local check_cmd="$2"
  echo -n "Esperando a que $svc esté listo"
  until docker compose exec "$svc" sh -c "$check_cmd" > /dev/null 2>&1; do
    echo -n "."
    sleep 2
  done
  echo " OK"
}

# ── 1. Inputs del usuario ─────────────────────────────────
echo ""
echo "--- Configuración de Base de Datos ---"
DB_NAME=$(ask "Nombre de la base de datos" "chatguire_db")
DB_USER=$(ask "Usuario de PostgreSQL" "chatguire_user")
DB_PASS=$(ask_secret "Contraseña de PostgreSQL")
if [[ -z "$DB_PASS" ]]; then
  DB_PASS=$(gen_pass)
  echo "  -> Se generó contraseña automática: $DB_PASS"
fi

echo ""
echo "--- Configuración de Dominio ---"
DOMAIN=$(ask "Dominio principal (ej: chatguire.com)" "")
if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: El dominio es obligatorio."
  exit 1
fi

echo ""
echo "--- Configuración SaaS ---"
TENANT_COUNT=$(ask "Cantidad de tenants a crear" "1")
SUBDOMAIN_COUNT=$(ask "Cantidad de subdominios por tenant" "1")

echo ""
echo "--- Credenciales SuperAdmin ---"
SA_EMAIL=$(ask "Email SuperAdmin" "admin@$DOMAIN")
SA_PASS=$(ask_secret "Contraseña SuperAdmin (Enter = Mayte2024*#)")
if [[ -z "$SA_PASS" ]]; then
  SA_PASS="Mayte2024*#"
  echo "  -> Usando contraseña por defecto"
fi
SA_NAME=$(ask "Nombre completo SuperAdmin" "Administrador")

echo ""
echo "--- SSL / HTTPS ---"
USE_SSL=false
if ask_yes_no "¿Obtener certificados SSL gratuitos con Let's Encrypt?"; then
  USE_SSL=true
fi

echo ""
echo "--- Otros ---"
JWT_SECRET=$(ask "JWT Secret (mínimo 32 chars)" "")
if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET=$(openssl rand -base64 48)
  echo "  -> Se generó JWT Secret automático"
fi

INSTALL_DIR=$(ask "Directorio de instalación" "/opt/chatguire")
WEB_PORT=$(ask "Puerto de la aplicación Web" "3000")
API_PORT=$(ask "Puerto de la API" "3001")

# ── 2. Preparar sistema ───────────────────────────────────
echo ""
echo "[1/10] Actualizando sistema e instalando dependencias..."
apt-get update -y
apt-get install -y curl wget git nginx ufw openssl

# Docker
if ! command -v docker &> /dev/null; then
  echo "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker root || true
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
  apt-get install -y docker-compose-plugin || true
fi

# Certbot
if $USE_SSL && ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi

# ── 3. Copiar proyecto ────────────────────────────────────
echo ""
echo "[2/10] Preparando proyecto en $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/package.json" ]] && grep -q '"name": "saas-omnichannel"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  if [[ "$SCRIPT_DIR" != "$INSTALL_DIR" ]]; then
    echo "Copiando archivos desde el repositorio local..."
    cp -r "$SCRIPT_DIR/"* "$INSTALL_DIR/"
    cp -r "$SCRIPT_DIR/".[^.]* "$INSTALL_DIR/" 2>/dev/null || true
  else
    echo "Ya estamos en el directorio de instalación. Continuando..."
  fi
else
  echo "ERROR: No se encontró el proyecto en el directorio actual."
  echo "Ejecuta este script desde la raíz del repositorio ChatGÜIRE."
  exit 1
fi

cd "$INSTALL_DIR"

# ── 4. Generar archivos de entorno ────────────────────────
echo ""
echo "[3/10] Generando archivos de entorno..."

cat > "$INSTALL_DIR/.env" <<EOF
# Database
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@postgres:5432/$DB_NAME

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# App
NODE_ENV=production
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
API_BASE_URL=https://api.$DOMAIN
WEB_BASE_URL=https://$DOMAIN

# Encryption
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Evolution API
EVOLUTION_API_GLOBAL_KEY=$(gen_pass)

# WAHA
WAHA_ENGINE=WEBJS

# Integraciones (ajustar luego si aplica)
INSTAGRAM_BRIDGE_URL=http://localhost:8000
IG_POLL_INTERVAL_SECONDS=20
FB_RATE_LIMIT_PER_MINUTE=15
TT_POLL_INTERVAL_SECONDS=60
TT_MAX_VIDEOS_TO_MONITOR=5

# Wompi (ajustar luego si aplica)
WOMPI_SANDBOX_PUBLIC_KEY=pub_test_...
WOMPI_SANDBOX_PRIVATE_KEY=prv_test_...
EOF

# Frontend env (Next.js necesita esto en build time)
mkdir -p "$INSTALL_DIR/apps/web"
cat > "$INSTALL_DIR/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL=https://api.$DOMAIN
EOF

# Copiar a apps/api para compatibilidad
cp "$INSTALL_DIR/.env" "$INSTALL_DIR/apps/api/.env"
cp "$INSTALL_DIR/.env" "$INSTALL_DIR/apps/web/.env"

# ── 5. Construir imágenes Docker ──────────────────────────
echo ""
echo "[4/10] Construyendo imágenes Docker (esto puede tardar varios minutos)..."
cd "$INSTALL_DIR"
docker compose build --no-cache

# ── 6. Levantar infraestructura ───────────────────────────
echo ""
echo "[5/10] Levantando PostgreSQL y Redis..."
docker compose up -d postgres redis

echo "Esperando a que PostgreSQL esté saludable..."
wait_for_service postgres "pg_isready -U \$DB_USER -d \$DB_NAME"

echo "Esperando a que Redis esté saludable..."
wait_for_service redis "redis-cli ping | grep PONG"

# ── 7. Preparar PostgreSQL y ejecutar migraciones ─────────
echo ""
echo "[6/10] Preparando PostgreSQL y ejecutando migraciones..."

# Habilitar extensión pgvector (requerida para embeddings)
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Ejecutar migraciones de Drizzle (aplica automáticamente los archivos SQL en orden)
docker compose run --rm api sh -c "cd node_modules/@saas/db && npx drizzle-kit migrate"

if [[ -f "$INSTALL_DIR/packages/db/src/seed/demo-seed.ts" ]]; then
  if ask_yes_no "¿Ejecutar seed de demostración?"; then
    docker compose run --rm api sh -c "cd node_modules/@saas/db && npx tsx src/seed/demo-seed.ts"
  fi
fi

# ── 8. Crear SuperAdmin con hash bcrypt ───────────────────
echo ""
echo "[7/10] Creando usuario SuperAdmin..."

# Generar hash bcrypt usando PostgreSQL pgcrypto (gen_salt('bf') = bcrypt)
# Esto evita depender de contenedores temporales o módulos de npm
# El formato $2a$10$... es 100% compatible con bcrypt de Node.js
docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO superadmin_users (id, email, password_hash, full_name, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  '$SA_EMAIL',
  crypt('$SA_PASS', gen_salt('bf', 10)),
  '$SA_NAME',
  'superadmin',
  true,
  now()
)
ON CONFLICT (email) DO NOTHING;
" || true

# ── 9. Crear Tenants y Subdominios ────────────────────────
echo ""
echo "[8/10] Creando $TENANT_COUNT tenant(s) con $SUBDOMAIN_COUNT subdominio(s) cada uno..."

for ((t=1; t<=TENANT_COUNT; t++)); do
  TENANT_NAME="Tenant_$t"
  TENANT_VERTICAL="retail_fashion"
  TENANT_ID=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "
    INSERT INTO tenants (id, name, vertical, timezone, ai_model, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), '$TENANT_NAME', '$TENANT_VERTICAL', 'America/Bogota', 'gpt-4o-mini', true, now(), now())
    RETURNING id;
  ")
  echo "  -> Creado tenant: $TENANT_NAME (ID: $TENANT_ID)"

  for ((s=1; s<=SUBDOMAIN_COUNT; s++)); do
    SUBDOMAIN="t${t}s${s}.$DOMAIN"
    docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO tenant_config (id, tenant_id, key, value, created_at, updated_at)
      VALUES (gen_random_uuid(), '$TENANT_ID', 'subdomain', '{\"url\": \"$SUBDOMAIN\"}'::jsonb, now(), now())
      ON CONFLICT DO NOTHING;
    " || true
    echo "      -> Subdominio: $SUBDOMAIN"
  done
done

# ── 10. Levantar aplicación ───────────────────────────────
echo ""
echo "[9/10] Levantando API, Web y servicios adicionales..."
docker compose up -d

# ── 11. Configurar Nginx ──────────────────────────────────
echo ""
echo "[10/10] Configurando Nginx..."

NGINX_API="/etc/nginx/sites-available/api-$DOMAIN"
cat > "$NGINX_API" <<EOF
server {
  listen 80;
  server_name api.$DOMAIN;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 86400;
  }
}
EOF

NGINX_WEB="/etc/nginx/sites-available/$DOMAIN"
cat > "$NGINX_WEB" <<EOF
server {
  listen 80;
  server_name $DOMAIN www.$DOMAIN;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:$WEB_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 86400;
  }
}
EOF

ln -sf "$NGINX_API" /etc/nginx/sites-enabled/
ln -sf "$NGINX_WEB" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

# SSL
if $USE_SSL; then
  echo ""
  echo "Obteniendo certificados SSL..."
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "api.$DOMAIN" --non-interactive --agree-tos -m "$SA_EMAIL" || true
fi

# ── 12. Firewall ──────────────────────────────────────────
echo ""
echo "Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8080/tcp  # Evolution API
ufw allow 3100/tcp  # WAHA
ufw --force enable || true

# ── 13. Resumen ───────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Instalación Completada"
echo "=========================================="
echo ""
echo " Dominio:        https://$DOMAIN"
echo " API:            https://api.$DOMAIN"
echo " Panel SaaS:     https://$DOMAIN/PanelSaas"
echo ""
echo " Base de datos:  $DB_NAME"
echo " DB User:        $DB_USER"
echo " DB Pass:        $DB_PASS"
echo ""
echo " SuperAdmin:"
echo "   Email:        $SA_EMAIL"
echo "   Password:     $SA_PASS"
echo ""
echo " Servicios Docker:"
echo "   docker compose ps"
echo "   docker compose logs -f api"
echo "   docker compose logs -f web"
echo ""
echo " JWT Secret:     (guardado en $INSTALL_DIR/.env)"
echo ""
echo " Directorio:     $INSTALL_DIR"
echo " Logs:           $LOG_FILE"
echo ""
echo " Comandos útiles:"
echo "   cd $INSTALL_DIR && docker compose ps"
echo "   cd $INSTALL_DIR && docker compose logs -f api"
echo "   cd $INSTALL_DIR && docker compose logs -f web"
echo "   cd $INSTALL_DIR && docker compose restart"
echo "=========================================="
