#!/bin/bash
#
# ChatGÜIRE — Health Check v1.1
# FIXES: A-6 (usa docker-compose.prod.yml), B-8 (sin eval)
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

# FIX B-8: Reemplazar eval con arrays/funciones directas
check() {
    local name="$1"
    local cmd="$2"
    local expected="${3:-0}"

    printf "  %-40s " "$name..."
    if bash -c "$cmd" > /dev/null 2>&1; then
        echo "✅"
        return 0
    else
        echo "❌"
        return 1
    fi
}

check_docker() {
    local name="$1"
    local service="$2"
    local health_cmd="$3"

    printf "  %-40s " "$name..."
    local container
    container=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null)
    if [[ -z "$container" ]]; then
        echo "❌ (no running)"
        return 1
    fi

    if docker exec "$container" bash -c "$health_cmd" > /dev/null 2>&1; then
        echo "✅"
        return 0
    else
        echo "❌ (unhealthy)"
        return 1
    fi
}

echo "🔍 Health Check ChatGÜIRE — $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

FAILED=0

# ─── Docker Compose ─────────────────────────────────────────────────────────
echo "📦 Docker Compose:"
check "Compose file existe" "test -f $COMPOSE_FILE" || ((FAILED++))
check "Docker daemon responde" "docker info > /dev/null" || ((FAILED++))

# ─── Contenedores ───────────────────────────────────────────────────────────
echo ""
echo "🐳 Contenedores:"
check_docker "API" "api" "wget -qO- http://127.0.0.1:3001/health > /dev/null" || ((FAILED++))
check_docker "Web" "web" "wget -qO- http://127.0.0.1:3000 > /dev/null" || ((FAILED++))
check_docker "PostgreSQL" "postgres" "pg_isready -U chatguire" || ((FAILED++))
check_docker "Redis" "redis" "redis-cli ping | grep -q PONG" || ((FAILED++))
check_docker "WAHA" "waha" "wget -qO- http://127.0.0.1:3000/health > /dev/null" || ((FAILED++))

# ─── Sistema ──────────────────────────────────────────────────────────────────
echo ""
echo "🖥️  Sistema:"
check "Disco > 20% libre" "test \$(df / | tail -1 | awk '{print \$4}') -gt 2097152" || ((FAILED++))
check "RAM > 10% libre" "test \$(free | grep Mem | awk '{print \$7/\$2*100}' | cut -d. -f1) -gt 10" || ((FAILED++))
check "Nginx responde" "systemctl is-active nginx > /dev/null" || ((FAILED++))
check "UFW activo" "ufw status | grep -q 'Status: active'" || ((FAILED++))
check "fail2ban activo" "systemctl is-active fail2ban > /dev/null" || ((FAILED++))

# ─── SSL ──────────────────────────────────────────────────────────────────────
echo ""
echo "🔒 SSL:"
DOMAIN=$(grep DOMAIN "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")
if [[ -n "$DOMAIN" ]]; then
    check "Certificado válido" "openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} < /dev/null 2>/dev/null | grep -q 'Verify return code: 0'" || ((FAILED++))
    check "Certificado no expira en < 7 días" "test \$(echo | openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d '{}' +%s) -gt \$(date -d '+7 days' +%s)" || ((FAILED++))
fi

# ─── API Endpoint ───────────────────────────────────────────────────────────
echo ""
echo "🌐 API Endpoint:"
if [[ -n "$DOMAIN" ]]; then
    check "/health responde 200" "curl -fsSL https://${DOMAIN}/health > /dev/null" || ((FAILED++))
fi

# ─── Resumen ─────────────────────────────────────────────────────────────────
echo ""
if [[ $FAILED -eq 0 ]]; then
    echo "🎉 Todos los checks pasaron. Sistema saludable."
    exit 0
else
    echo "⚠️  $FAILED check(s) fallaron. Revisa los logs."
    exit 1
fi
