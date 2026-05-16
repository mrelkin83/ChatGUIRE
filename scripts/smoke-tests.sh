#!/bin/bash
#
# ChatGÜIRE — Smoke tests básicos post-deploy
# Verifica que los servicios críticos responden correctamente.
#
set -euo pipefail

# Cargar variables de entorno si existe .env
if [[ -f "/opt/chatguire/.env" ]]; then
    # shellcheck disable=SC1091
    set -o allexport
    source /opt/chatguire/.env
    set +o allexport
fi

API_URL="${API_BASE_URL:-http://localhost:3001}"
WEB_URL="${WEB_BASE_URL:-http://localhost:3000}"
MAX_RETRIES=5
RETRY_DELAY=3

PASS=0
FAIL=0

check() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"

    local actual_status
    actual_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [[ "$actual_status" == "$expected_status" ]]; then
        echo "  PASS  $name ($actual_status)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL  $name — esperado $expected_status, recibido $actual_status"
        FAIL=$((FAIL + 1))
    fi
}

wait_for() {
    local url="$1"
    local retries=0
    until curl -s -o /dev/null --max-time 5 "$url" 2>/dev/null; do
        retries=$((retries + 1))
        if [[ $retries -ge $MAX_RETRIES ]]; then
            echo "  TIMEOUT  $url no responde tras $MAX_RETRIES intentos"
            return 1
        fi
        sleep "$RETRY_DELAY"
    done
}

echo "=== ChatGUiRE Smoke Tests ==="
echo "API: $API_URL"
echo "Web: $WEB_URL"
echo ""

echo "Esperando que los servicios arranquen..."
wait_for "$API_URL/health"

echo ""
echo "--- API ---"
check "API health"          "$API_URL/health"
check "Auth login endpoint" "$API_URL/api/auth/login" "405"   # POST only — GET returns 405

echo ""
echo "--- Web ---"
check "Web homepage" "$WEB_URL" "200"

echo ""
echo "--- Resumen ---"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
    echo "RESULTADO: FALLO ($FAIL tests fallaron)"
    exit 1
fi

echo "RESULTADO: EXITO"
exit 0
