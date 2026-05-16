#!/bin/bash
#
# ChatGÜIRE — Verificación post-instalación v1.1
# FIXES: A-6 (usa docker-compose.prod.yml), B-9 (no verifica 3000/3001 como abiertos)
#
set -euo pipefail

PROJECT_DIR="/opt/chatguire"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

PASS=0
FAIL=0

test_pass() {
    echo "  ✅ $1"
    ((PASS++))
}

test_fail() {
    echo "  ❌ $1"
    ((FAIL++))
}

echo "🔍 Verificación post-instalación ChatGÜIRE"
echo "=========================================="
echo ""

# ─── Estructura de archivos ─────────────────────────────────────────────────
echo "📁 Estructura de archivos:"
[[ -d "$PROJECT_DIR" ]] && test_pass "Directorio del proyecto existe" || test_fail "Directorio del proyecto no existe"
[[ -f "$COMPOSE_FILE" ]] && test_pass "docker-compose.prod.yml existe" || test_fail "docker-compose.prod.yml no existe"
[[ -f "$PROJECT_DIR/.env" ]] && test_pass ".env existe" || test_fail ".env no existe"
[[ -f "$PROJECT_DIR/scripts/backup.sh" ]] && test_pass "backup.sh existe" || test_fail "backup.sh no existe"
[[ -f "$PROJECT_DIR/scripts/restore.sh" ]] && test_pass "restore.sh existe" || test_fail "restore.sh no existe"
[[ -f "$PROJECT_DIR/scripts/update.sh" ]] && test_pass "update.sh existe" || test_fail "update.sh no existe"
[[ -f "$PROJECT_DIR/scripts/health-check.sh" ]] && test_pass "health-check.sh existe" || test_fail "health-check.sh no existe"

# ─── Permisos ─────────────────────────────────────────────────────────────────
echo ""
echo "🔐 Permisos:"
[[ $(stat -c %a "$PROJECT_DIR/.env") == "600" ]] && test_pass ".env tiene permisos 600" || test_fail ".env sin permisos 600"
[[ ! -f "$PROJECT_DIR/.credentials" ]] && test_pass ".credentials eliminado (seguro)" || test_fail ".credentials aún existe — elimínalo"

# ─── Docker ───────────────────────────────────────────────────────────────────
echo ""
echo "🐳 Docker:"
docker info > /dev/null 2>&1 && test_pass "Docker daemon responde" || test_fail "Docker no responde"
[[ $(docker compose -f "$COMPOSE_FILE" ps -q postgres | wc -l) -gt 0 ]] && test_pass "PostgreSQL corriendo" || test_fail "PostgreSQL no corre"
[[ $(docker compose -f "$COMPOSE_FILE" ps -q redis | wc -l) -gt 0 ]] && test_pass "Redis corriendo" || test_fail "Redis no corre"
[[ $(docker compose -f "$COMPOSE_FILE" ps -q api | wc -l) -gt 0 ]] && test_pass "API corriendo" || test_fail "API no corre"
[[ $(docker compose -f "$COMPOSE_FILE" ps -q web | wc -l) -gt 0 ]] && test_pass "Web corriendo" || test_fail "Web no corre"

# ─── Red y seguridad ──────────────────────────────────────────────────────────
echo ""
echo "🌐 Red y seguridad:"
# FIX B-9: Verificar que 3000/3001 NO estén expuestos públicamente
! ss -tlnp | grep -q ':3000 ' && test_pass "Puerto 3000 NO expuesto públicamente" || test_fail "Puerto 3000 expuesto — debe estar solo en 127.0.0.1"
! ss -tlnp | grep -q ':3001 ' && test_pass "Puerto 3001 NO expuesto públicamente" || test_fail "Puerto 3001 expuesto — debe estar solo en 127.0.0.1"
ss -tlnp | grep -q ':80 ' && test_pass "Puerto 80 abierto" || test_fail "Puerto 80 cerrado"
ss -tlnp | grep -q ':443 ' && test_pass "Puerto 443 abierto" || test_fail "Puerto 443 cerrado"

# UFW
ufw status | grep -q "Status: active" && test_pass "UFW activo" || test_fail "UFW inactivo"
! ufw status | grep -q "3000/tcp" && test_pass "UFW no abre 3000" || test_fail "UFW abre 3000 — debe eliminarse"
! ufw status | grep -q "3001/tcp" && test_pass "UFW no abre 3001" || test_fail "UFW abre 3001 — debe eliminarse"

# ─── SSL ──────────────────────────────────────────────────────────────────────
echo ""
echo "🔒 SSL:"
DOMAIN=$(grep DOMAIN "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")
if [[ -n "$DOMAIN" ]]; then
    curl -fsSL "https://${DOMAIN}" > /dev/null 2>&1 && test_pass "HTTPS responde" || test_fail "HTTPS no responde"
    curl -fsSL "https://${DOMAIN}/health" > /dev/null 2>&1 && test_pass "/health responde" || test_fail "/health no responde"

    # HSTS
    curl -fsSL -I "https://${DOMAIN}" 2>/dev/null | grep -qi "strict-transport-security" && test_pass "HSTS header presente" || test_fail "HSTS header ausente"

    # CSP sin unsafe-inline
    local csp
    csp=$(curl -fsSL -I "https://${DOMAIN}" 2>/dev/null | grep -i "content-security-policy" || true)
    if [[ -n "$csp" ]]; then
        ! echo "$csp" | grep -qi "unsafe-inline" && test_pass "CSP sin unsafe-inline" || test_fail "CSP contiene unsafe-inline"
    else
        test_fail "CSP header ausente"
    fi
else
    test_fail "DOMAIN no definido en .env"
fi

# ─── Backups ──────────────────────────────────────────────────────────────────
echo ""
echo "💾 Backups:"
[[ -d "/opt/chatguire-backups" ]] && test_pass "Directorio de backups existe" || test_fail "Directorio de backups no existe"
[[ -f "/etc/cron.d/chatguire-backup" ]] && test_pass "Cron de backup configurado" || test_fail "Cron de backup no configurado"

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "Resultado: $PASS pasaron, $FAIL fallaron"
if [[ $FAIL -eq 0 ]]; then
    echo "🎉 Verificación completada. Sistema listo para producción."
    exit 0
else
    echo "⚠️  Hay $FAIL problemas por resolver. Revisa arriba."
    exit 1
fi
