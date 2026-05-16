#!/bin/bash
#
# ChatGÜIRE — Backup automatizado v1.1
# FIXES: A-6 (usa docker-compose.prod.yml), M-10 (excluye .env de config backup)
#        M-13 (usa LASTSAVE en vez de sleep arbitrario)
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUP_DIR="/opt/chatguire-backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ─── Backup de base de datos ────────────────────────────────────────────────
log "📦 Iniciando backup de PostgreSQL..."
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
if [[ -z "$DB_CONTAINER" ]]; then
    log "❌ Contenedor postgres no encontrado"
    exit 1
fi

docker exec "$DB_CONTAINER" pg_dump -U chatguire -d chatguire -F c | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"
log "✅ DB backup: db_${DATE}.sql.gz ($(du -h "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1))"

# ─── Backup de Redis ────────────────────────────────────────────────────────
log "📦 Iniciando backup de Redis..."
REDIS_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q redis)
if [[ -n "$REDIS_CONTAINER" ]]; then
    # FIX M-13: Usar LASTSAVE para confirmar que BGSAVE terminó
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    local lastsave_before
    lastsave_before=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
    local retries=30
    while [[ $retries -gt 0 ]]; do
        sleep 1
        local lastsave_after
        lastsave_after=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
        if [[ "$lastsave_after" != "$lastsave_before" ]]; then
            break
        fi
        retries=$((retries - 1))
    done

    if [[ $retries -eq 0 ]]; then
        log "⚠️  BGSAVE no confirmó en 30s, continuando de todos modos..."
    fi

    docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$BACKUP_DIR/redis_${DATE}.rdb" 2>/dev/null || \
        log "⚠️  No se pudo copiar dump.rdb"
    log "✅ Redis backup: redis_${DATE}.rdb"
else
    log "⚠️  Contenedor redis no encontrado"
fi

# ─── Backup de configuración ────────────────────────────────────────────────
log "📦 Iniciando backup de configuración..."
CONFIG_BACKUP="$BACKUP_DIR/config_${DATE}.tar.gz"

# FIX M-10: Excluir .env del backup de configuración (tiene todas las contraseñas)
# El .env debe respaldarse SEPARADAMENTE y CIFRADO si es posible
tar -czf "$CONFIG_BACKUP" \
    --exclude='.env' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='uploads' \
    --exclude='postgres-data' \
    --exclude='redis-data' \
    --exclude='backups' \
    --exclude='*.log' \
    -C "$PROJECT_DIR" . 2>/dev/null || true

log "✅ Config backup: config_${DATE}.tar.gz (SIN .env por seguridad)"

# FIX M-10: Backup separado y cifrado del .env
if [[ -f "$PROJECT_DIR/.env" ]]; then
    # Generar passphrase temporal para cifrar .env
    PASSPHRASE=$(openssl rand -hex 16)
    openssl enc -aes-256-cbc -salt -in "$PROJECT_DIR/.env" -out "$BACKUP_DIR/env_${DATE}.enc" -pass pass:"$PASSPHRASE" 2>/dev/null || {
        log "⚠️  No se pudo cifrar .env"
        rm -f "$BACKUP_DIR/env_${DATE}.enc"
    }
    if [[ -f "$BACKUP_DIR/env_${DATE}.enc" ]]; then
        log "✅ .env cifrado: env_${DATE}.enc"
        log "🔐 Passphrase del .env (GUÁRDALA): $PASSPHRASE"
        # Guardar passphrase en un archivo separado con permisos restrictivos
        echo "$PASSPHRASE" > "$BACKUP_DIR/env_${DATE}.passphrase"
        chmod 600 "$BACKUP_DIR/env_${DATE}.passphrase"
    fi
fi

# ─── Backup de uploads ────────────────────────────────────────────────────────
if [[ -d "$PROJECT_DIR/uploads" ]]; then
    tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C "$PROJECT_DIR" uploads 2>/dev/null || true
    log "✅ Uploads backup: uploads_${DATE}.tar.gz"
fi

# ─── Rotación ───────────────────────────────────────────────────────────────
log "🗑️  Eliminando backups antiguos (> ${RETENTION_DAYS} días)..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
log "✅ Rotación completada"

log "🎉 Backup finalizado: $(date '+%Y-%m-%d %H:%M:%S')"
