#!/bin/bash
#
# ChatGÜIRE — Restauración desde backup v1.1
# FIXES: A-6 (usa docker-compose.prod.yml), M-11 (lee credenciales de .env)
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUP_DIR="/opt/chatguire-backups"

usage() {
    echo "Uso: $0 <archivo_backup_db.sql.gz>"
    echo "Ejemplo: $0 /opt/chatguire-backups/db_20260516_030000.sql.gz"
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

DB_BACKUP="$1"

if [[ ! -f "$DB_BACKUP" ]]; then
    echo "❌ Archivo no encontrado: $DB_BACKUP"
    exit 1
fi

# FIX M-11: Leer credenciales de .env en lugar de hardcodear
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    echo "❌ No se encontró $PROJECT_DIR/.env"
    exit 1
fi

# shellcheck source=/dev/null
source "$PROJECT_DIR/.env"

DB_USER="${DB_USER:-chatguire}"
DB_NAME="${DB_NAME:-chatguire}"
DB_PASS="${DB_PASS:-}"

if [[ -z "$DB_PASS" ]]; then
    echo "❌ DB_PASS no definido en .env"
    exit 1
fi

echo "⚠️  ADVERTENCIA: Esto DESTRUIRÁ la base de datos actual y la reemplazará con el backup."
echo "   Backup seleccionado: $DB_BACKUP"
read -rp "¿Estás seguro? Escribe RESTAURAR para confirmar: " confirm

if [[ "$confirm" != "RESTAURAR" ]]; then
    echo "❌ Cancelado."
    exit 1
fi

echo "🛑 Deteniendo servicios..."
cd "$PROJECT_DIR" || exit 1
docker compose -f "$COMPOSE_FILE" stop api web

echo "🗄️  Restaurando base de datos..."
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
if [[ -z "$DB_CONTAINER" ]]; then
    echo "❌ Contenedor postgres no encontrado"
    exit 1
fi

docker exec -i "$DB_CONTAINER" pg_restore \
    --clean --if-exists \
    --dbname="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}" \
    < <(gunzip -c "$DB_BACKUP")

echo "🚀 Reiniciando servicios..."
docker compose -f "$COMPOSE_FILE" start api web

echo "⏳ Esperando health check..."
sleep 10
if curl -fsSL "https://$(grep DOMAIN "$PROJECT_DIR/.env" | cut -d= -f2)/health" > /dev/null 2>&1; then
    echo "✅ Restauración completada exitosamente"
else
    echo "⚠️  La API no responde. Revisa los logs: docker compose -f $COMPOSE_FILE logs api"
fi
