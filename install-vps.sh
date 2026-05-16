#!/bin/bash
#
# ChatGÜIRE — Auto-Instalador VPS v1.3
# Fixes: dpkg lock, resume state, auto-passwords, DNS no-bloqueante,
#        backup path, migracion Drizzle, API_PORT correcto,
#        nginx SSL ordering, detección Cloudflare, migración producción.
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
COMPLETED_STEP=0
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

wait_for_dpkg_lock() {
    local retries=24
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || \
          fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
        log "⏳ Esperando lock de dpkg (otro proceso apt activo)..."
        sleep 5
        retries=$((retries - 1))
        if [[ $retries -eq 0 ]]; then
            error_exit "dpkg lock no se liberó después de 2 minutos."
        fi
    done
}

# Detecta si una IP pertenece a rangos de Cloudflare proxy
is_cloudflare_proxy() {
    local ip="$1"
    [[ -z "$ip" ]] && return 1
    if echo "$ip" | grep -qE \
        '^(104\.1[6-9]\.|104\.2[0-6]\.|172\.6[4-9]\.|172\.7[01]\.|162\.158\.|103\.21\.244\.|103\.22\.200\.|103\.31\.[0-4]\.|141\.101\.|188\.114\.|190\.93\.|197\.234\.|198\.41\.)'; then
        return 0
    fi
    return 1
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
│  🤖 ChatGÜIRE — Instalador VPS v1.3                         │
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
        curl wget git nginx certbot \
        ufw fail2ban openssl jq bc dnsutils psmisc \
        ca-certificates gnupg lsb-release

    # ── Docker Engine (repo oficial)
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

    if ! docker compose version &>/dev/null 2>&1; then
        curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-$(uname -m)" \
            -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        mkdir -p /usr/local/lib/docker/cli-plugins
        ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
        log "✅ Docker Compose V2 instalado manualmente"
    fi
    log "✅ Docker Compose $(docker compose version --short)"

    if ! ufw status | grep -q "Status: active"; then
        ufw default deny incoming
        ufw default allow outgoing
    fi
    ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1 || true
    ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1 || true
    ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1 || true
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

    local vps_ip domain_ip
    vps_ip=$(curl -fsSL https://ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    domain_ip=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | tail -1 || true)

    local cloudflare_proxy=false
    if [[ "$domain_ip" != "$vps_ip" ]]; then
        if is_cloudflare_proxy "$domain_ip"; then
            cloudflare_proxy=true
            log "⚠️  CLOUDFLARE PROXY DETECTADO: $DOMAIN → $domain_ip (Cloudflare)"
            log "   Let's Encrypt fallará con el proxy naranja activo."
            log "   ─── ANTES DE CONTINUAR: ───────────────────────────────────"
            log "   1. Ve a dash.cloudflare.com → DNS → registro A de $DOMAIN"
            log "   2. Cambia el ícono naranja ☁️  a gris (solo DNS, sin proxy)"
            log "   3. Espera ~1 min a que propague"
            log "   4. Re-ejecuta: certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
            log "   5. Luego reactiva el proxy naranja si lo deseas"
            log "   ──────────────────────────────────────────────────────────"
        else
            log "⚠️  DNS: $DOMAIN resuelve a '$domain_ip', este VPS es $vps_ip"
            log "   Crea un A record: $DOMAIN → $vps_ip"
            log "   Continuando instalación. Let's Encrypt fallará si el DNS no propagó."
            log "   Re-ejecuta SSL después: certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
        fi
    else
        log "✅ DNS verificado: $DOMAIN → $vps_ip"
    fi

    local email="admin@${DOMAIN}"
    log "Email Let's Encrypt: $email (puedes cambiarlo en .env después)"

    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

    # ── Config HTTPS completa (solo se activa DESPUÉS de obtener el cert) ──
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

    # ── Config HTTP temporal (solo para el challenge de certbot) ──
    cat > "/etc/nginx/sites-available/chatguire-http" <<NGINX_HTTP
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; add_header Content-Type text/plain; }
}
NGINX_HTTP

    # CRÍTICO: activar SOLO la config HTTP. No activar HTTPS hasta tener el cert.
    # Si se activa la config HTTPS sin cert, nginx -t falla y nginx no sirve nada.
    rm -f /etc/nginx/sites-enabled/chatguire        # Quitar HTTPS (puede existir de run previo)
    rm -f /etc/nginx/sites-enabled/default
    ln -sf "/etc/nginx/sites-available/chatguire-http" /etc/nginx/sites-enabled/chatguire-http

    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx 2>/dev/null || systemctl start nginx
        log "✅ Nginx HTTP activo (sirviendo challenge de certbot)"
    else
        log "⚠️  Error en config Nginx HTTP — revisando..."
        nginx -t
    fi

    # ── Certbot (solo si el DNS apunta directamente al VPS) ──
    if [[ "$cloudflare_proxy" == true ]]; then
        log "⏭️  Saltando certbot — Cloudflare proxy activo. Sigue las instrucciones de arriba."
    elif ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
            --non-interactive --agree-tos -m "$email" 2>/dev/null && {

            log "✅ Certificado SSL obtenido"
            # Ahora sí activar config HTTPS completa
            rm -f /etc/nginx/sites-enabled/chatguire-http
            ln -sf "/etc/nginx/sites-available/chatguire" /etc/nginx/sites-enabled/chatguire
            nginx -t && systemctl reload nginx && log "✅ Nginx HTTPS activo" || \
                log "⚠️  Nginx reload falló tras obtener certificado"

        } || {
            log "⚠️  Let's Encrypt no obtuvo cert"
            log "   Re-ejecuta cuando el DNS esté listo:"
            log "   certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --non-interactive --agree-tos -m $email"
            log "   Luego: rm /etc/nginx/sites-enabled/chatguire-http && ln -sf /etc/nginx/sites-available/chatguire /etc/nginx/sites-enabled/chatguire && nginx -t && systemctl reload nginx"
        }
    else
        log "✅ Certificado SSL ya existe"
        rm -f /etc/nginx/sites-enabled/chatguire-http
        ln -sf "/etc/nginx/sites-available/chatguire" /etc/nginx/sites-enabled/chatguire
        nginx -t && systemctl reload nginx || log "⚠️  Nginx reload falló"
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

    ENCRYPTION_KEY=$(generate_encryption_key)
    local db_pass redis_pass jwt_secret webhook_secret
    db_pass=$(gen_password)
    redis_pass=$(gen_password)
    jwt_secret=$(openssl rand -hex 32)
    webhook_secret=$(openssl rand -hex 16)

    log "✅ Contraseñas generadas automáticamente"

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

# Servicios externos
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_GLOBAL_KEY=${jwt_secret}
WAHA_API_URL=http://waha:3000
WAHA_ENGINE=WEBJS
INSTAGRAM_BRIDGE_URL=http://instagram-bridge:8000
INSTAGRAM_BRIDGE_PORT=8000
BRIDGE_SECRET=${webhook_secret}

# URLs
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
API_BASE_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN}
WEB_BASE_URL=https://${DOMAIN}

# Misc
WEBHOOK_SECRET=${webhook_secret}
EOF

    chmod 600 "$PROJECT_DIR/.env"

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

    # Esperar a que el container API esté corriendo
    log "⏳ Esperando contenedor API..."
    retries=30
    until docker compose -f "$COMPOSE_FILE" ps -q api >/dev/null 2>&1 && \
          [[ $(docker compose -f "$COMPOSE_FILE" ps -a api --format '{{.State}}') == "running" ]]; do
        sleep 3
        retries=$((retries - 1))
        [[ $retries -eq 0 ]] && error_exit "API container no arrancó en 90s"
    done
    log "✅ API container corriendo"

    # ── Migraciones Drizzle ──────────────────────────────────────────────
    # drizzle-kit solo existe en devDependencies (no en el container de producción).
    # Se usa un container efímero de Node con el código fuente del monorepo.
    log "Ejecutando migraciones Drizzle..."
    local db_url
    db_url=$(grep '^DATABASE_URL=' "$PROJECT_DIR/.env" | cut -d= -f2-)

    # Detectar nombre de red del compose
    local compose_network
    compose_network=$(docker compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null \
        | xargs -r docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null \
        | head -1 || echo "chatguire-network")

    docker run --rm \
        --network "$compose_network" \
        -e DATABASE_URL="$db_url" \
        -v "${PROJECT_DIR}:/app" \
        -w /app \
        node:22-alpine \
        sh -c "
            corepack enable && corepack prepare pnpm@10.26.1 --activate 2>/dev/null
            pnpm install --frozen-lockfile --silent 2>/dev/null
            pnpm --filter @saas/db db:migrate
        " 2>&1 | tee -a "$LOG_FILE" && log "✅ Migraciones ejecutadas" || {
        log "⚠️  Migración automática falló — continuando. Ejecuta manualmente:"
        log "   cd $PROJECT_DIR && docker run --rm --network $compose_network -e DATABASE_URL='$db_url' -v \$(pwd):/app -w /app node:22-alpine sh -c 'corepack enable && pnpm install --frozen-lockfile && pnpm --filter @saas/db db:migrate'"
    }

    # ── SuperAdmin ───────────────────────────────────────────────────────
    log "Creando SuperAdmin..."
    local admin_pass
    admin_pass=$(openssl rand -base64 18 | tr -d '=+/')

    docker compose -f "$COMPOSE_FILE" exec -T api node -e "
      (async () => {
        try {
          const bcrypt = require('bcrypt');
          const postgres = require('postgres');
          const sql = postgres(process.env.DATABASE_URL);
          const hash = await bcrypt.hash('${admin_pass}', 12);
          await sql\`INSERT INTO superadmin_users (email, password_hash, full_name, role)
            VALUES ('admin@${DOMAIN}', \${hash}, 'Super Admin', 'superadmin')
            ON CONFLICT (email) DO NOTHING\`;
          await sql.end();
          process.exit(0);
        } catch (e) {
          console.error('Error:', e.message);
          process.exit(1);
        }
      })();
    " 2>/dev/null && {
        # Guardar el password REAL en .credentials para mostrarlo en el resumen
        echo "SUPERADMIN_PASS=${admin_pass}" >> "$CREDENTIALS_FILE"
        chmod 600 "$CREDENTIALS_FILE"
        log "✅ SuperAdmin creado (admin@${DOMAIN})"
    } || {
        log "⚠️  No se pudo crear SuperAdmin automáticamente."
        log "   Crea uno manualmente desde /superadmin después del despliegue."
    }

    log "✅ Aplicación desplegada"
}

# ─── PASO 6: Health checks ──────────────────────────────────────────────────
step6_health() {
    show_step 6 "Ejecutando health checks..."

    local retries=20
    local api_ok=false db_ok=false redis_ok=false

    # Cargar REDIS_PASSWORD del .env
    local redis_pw=""
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        redis_pw=$(grep '^REDIS_PASSWORD=' "$PROJECT_DIR/.env" | cut -d= -f2)
        export REDIS_PASSWORD="$redis_pw"
    fi

    while [[ $retries -gt 0 ]]; do
        if curl -fsSL "http://127.0.0.1:3001/health" > /dev/null 2>&1; then
            api_ok=true
        fi
        if docker compose -f "$COMPOSE_FILE" exec -T postgres \
              pg_isready -U chatguire > /dev/null 2>&1; then
            db_ok=true
        fi
        if docker compose -f "$COMPOSE_FILE" exec -T redis \
              redis-cli -a "${redis_pw}" ping > /dev/null 2>&1; then
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

    mkdir -p "$PROJECT_DIR/scripts"

    for script in backup.sh restore.sh update.sh health-check.sh verify-install.sh; do
        if [[ -f "$PROJECT_DIR/$script" ]] && [[ ! -f "$PROJECT_DIR/scripts/$script" ]]; then
            cp "$PROJECT_DIR/$script" "$PROJECT_DIR/scripts/$script"
            chmod +x "$PROJECT_DIR/scripts/$script"
            log "✅ Copiado $script a scripts/"
        fi
    done

    cat > /etc/cron.d/chatguire-backup <<EOF
0 2 * * * root cd ${PROJECT_DIR} && bash scripts/backup.sh >> /var/log/chatguire-backup.log 2>&1
EOF

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

    # Leer el password REAL generado en paso 5 (no generar uno nuevo)
    local admin_pass enc_key
    admin_pass="(ver $CREDENTIALS_FILE)"
    enc_key="(ver $CREDENTIALS_FILE)"
    if [[ -f "$CREDENTIALS_FILE" ]]; then
        local stored_pass stored_key
        stored_pass=$(grep '^SUPERADMIN_PASS=' "$CREDENTIALS_FILE" | cut -d= -f2 || true)
        stored_key=$(grep '^ENCRYPTION_KEY=' "$CREDENTIALS_FILE" | cut -d= -f2 || true)
        [[ -n "$stored_pass" ]] && admin_pass="$stored_pass"
        [[ -n "$stored_key" ]]  && enc_key="$stored_key"
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
│  3. Si DNS/SSL pendiente: certbot certonly --webroot         │
│     -w /var/www/certbot -d ${DOMAIN}                        │
│     --non-interactive --agree-tos -m admin@${DOMAIN}        │
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
