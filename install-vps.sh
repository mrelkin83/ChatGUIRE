#!/bin/bash
#
# ChatGÜIRE — Auto-Instalador VPS v1.1 (Corregido)
# Fase 0+1: Seguridad + Operatividad
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
SSL_TYPE=""
ENCRYPTION_KEY=""
TOTAL_STEPS=8
CURRENT_STEP=0

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

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\\'
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# C-1 FIX: Reemplazar eval con printf -v
prompt_required() {
    local var_name="$1"
    local prompt_text="$2"
    local value=""
    while [[ -z "$value" ]]; do
        read -rp "$prompt_text: " value
        if [[ -z "$value" ]]; then
            echo "⚠️  Este campo es obligatorio."
        fi
    done
    # FIX C-1: Usar printf -v en lugar de eval
    printf -v "$var_name" '%s' "$value"
}

prompt_password() {
    local var_name="$1"
    local prompt_text="$2"
    local value=""
    local confirm=""
    while true; do
        read -rsp "$prompt_text: " value
        echo ""
        read -rsp "Confirma $prompt_text: " confirm
        echo ""
        if [[ "$value" != "$confirm" ]]; then
            echo "⚠️  Las contraseñas no coinciden. Intenta de nuevo."
        elif [[ -z "$value" ]]; then
            echo "⚠️  La contraseña no puede estar vacía."
        else
            break
        fi
    done
    # FIX C-1: Usar printf -v en lugar de eval
    printf -v "$var_name" '%s' "$value"
}

prompt_yes_no() {
    local prompt_text="$1"
    local default="${2:-y}"
    local response=""
    while true; do
        read -rp "$prompt_text [${default}]: " response
        response=${response:-$default}
        case "$response" in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "⚠️  Responde y o n.";;
        esac
    done
}

# B-3 FIX: Usar mktemp en vez de PID predecible
run_cmd() {
    local cmd="$1"
    local desc="${2:-$cmd}"
    local tmpfile
    tmpfile=$(mktemp /tmp/chatguire_cmd.XXXXXX)
    log "Ejecutando: $desc"
    if eval "$cmd" > "$tmpfile" 2>&1; then
        rm -f "$tmpfile"
        return 0
    else
        local exit_code=$?
        log "Comando falló ($exit_code): $desc"
        log "Salida: $(cat "$tmpfile")"
        rm -f "$tmpfile"
        return $exit_code
    fi
}

save_state() {
    cat > "$STATE_FILE" <<EOF
DOMAIN="$DOMAIN"
SSL_TYPE="$SSL_TYPE"
CURRENT_STEP=$CURRENT_STEP
EOF
    chmod 600 "$STATE_FILE"
}

load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        # shellcheck source=/dev/null
        source "$STATE_FILE"
        log "🔄 Reanudando desde paso $CURRENT_STEP"
    fi
}

# ─── Rollback ───────────────────────────────────────────────────────────────
rollback() {
    log "🛡️  Iniciando rollback..."
    if [[ -f "$COMPOSE_FILE" ]]; then
        cd "$PROJECT_DIR" || true
        docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi
    if [[ -d "$PROJECT_DIR" ]]; then
        # No eliminamos todo, solo revertimos configuración
        mv "$PROJECT_DIR" "$PROJECT_DIR.rollback-$(date +%s)" 2>/dev/null || true
    fi
    rm -f "$STATE_FILE"
    log "✅ Rollback completado."
}

# ─── Generación de clave de cifrado ───────────────────────────────────────────
generate_encryption_key() {
    openssl rand -hex 32
}

# ─── Banner ─────────────────────────────────────────────────────────────────
show_banner() {
    cat <<'EOF'
┌─────────────────────────────────────────────────────────────┐
│  🤖 ChatGÜIRE — Instalador VPS v1.1                         │
│  Seguridad corregida • Listo para producción                │
└─────────────────────────────────────────────────────────────┘
EOF
}

show_step() {
    local step=$1
    local desc="$2"
    local status="${3:-}"
    CURRENT_STEP=$step
    save_state
    printf "\n[%d/%d] %s %s\n" "$step" "$TOTAL_STEPS" "$desc" "$status"
}

# ─── PASO 1: Verificaciones del sistema ─────────────────────────────────────
step1_verify_system() {
    show_step 1 "Verificando sistema..."

    # OS compatible
    if ! grep -qE "Ubuntu (20\.04|22\.04|24\.04)" /etc/os-release 2>/dev/null; then
        error_exit "Sistema operativo no compatible. Se requiere Ubuntu 20.04/22.04/24.04 LTS."
    fi
    log "✅ OS compatible"

    # RAM
    local ram_kb
    ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local ram_gb=$((ram_kb / 1024 / 1024))
    if [[ $ram_gb -lt 2 ]]; then
        error_exit "RAM insuficiente: ${ram_gb}GB. Mínimo requerido: 2GB."
    elif [[ $ram_gb -lt 4 ]]; then
        log "⚠️  Advertencia: RAM ${ram_gb}GB. Recomendado: 4GB+ para WAHA (Chromium)"
    fi
    log "✅ RAM: ${ram_gb}GB"

    # Disco
    local disk_gb
    disk_gb=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
    if [[ $disk_gb -lt 20 ]]; then
        error_exit "Disco insuficiente: ${disk_gb}GB. Mínimo requerido: 20GB."
    fi
    log "✅ Disco: ${disk_gb}GB"

    # Puertos libres
    for port in 80 443; do
        if ss -tlnp | grep -q ":$port "; then
            local service
            service=$(ss -tlnp | grep ":$port " | head -1 | awk '{print $7}')
            error_exit "Puerto $port ocupado por $service. Detén el servicio o usa otro VPS."
        fi
    done
    log "✅ Puertos 80/443 libres"

    # Conectividad
    if ! curl -fsSL https://cloudflare.com > /dev/null 2>&1; then
        error_exit "Sin conectividad a internet. Verifica la red del VPS."
    fi
    log "✅ Conectividad OK"
}

# ─── PASO 2: Dependencias ─────────────────────────────────────────────────────
step2_dependencies() {
    show_step 2 "Instalando dependencias..."

    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx \
        ufw fail2ban docker.io docker-compose-plugin openssl jq bc

    # Docker
    if ! docker info > /dev/null 2>&1; then
        systemctl enable docker
        systemctl start docker
        sleep 2
        if ! docker info > /dev/null 2>&1; then
            error_exit "Docker no responde después de 3 intentos."
        fi
    fi
    log "✅ Docker v$(docker version --format '{{.Server.Version}}')"

    # UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    # FIX A-1: NO abrir 3000/3001 — solo accesibles via Nginx (127.0.0.1)
    ufw --force enable
    log "✅ UFW activo (solo 22, 80, 443)"

    # fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    log "✅ fail2ban activo"
}

# ─── PASO 3: Dominio y SSL ──────────────────────────────────────────────────
step3_domain_ssl() {
    show_step 3 "Configurando dominio y SSL..."

    if [[ -z "${DOMAIN:-}" ]]; then
        prompt_required DOMAIN "Ingresa tu dominio (ej: tu-dominio.com)"
    fi

    # Verificar DNS A record
    local vps_ip
    vps_ip=$(curl -fsSL https://ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    local domain_ip
    domain_ip=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null || true)

    if [[ "$domain_ip" != "$vps_ip" ]]; then
        log "⚠️  El dominio $DOMAIN no apunta a este VPS ($vps_ip)."
        log "   Registra un A record: $DOMAIN → $vps_ip"
        if ! prompt_yes_no "¿Continuar de todos modos? (el SSL fallará hasta que el DNS propague)" "n"; then
            error_exit "Configura el DNS A record primero."
        fi
    fi
    log "✅ DNS verificado: $DOMAIN → $vps_ip"

    # SSL
    SSL_TYPE="letsencrypt"
    local email
    read -rp "Email para Let's Encrypt [admin@${DOMAIN}]: " email
    email=${email:-"admin@${DOMAIN}"}

    # Nginx config
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

    cat > "/etc/nginx/sites-available/chatguire" <<EOF
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream web_backend {
    server 127.0.0.1:3001;
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
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # FIX M-7: HSTS header
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # FIX M-6: CSP endurecido (sin unsafe-inline/unsafe-eval)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://api_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
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

    # WebSocket / SSE para inbox tiempo real
    location /ws {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400s;
    }
}
EOF

    ln -sf "/etc/nginx/sites-available/chatguire" /etc/nginx/sites-enabled/chatguire
    rm -f /etc/nginx/sites-enabled/default
    nginx -t || error_exit "Configuración de Nginx inválida"
    systemctl reload nginx

    # Certbot
    mkdir -p /var/www/certbot
    if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
            -m "$email" --deploy-hook "systemctl reload nginx" || {
            log "⚠️  Let's Encrypt falló. Posiblemente el DNS aún no propagó."
            log "   Reintenta en 1 hora: certbot renew --force-renewal"
        }
    fi

    # Auto-renew cron (desfasado de backup: 4 AM)
    cat > /etc/cron.d/chatguire-certbot <<EOF
0 4 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx" >> /var/log/letsencrypt-renew.log 2>&1
EOF
    log "✅ SSL configurado (auto-renew 4:00 AM)"
}

# ─── PASO 4: Configuración del proyecto ─────────────────────────────────────
step4_project_config() {
    show_step 4 "Configurando proyecto..."

    mkdir -p "$PROJECT_DIR" "$PROJECT_DIR/scripts" "$PROJECT_DIR/nginx"

    # Verificar que el repo existe o clonar
    if [[ ! -d "$PROJECT_DIR/.git" ]]; then
        log "⚠️  No se encontró repositorio en $PROJECT_DIR"
        log "   Clona manualmente: git clone <tu-repo> $PROJECT_DIR"
        if ! prompt_yes_no "¿El código ya está en $PROJECT_DIR?" "y"; then
            error_exit "Coloca el código del proyecto en $PROJECT_DIR antes de continuar."
        fi
    fi

    # Generar ENCRYPTION_KEY
    ENCRYPTION_KEY=$(generate_encryption_key)

    # Variables de entorno
    local db_pass
    local redis_pass
    local jwt_secret
    prompt_password db_pass "Password para PostgreSQL"
    prompt_password redis_pass "Password para Redis"
    jwt_secret=$(openssl rand -hex 32)

    cat > "$PROJECT_DIR/.env" <<EOF
# ChatGÜIRE — Variables de entorno producción
NODE_ENV=production
DOMAIN=${DOMAIN}
PORT=3000
WEB_PORT=3001

# Database — FIX C-6: Sin fallback changeme
DATABASE_URL=postgresql://chatguire:${db_pass}@postgres:5432/chatguire?schema=public
DB_USER=chatguire
DB_PASS=${db_pass}
DB_NAME=chatguire

# Redis
REDIS_URL=redis://:${redis_pass}@redis:6379
REDIS_PASSWORD=${redis_pass}

# JWT
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d

# Encryption — FIX C-2: NO se escribe en .credentials, solo se muestra en pantalla
# La clave se muestra UNA SOLA VEZ al final de la instalación
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Wompi
WOMPI_PUBLIC_KEY=your_wompi_public_key
WOMPI_PRIVATE_KEY=your_wompi_private_key
WOMPI_ENVIRONMENT=production
WOMPI_INTEGRITY_SECRET=your_integrity_secret

# Webhook
WEBHOOK_SECRET=$(openssl rand -hex 16)

# Frontend
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF

    chmod 600 "$PROJECT_DIR/.env"

    # FIX C-2: .credentials NO contiene ENCRYPTION_KEY
    cat > "$CREDENTIALS_FILE" <<EOF
# ChatGÜIRE — Credenciales de acceso
# GENERADO: $(date '+%Y-%m-%d %H:%M:%S')
# ⚠️  GUARDA ESTE ARCHIVO EN UN PASSWORD MANAGER Y ELIMÍNALO DEL VPS

SuperAdmin Email: admin@${DOMAIN}
SuperAdmin Password: [Se genera en paso 6]

PostgreSQL Password: [En .env — nunca compartir]
Redis Password: [En .env — nunca compartir]

ENCRYPTION_KEY: [MOSTRADA UNA SOLA VEZ AL FINAL DE LA INSTALACIÓN]
EOF
    chmod 600 "$CREDENTIALS_FILE"

    log "✅ Configuración generada"
}

# ─── PASO 5: Build Docker ───────────────────────────────────────────────────
step5_build() {
    show_step 5 "Desplegando aplicación..."

    cd "$PROJECT_DIR" || error_exit "No se puede acceder a $PROJECT_DIR"

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "No se encontró $COMPOSE_FILE. Asegúrate de que docker-compose.prod.yml esté en el proyecto."
    fi

    docker compose -f "$COMPOSE_FILE" pull
    docker compose -f "$COMPOSE_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" up -d

    # Esperar a que PostgreSQL esté listo
    log "⏳ Esperando PostgreSQL..."
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U chatguire > /dev/null 2>&1; then
            log "✅ PostgreSQL listo"
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if [[ $retries -eq 0 ]]; then
        error_exit "PostgreSQL no respondió después de 60s"
    fi

    # Ejecutar migraciones
    docker compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy || {
        log "⚠️  Migraciones fallaron. Verifica la conexión a la base de datos."
    }

    log "✅ Aplicación desplegada"
}

# ─── PASO 6: Health checks ──────────────────────────────────────────────────
step6_health() {
    show_step 6 "Ejecutando health checks..."

    local retries=20
    local api_ok=false
    local db_ok=false
    local redis_ok=false

    while [[ $retries -gt 0 ]]; do
        # API
        if curl -fsSL "https://${DOMAIN}/health" > /dev/null 2>&1; then
            api_ok=true
        fi

        # DB
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U chatguire > /dev/null 2>&1; then
            db_ok=true
        fi

        # Redis
        if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
            redis_ok=true
        fi

        if [[ "$api_ok" == true && "$db_ok" == true && "$redis_ok" == true ]]; then
            break
        fi

        sleep 3
        retries=$((retries - 1))
    done

    [[ "$api_ok" == true ]] || error_exit "API no responde en /health"
    [[ "$db_ok" == true ]] || error_exit "PostgreSQL no responde"
    [[ "$redis_ok" == true ]] || error_exit "Redis no responde"

    log "✅ Todos los health checks pasaron"
}

# ─── PASO 7: Backups ────────────────────────────────────────────────────────
step7_backups() {
    show_step 7 "Configurando backups..."

    # FIX M-2: Backup a las 2 AM (desfasado de certbot 4 AM)
    cat > /etc/cron.d/chatguire-backup <<EOF
0 2 * * * root cd ${PROJECT_DIR} && bash scripts/backup.sh >> /var/log/chatguire-backup.log 2>&1
EOF

    # Ejecutar backup inicial
    cd "$PROJECT_DIR" && bash scripts/backup.sh || log "⚠️  Backup inicial falló (se reintentará en cron)"

    log "✅ Backups configurados (diarios 2:00 AM, retención 7 días)"
}

# ─── PASO 8: Resumen ────────────────────────────────────────────────────────
step8_summary() {
    show_step 8 "Resumen de instalación" "✅ COMPLETADO"

    local admin_pass
    admin_pass=$(openssl rand -base64 24 | tr -d '=+/')

    # Actualizar .credentials con password admin (sin encryption key)
    cat >> "$CREDENTIALS_FILE" <<EOF

SuperAdmin Password: ${admin_pass}
EOF

    cat <<EOF

┌─────────────────────────────────────────────────────────────┐
│  🎉 Instalación completada                                  │
│                                                              │
│  URLs:                                                       │
│  • Dashboard:    https://${DOMAIN}                           │
│  • API:          https://${DOMAIN}/api                       │
│  • SuperAdmin:   https://${DOMAIN}/admin                     │
│                                                              │
│  Credenciales SuperAdmin:                                    │
│  • Email:    admin@${DOMAIN}                                 │
│  • Password: ${admin_pass}                                   │
│                                                              │
│  🔐 ENCRYPTION_KEY (GUÁRDALA AHORA — no se mostrará de nuevo):│
│  ${ENCRYPTION_KEY}                                           │
│                                                              │
│  📋 Próximos pasos:                                          │
│  1. Guarda la ENCRYPTION_KEY en un password manager        │
│  2. Guarda el SuperAdmin password                            │
│  3. Elimina .credentials del VPS: rm ${CREDENTIALS_FILE}    │
│  4. Accede al SuperAdmin y crea tu primer tenant             │
│  5. Conecta WhatsApp desde /dashboard/channels               │
│                                                              │
│  📁 Archivos importantes:                                    │
│  • Config:     ${PROJECT_DIR}/.env                          │
│  • Compose:    ${COMPOSE_FILE}                              │
│  • Scripts:    ${PROJECT_DIR}/scripts/                       │
│  • Logs:       ${LOG_FILE}                                   │
│                                                              │
│  🔧 Comandos útiles:                                         │
│  cd ${PROJECT_DIR}                                           │
│  docker compose -f docker-compose.prod.yml ps                │
│  docker compose -f docker-compose.prod.yml logs -f api      │
│  bash scripts/health-check.sh                                │
│  bash scripts/backup.sh                                        │
│  bash scripts/update.sh                                      │
└─────────────────────────────────────────────────────────────┘

EOF

    # FIX C-2: Eliminar .credentials automáticamente después de 5 minutos
    (
        sleep 300
        if [[ -f "$CREDENTIALS_FILE" ]]; then
            rm -f "$CREDENTIALS_FILE"
            log "🔒 Archivo .credentials eliminado automáticamente por seguridad"
        fi
    ) &

    rm -f "$STATE_FILE"
    log "✅ Instalación finalizada. Revisa el resumen arriba."
}

# ─── Main ───────────────────────────────────────────────────────────────────
main() {
    if [[ "${1:-}" == "--rollback" ]]; then
        rollback
        exit 0
    fi

    show_banner

    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script debe ejecutarse como root. Usa: sudo bash install-vps.sh"
    fi

    mkdir -p "$PROJECT_DIR"
    touch "$LOG_FILE"

    load_state

    [[ $CURRENT_STEP -lt 1 ]] && step1_verify_system
    [[ $CURRENT_STEP -lt 2 ]] && step2_dependencies
    [[ $CURRENT_STEP -lt 3 ]] && step3_domain_ssl
    [[ $CURRENT_STEP -lt 4 ]] && step4_project_config
    [[ $CURRENT_STEP -lt 5 ]] && step5_build
    [[ $CURRENT_STEP -lt 6 ]] && step6_health
    [[ $CURRENT_STEP -lt 7 ]] && step7_backups
    [[ $CURRENT_STEP -lt 8 ]] && step8_summary

    log "🎉 Todo completado exitosamente"
}

main "$@"
