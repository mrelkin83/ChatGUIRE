#!/bin/bash
#
# ChatGÜIRE — Post-deploy smoke tests + rollback automático
# Ejecutado por CI/CD después de cada deploy
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ROLLBACK_DIR="$PROJECT_DIR/.rollback"
LOG_FILE="/var/log/chatguire/deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")"

log "Ejecutando smoke tests post-deploy..."

if bash "$PROJECT_DIR/scripts/smoke-tests.sh" >> "$LOG_FILE" 2>&1; then
    log "Smoke tests PASARON. Deploy confirmado."
    rm -rf "$ROLLBACK_DIR"
    log "Deploy exitoso."
    exit 0
else
    log "Smoke tests FALLARON. Iniciando rollback automatico..."

    if [[ -f "$PROJECT_DIR/scripts/update.sh" ]]; then
        cd "$PROJECT_DIR" || exit 1

        if [[ -f "$ROLLBACK_DIR/git_commit.txt" && -s "$ROLLBACK_DIR/git_commit.txt" ]]; then
            GIT_OLD=$(cat "$ROLLBACK_DIR/git_commit.txt")
            log "Restaurando codigo: $GIT_OLD"
            git checkout "$GIT_OLD" 2>/dev/null || true
        fi

        docker compose -f "$COMPOSE_FILE" build --no-cache
        docker compose -f "$COMPOSE_FILE" up -d

        sleep 10
        DOMAIN=$(grep '^DOMAIN=' "$PROJECT_DIR/.env" | cut -d= -f2 | tr -d '"')
        if curl -fsSL "https://${DOMAIN}/health" > /dev/null 2>&1; then
            log "Rollback completado exitosamente. Sistema estable."
            exit 1
        else
            log "Rollback tambien fallo. Intervencion manual requerida."
            exit 2
        fi
    else
        log "No se encontro update.sh. Rollback manual requerido."
        exit 2
    fi
fi
