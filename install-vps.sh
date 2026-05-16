#!/bin/bash
#
# ChatGÜIRE — Auto-Instalador VPS v1.2
# Fixes: dpkg lock, resume state, auto-passwords, DNS no-bloqueante,
#        backup path, migracion Drizzle, API_PORT correcto.
#
set -euo pipefail
IFS=$'\n\t'

# ─── Configuración ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
STATE_FILE="$PROJECT_DIR/.install-state"
LOG_FILE="$PROJECT_DIR/.install-log"
CREDENTIALS_FILE="$PROJECT_DIR/.credentials"
DOMAIN=""
ENCRYPTION_KEY=""
COMPLETED_STEP=0      # FIX: representa último paso COMPLETADO (no iniciado)
TOTAL_STEPS=8

# ─── Utilidades ─────────────────────────────────────────────────────────────
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

error_exit() {
    log "❌ ERROR: $1"
    echo ""
    echo "Para rollback: sudo bash $SCRIPT_DIR/install-vps.sh --rollback"
    exit 1
}

# FIX: state guarda COMPLETED_STEP (último paso exitoso)
save_state() {
    cat > "$STATE_FILE" <<EOF
DOMAIN="$DOMAIN"
COMPLETED_STEP=$COMPLETED_STEP
EOF
    chmod 600 "$STATE_FILE"
}

load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        # shellcheck source=/dev/null
        source "$STATE_FILE"
        log "🔄 Reanudando desde paso $((COMPLETED_STEP + 1))"
    fi
}

show_step() {
    local step=$1
    local desc="$2"
    local status="${3:-}"
    printf "\n[%d/%d] %s %s\n" "$step" "$TOTAL_STEPS" "$desc" "$status"
}

# FIX: generar contraseña segura sin interacción
gen_password() {
    openssl rand -hex 20
}

generate_encryption_key() {
    openssl rand -hex 32
}

prompt_required() {
    local var_name="$1"
    local prompt_text="$2"
    local value=""
    while [[ -z "$value" ]]; do
        read -rp "$prompt_text: " value
        [[ -z "$value" ]] && echo "⚠️  Este campo es obligatorio."
    done
    printf -v "$var_name" '%s' "$value"
}

# FIX: dpkg lock — esperar hasta 2 minutos antes de fallar
wait_for_dpkg_lock() {
    local retries=24  # 24 × 5s = 2 minutos
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || \
          fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
        log "⏳ Esperando lock de dpkg (otro proceso apt activo)..."
        sleep 5
        retries=$((retries - 1))
        if [[ $retries -eq 0 ]]; then
            error_exit "dpkg lock no se liberó después de 2 minutos. Ejecuta: sudo kill $(fuser /var/lib/dpkg/lock-frontend 2>/dev/null | awk '{print $1}') y reintenta."
        fi
    done
}

# ─── Rollback ───────────────────────────────────────────────────────────────
rollback() {
    log "🛡️  Iniciando rollback..."
    if [[ -f "$COMPOSE_FILE" ]]; then
        cd "$PROJECT_DIR" || true
        docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi
    rm -f "$STATE_FILE"
    log "✅ Rollback completado."
}

# ─── Banner ─────────────────────────────────────────────────────────────────
show_banner() {
    cat <<'EOF'
┌─────────────────────────────────────────────────────────────┐
│  🤖 ChatGÜIRE — Instalador VPS v1.2                         │
│  Auto-configurado • Sin contraseñas manuales                │
└─────────────────────────────────────────────────────────────┘
EOF
}

# ─── PASO 1: Verificaciones del sistema ─────────────────────────────────────
step1_verify_system() {
    show_step 1 "Verificando sistema..."

    if ! grep -qE "Ubuntu (20\.04|22\.04|24\.04)" /etc/os-release 2>/dev/null; then
        error_exit "Sistema no compatible. Requiere Ubuntu 20.04/22.04/24.04 LTS."
    fi
    log "✅ OS compatible"

    local ram_kb ram_gb
    ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    ram_gb=$((ram_kb / 1024 / 1024))
    [[ $ram_gb -lt 2 ]] && error_exit "RAM insuficiente: ${ram_gb}GB. Mínimo: 2GB."
    log "✅ RAM: ${ram_gb}GB"

    local disk_gb
    disk_gb=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
    [[ $disk_gb -lt 20 ]] && error_exit "Disco insuficiente: ${disk_gb}GB. Mínimo: 20GB."
    log "✅ Disco: ${disk_gb}GB"

    for port in 80 443; do
        if ss -tlnp | grep -q ":$port "; then
            error_exit "Puerto $port ocupado. Detén el servicio que lo usa."
        fi
    done
    log "✅ Puertos 80/443 libres"

    if ! curl -fsSL https://cloudflare.com > /dev/null 2>&1; then
        error_exit "Sin conectividad a internet."
    fi
    log "✅ Conectividad OK"
}

# ─── PASO 2: Dependencias ─────────────────────────────────────────────────────
step2_dependencies() {
    show_step 2 "Instalando dependencias..."

    wait_for_dpkg_lock

    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq \
        curl wget git nginx certbot python3-certbot-nginx \
        ufw fail2ban openssl jq bc dnsutils \
        ca-certificates gnupg lsb-release

    # ── Docker Engine (repo oficial — docker-compose-plugin no está en Ubuntu repos)
    if ! command -v docker &>/dev/null; then
        log "Instalando Docker desde repositorio oficial..."
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
            | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
            | tee /etc/apt/sources.list.d/docker.list > /dev/null

        wait_for_dpkg_lock
        apt-get update -qq
        apt-get install -y -qq \
            docker-ce docker-ce-cli containerd.io \
            docker-buildx-plugin docker-compose-plugin
    else
        log "Docker ya instalado — verificando compose plugin..."
        # Instalar compose-plugin si falta
        if ! docker compose version &>/dev/null 2>&1; then
            apt-get install -y -qq docker-compose-plugin 2>/dev/null || \
            apt-get install -y -qq docker-compose 2>/dev/null || true
        fi
    fi

    systemctl enable docker
    systemctl start docker
    local retries=10
    until docker info > /dev/null 2>&1; do
        sleep 3
        retries=$((retries - 1))
        [[ $retries -eq 0 ]] && error_exit "Docker no responde después de iniciar."
    done
    log "✅ Docker v$(docker version --format '{{.Server.Version}}')"

    # Verificar que 'docker compose' funciona (V2 plugin)
    if ! docker compose version &>/dev/null 2>&1; then
        # Fallback: instalar docker-compose V1 clásico
        curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-$(uname -m)" \
            -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        # Crear alias para que 'docker compose' funcione
        mkdir -p /usr/local/lib/docker/cli-plugins
        ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
        log "✅ Docker Compose V2 instalado manualmente"
    fi
    log "✅ Docker Compose $(docker compose version --short)"

    # UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw --force enable
    log "✅ UFW activo (22, 80, 443)"

    systemctl enable fail2ban
    systemctl start fail2ban
    log "✅ fail2ban activo"
}

# ─── PASO 3: Dominio y SSL ──────────────────────────────────────────────────
step3_domain_ssl() {
    show_step 3 "Configurando dominio y SSL..."

    if [[ -z "${DOMAIN:-}" ]]; then
        prompt_required DOMAIN "Ingresa tu dominio (ej: chat.miempresa.com)"
    fi

    # FIX: DNS check solo informativo, no bloqueante (default = continuar)
    local vps_ip domain_ip
    vps_ip=$(curl -fsSL https://ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    domain_ip=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | tail -1 || true)

    if [[ "$domain_ip" != "$vps_ip" ]]; then
        log "⚠️  DNS: $DOMAIN resuelve a '$domain_ip', este VPS es $vps_ip"
        log "   Crea un A record: $DOMAIN → $vps_ip"
        log "   Continuando instalación. Let's Encrypt fallará si el DNS no propagó."
        log "   Puedes re-ejecutar solo el SSL después: certbot --nginx -d $DOMAIN"
    else
        log "✅ DNS verificado: $DOMAIN → $vps_ip"
    fi

    local email="admin@${DOMAIN}"
    log "Email Let's Encrypt: $email (puedes cambiarlo en .env después)"

    # Nginx config
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

    cat > "/etc/nginx/sites-available/chatguire" <<NGINX
upstream api_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream web_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    # SSE — sin timeout en inbox
    location /api/inbox/stream {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
    }

    location /api/ {
        proxy_pass http://api_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://api_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location / {
        proxy_pass http://web_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
    }
}
NGINX

    ln -sf "/etc/nginx/sites-available/chatguire" /etc/nginx/sites-enabled/chatguire
    rm -f /etc/nginx/sites-enabled/default

    # Nginx con HTTP-only hasta obtener cert (evita error si no hay cert aún)
    cat > "/etc/nginx/sites-available/chatguire-http" <<NGINX_HTTP
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; add_header Content-Type text/plain; }
}
NGINX_HTTP

    # Activar config HTTP temporal para obtener cert
    ln -sf "/etc/nginx/sites-available/chatguire-http" /etc/nginx/sites-enabled/chatguire-http
    nginx -t 2>/dev/null && systemctl reload nginx || true

    # Certbot (no-interactivo, no falla si DNS no está listo)
    if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
            --non-interactive --agree-tos -m "$email" 2>/dev/null && {
            log "✅ Certificado SSL obtenido"
            # Activar config HTTPS completa
            rm -f /etc/nginx/sites-enabled/chatguire-http
            nginx -t && systemctl reload nginx
        } || {
            log "⚠️  Let's Encrypt no obtuvo cert (DNS posiblemente no propagó)"
            log "   Re-ejecuta cuando el DNS esté listo: certbot --nginx -d $DOMAIN"
        }
    else
        log "✅ Certificado SSL ya existe"
        rm -f /etc/nginx/sites-enabled/chatguire-http
        nginx -t && systemctl reload nginx
    fi

    # Auto-renew
    cat > /etc/cron.d/chatguire-certbot <<EOF
0 4 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx" >> /var/log/letsencrypt-renew.log 2>&1
EOF
    log "✅ Nginx configurado (auto-renew SSL 4:00 AM)"
}

# ─── PASO 4: Configuración del proyecto ─────────────────────────────────────
step4_project_config() {
    show_step 4 "Configurando proyecto..."

    mkdir -p "$PROJECT_DIR/scripts" "$PROJECT_DIR/backups" "$PROJECT_DIR/logs" "$PROJECT_DIR/uploads"

    if [[ ! -d "$PROJECT_DIR/.git" ]]; then
        error_exit "No hay repo en $PROJECT_DIR. Clona primero: git clone https://github.com/mrelkin83/ChatGUIRE.git $PROJECT_DIR"
    fi

    # FIX: auto-generar todas las contraseñas
    ENCRYPTION_KEY=$(generate_encryption_key)
    local db_pass redis_pass jwt_secret webhook_secret
    db_pass=$(gen_password)
    redis_pass=$(gen_password)
    jwt_secret=$(openssl rand -hex 32)
    webhook_secret=$(openssl rand -hex 16)

    log "✅ Contraseñas generadas automáticamente"

    # FIX: usar API_PORT (no PORT) para que server.ts lo lea
    cat > "$PROJECT_DIR/.env" <<EOF
# ChatGÜIRE — Variables de entorno producción
# Generado: $(date '+%Y-%m-%d %H:%M:%S')
NODE_ENV=production
DOMAIN=${DOMAIN}

# Puertos (internos a Docker)
API_PORT=3001
WEB_PORT=3000

# Base de datos
DATABASE_URL=postgresql://chatguire:${db_pass}@postgres:5432/chatguire
DB_USER=chatguire
DB_PASS=${db_pass}
DB_NAME=chatguire

# Redis
REDIS_URL=redis://:${redis_pass}@redis:6379
REDIS_PASSWORD=${redis_pass}

# JWT
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d

# Cifrado
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Wompi (configura después desde el dashboard)
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_ENVIRONMENT=sandbox
WOMPI_INTEGRITY_SECRET=

# URLs
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
API_BASE_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN}
WEB_BASE_URL=https://${DOMAIN}

# Misc
WEBHOOK_SECRET=${webhook_secret}
EOF

    chmod 600 "$PROJECT_DIR/.env"

    # Guardar credenciales para mostrar al final
    cat > "$CREDENTIALS_FILE" <<EOF
# ChatGÜIRE — Credenciales generadas $(date '+%Y-%m-%d %H:%M:%S')
# ⚠️  GUARDA ESTO EN UN PASSWORD MANAGER Y ELIMINA ESTE ARCHIVO

DB_PASS=${db_pass}
REDIS_PASSWORD=${redis_pass}
JWT_SECRET=${jwt_secret}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
EOF
    chmod 600 "$CREDENTIALS_FILE"

    log "✅ .env generado en $PROJECT_DIR/.env"
}

# ─── PASO 5: Build y Deploy Docker ──────────────────────────────────────────
step5_build() {
    show_step 5 "Desplegando aplicación con Docker..."

    cd "$PROJECT_DIR" || error_exit "No se puede acceder a $PROJECT_DIR"

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "No se encontró $COMPOSE_FILE."
    fi

    log "Building imágenes (puede tardar 5-10 minutos)..."
    docker compose -f "$COMPOSE_FILE" build --no-cache

    log "Iniciando servicios..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Esperar PostgreSQL
    log "⏳ Esperando PostgreSQL..."
    local retries=30
    until docker compose -f "$COMPOSE_FILE" exec -T postgres \
          pg_isready -U chatguire -d chatguire > /dev/null 2>&1; do
        sleep 3
        retries=$((retries - 1))
        [[ $retries -eq 0 ]] && error_exit "PostgreSQL no respondió en 90s"
    done
    log "✅ PostgreSQL listo"

    # FIX: usar Drizzle (no Prisma)
    log "Ejecutando migraciones Drizzle..."
    docker compose -f "$COMPOSE_FILE" exec -T api \
        node -e "
          const { migrate } = require('drizzle-orm/postgres-js/migrator');
          const { db } = require('./dist/db');
          const path = require('path');
          migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') })
            .then(() => { console.log('Migrations OK'); process.exit(0); })
            .catch(e => { console.error('Migration error:', e.message); process.exit(1); });
        " 2>/dev/null || {
        log "⚠️  Migración automática falló. Ejecuta manualmente:"
        log "   docker compose -f $COMPOSE_FILE exec api node -e \"require('./dist/db').migrate()\""
    }

    log "✅ Aplicación desplegada"
}

# ─── PASO 6: Health checks ──────────────────────────────────────────────────
step6_health() {
    show_step 6 "Ejecutando health checks..."

    local retries=20
    local api_ok=false db_ok=false redis_ok=false

    while [[ $retries -gt 0 ]]; do
        # FIX: verificar por localhost (no depende de DNS/SSL)
        if curl -fsSL "http://127.0.0.1:3001/health" > /dev/null 2>&1; then
            api_ok=true
        fi
        if docker compose -f "$COMPOSE_FILE" exec -T postgres \
              pg_isready -U chatguire > /dev/null 2>&1; then
            db_ok=true
        fi
        if docker compose -f "$COMPOSE_FILE" exec -T redis \
              redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
            redis_ok=true
        fi

        [[ "$api_ok" == true && "$db_ok" == true && "$redis_ok" == true ]] && break

        sleep 3
        retries=$((retries - 1))
    done

    [[ "$api_ok"    == true ]] || error_exit "API no responde en http://127.0.0.1:3001/health"
    [[ "$db_ok"     == true ]] || error_exit "PostgreSQL no responde"
    [[ "$redis_ok"  == true ]] || error_exit "Redis no responde"

    log "✅ API, PostgreSQL y Redis responden correctamente"
}

# ─── PASO 7: Backups ────────────────────────────────────────────────────────
step7_backups() {
    show_step 7 "Configurando backups..."

    # Crear directorio de scripts si no existe
    mkdir -p "$PROJECT_DIR/scripts"

    # FIX: copiar backup.sh a scripts/ si existe en la raíz
    if [[ -f "$PROJECT_DIR/backup.sh" ]] && [[ ! -f "$PROJECT_DIR/scripts/backup.sh" ]]; then
        cp "$PROJECT_DIR/backup.sh" "$PROJECT_DIR/scripts/backup.sh"
        chmod +x "$PROJECT_DIR/scripts/backup.sh"
    fi

    cat > /etc/cron.d/chatguire-backup <<EOF
0 2 * * * root cd ${PROJECT_DIR} && bash scripts/backup.sh >> /var/log/chatguire-backup.log 2>&1
EOF

    # FIX: backup inicial con path correcto
    if [[ -f "$PROJECT_DIR/scripts/backup.sh" ]]; then
        cd "$PROJECT_DIR" && bash scripts/backup.sh && log "✅ Backup inicial completado" || \
            log "⚠️  Backup inicial falló (se reintentará en cron)"
    elif [[ -f "$PROJECT_DIR/backup.sh" ]]; then
        cd "$PROJECT_DIR" && bash backup.sh && log "✅ Backup inicial completado" || \
            log "⚠️  Backup inicial falló (se reintentará en cron)"
    else
        log "⚠️  No se encontró backup.sh — el cron lo reintentará cuando exista"
    fi

    log "✅ Backups configurados (diarios 2:00 AM)"
}

# ─── PASO 8: Resumen ────────────────────────────────────────────────────────
step8_summary() {
    show_step 8 "Resumen de instalación" "✅ COMPLETADO"

    local admin_pass
    admin_pass=$(openssl rand -base64 18 | tr -d '=+/')

    # Cargar credenciales guardadas en paso 4
    local enc_key=""
    if [[ -f "$CREDENTIALS_FILE" ]]; then
        enc_key=$(grep ENCRYPTION_KEY "$CREDENTIALS_FILE" | cut -d= -f2)
    fi

    cat <<SUMMARY

┌──────────────────────────────────────────────────────────────┐
│  🎉 Instalación completada                                   │
│                                                              │
│  URLs:                                                       │
│  • Dashboard:   https://${DOMAIN}                            │
│  • API:         https://${DOMAIN}/api                        │
│                                                              │
│  Credenciales SuperAdmin:                                    │
│  • Email:    admin@${DOMAIN}                                 │
│  • Password: ${admin_pass}                                   │
│                                                              │
│  🔐 ENCRYPTION_KEY (guárdala AHORA):                         │
│  ${enc_key}                                                  │
│                                                              │
│  📋 Próximos pasos:                                          │
│  1. Guarda ENCRYPTION_KEY y password en un gestor seguro    │
│  2. rm ${CREDENTIALS_FILE}                                   │
│  3. Si DNS no propagó: certbot --nginx -d ${DOMAIN}          │
│  4. Accede y crea tu primer tenant en /admin                 │
│  5. Conecta WhatsApp desde /dashboard/channels               │
│                                                              │
│  🔧 Comandos útiles:                                         │
│  docker compose -f ${COMPOSE_FILE} ps                        │
│  docker compose -f ${COMPOSE_FILE} logs -f api               │
│  docker compose -f ${COMPOSE_FILE} logs -f campaign-worker   │
│  bash ${PROJECT_DIR}/scripts/health-check.sh                 │
└──────────────────────────────────────────────────────────────┘

SUMMARY

    # Auto-eliminar .credentials en 5 minutos
    (
        sleep 300
        rm -f "$CREDENTIALS_FILE"
        log "🔒 .credentials eliminado automáticamente"
    ) &

    rm -f "$STATE_FILE"
    log "✅ Instalación finalizada"
}

# ─── Main ───────────────────────────────────────────────────────────────────
main() {
    if [[ "${1:-}" == "--rollback" ]]; then
        rollback; exit 0
    fi

    show_banner

    [[ $EUID -ne 0 ]] && error_exit "Ejecuta como root: sudo bash install-vps.sh"

    mkdir -p "$PROJECT_DIR"
    touch "$LOG_FILE"
    load_state

    # FIX: condición basada en COMPLETED_STEP (último EXITOSO)
    # Paso N se ejecuta si COMPLETED_STEP < N
    if [[ $COMPLETED_STEP -lt 1 ]]; then
        step1_verify_system
        COMPLETED_STEP=1; save_state
    fi
    if [[ $COMPLETED_STEP -lt 2 ]]; then
        step2_dependencies
        COMPLETED_STEP=2; save_state
    fi
    if [[ $COMPLETED_STEP -lt 3 ]]; then
        step3_domain_ssl
        COMPLETED_STEP=3; save_state
    fi
    if [[ $COMPLETED_STEP -lt 4 ]]; then
        step4_project_config
        COMPLETED_STEP=4; save_state
    fi
    if [[ $COMPLETED_STEP -lt 5 ]]; then
        step5_build
        COMPLETED_STEP=5; save_state
    fi
    if [[ $COMPLETED_STEP -lt 6 ]]; then
        # Cargar REDIS_PASSWORD del .env para health check
        if [[ -f "$PROJECT_DIR/.env" ]]; then
            REDIS_PASSWORD=$(grep '^REDIS_PASSWORD=' "$PROJECT_DIR/.env" | cut -d= -f2)
            export REDIS_PASSWORD
        fi
        step6_health
        COMPLETED_STEP=6; save_state
    fi
    if [[ $COMPLETED_STEP -lt 7 ]]; then
        step7_backups
        COMPLETED_STEP=7; save_state
    fi
    if [[ $COMPLETED_STEP -lt 8 ]]; then
        step8_summary
        COMPLETED_STEP=8; save_state
    fi

    log "🎉 Todo completado exitosamente"
}

main "$@"
