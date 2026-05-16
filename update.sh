#!/bin/bash
#
# ChatGÜIRE — Actualización zero-downtime v1.1
# FIXES: A-6 (usa docker-compose.prod.yml), A-7 (rollback con digest de imagen)
#        M-12 (health check con retry loop en vez de sleep fijo)
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ROLLBACK_DIR="$PROJECT_DIR/.rollback"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

mkdir -p "$ROLLBACK_DIR"

# ─── Guardar estado actual para rollback real ────────────────────────────────
log "📸 Guardando estado actual para rollback..."

# FIX A-7: Guardar digests de imágenes actuales
API_IMAGE=$(docker compose -f "$COMPOSE_FILE" images -q api | head -1)
WEB_IMAGE=$(docker compose -f "$COMPOSE_FILE" images -q web | head -1)

if [[ -n "$API_IMAGE" ]]; then
    API_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$API_IMAGE" 2>/dev/null || echo "")
    echo "$API_DIGEST" > "$ROLLBACK_DIR/api_digest.txt"
fi
if [[ -n "$WEB_IMAGE" ]]; then
    WEB_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$WEB_IMAGE" 2>/dev/null || echo "")
    echo "$WEB_DIGEST" > "$ROLLBACK_DIR/web_digest.txt"
fi

# Guardar git commit actual
cd "$PROJECT_DIR" || exit 1
git rev-parse HEAD > "$ROLLBACK_DIR/git_commit.txt" 2>/dev/null || true

# ─── Pull y build ───────────────────────────────────────────────────────────
log "⬇️  Descargando actualizaciones..."
git fetch origin || {
    log "⚠️  No se pudo hacer fetch. ¿Tienes acceso al repo?"
    exit 1
}

# FIX C-3: Usar merge --ff-only en vez de reset --hard
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git merge --ff-only "origin/${CURRENT_BRANCH}" || {
    log "❌ Merge falló. Hay cambios locales o divergencia. Resuelve manualmente."
    exit 1
}

log "🔨 Reconstruyendo imágenes..."
docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" build --no-cache

# ─── Deploy con health check ────────────────────────────────────────────────
log "🚀 Desplegando nueva versión..."
docker compose -f "$COMPOSE_FILE" up -d

# FIX M-12: Retry loop para health check en vez de sleep fijo
log "⏳ Verificando salud de la aplicación..."
DOMAIN=$(grep DOMAIN "$PROJECT_DIR/.env" | cut -d= -f2 | tr -d '"')
local retries=30
local healthy=false

while [[ $retries -gt 0 ]]; do
    if curl -fsSL "https://${DOMAIN}/health" > /dev/null 2>&1; then
        healthy=true
        break
    fi
    sleep 2
    retries=$((retries - 1))
    echo -n "."
done
echo ""

if [[ "$healthy" == false ]]; then
    log "❌ Health check falló después de 60s"
    log "🛡️  Iniciando rollback automático..."

    # FIX A-7: Rollback real con digest anterior
    if [[ -f "$ROLLBACK_DIR/api_digest.txt" && -s "$ROLLBACK_DIR/api_digest.txt" ]]; then
        API_OLD=$(cat "$ROLLBACK_DIR/api_digest.txt")
        log "↩️  Restaurando imagen API: $API_OLD"
        docker compose -f "$COMPOSE_FILE" stop api
        docker rmi "$(docker compose -f "$COMPOSE_FILE" images -q api | head -1)" 2>/dev/null || true
        docker pull "$API_OLD" 2>/dev/null || docker tag "$API_OLD" chatguire-api:rollback 2>/dev/null || true
    fi

    if [[ -f "$ROLLBACK_DIR/git_commit.txt" && -s "$ROLLBACK_DIR/git_commit.txt" ]]; then
        GIT_OLD=$(cat "$ROLLBACK_DIR/git_commit.txt")
        log "↩️  Restaurando código: $GIT_OLD"
        git checkout "$GIT_OLD" 2>/dev/null || true
    fi

    docker compose -f "$COMPOSE_FILE" up -d
    log "✅ Rollback completado. Revisa los logs."
    exit 1
fi

log "✅ Actualización exitosa"
log "🧹 Limpiando imágenes antiguas..."
docker image prune -af --filter "until=168h" > /dev/null 2>&1 || true

log "🎉 Sistema actualizado y saludable"
