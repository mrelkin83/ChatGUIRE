# ChatGÜIRE — Auto-Instalador VPS v1.1

> **Versión corregida** — Fase 0+1 de remediación de seguridad aplicada.
> Fecha: 2026-05-16

## Requisitos

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| OS | Ubuntu 20.04/22.04/24.04 LTS | Ubuntu 22.04 LTS |
| RAM | 2 GB | **4 GB** (FIX B-7: WAHA/Chromium consume ~800MB) |
| Disco | 20 GB SSD | 40 GB SSD |
| Puertos | 22, 80, 443 libres | — |
| Dominio | DNS A record → VPS | — |

## Instalación rápida

```bash
# En tu VPS nuevo (como root)
ssh root@tu-vps-ip

# Descargar desde tu dominio propio (FIX C-4: no expone GitHub username)
curl -fsSL https://install.chatguire.co/install-vps.sh -o install-vps.sh
sudo bash install-vps.sh
```

> **Nota sobre repo privado:** El instalador asume que el código ya está en `/opt/chatguire`. Si usas un repo privado, clónalo manualmente antes de ejecutar el instalador, o modifica el paso 4 para hacer `git clone` con tus credenciales.

## Qué hace el instalador (8 pasos)

1. **Verificaciones** — OS, RAM, disco, puertos, conectividad
2. **Dependencias** — Docker, Nginx, certbot, UFW, fail2ban
3. **Dominio + SSL** — Let's Encrypt auto-renovable (HSTS + CSP endurecido)
4. **Configuración** — `.env` seguro, ENCRYPTION_KEY generada (mostrada UNA VEZ)
5. **Build Docker** — Multi-stage, migraciones Prisma
6. **Health checks** — API, DB, Redis, WAHA
7. **Backups** — Automáticos diarios a las 2:00 AM, retención 7 días
8. **Resumen** — URLs, credenciales, ENCRYPTION_KEY (¡guárdala!)

## Seguridad integrada

| Capa | Implementación |
|------|---------------|
| Firewall | UFW (solo 22, 80, 443) — **FIX A-1: 3000/3001 NO expuestos** |
| SSL | Let's Encrypt auto-renovable |
| Headers | HSTS, CSP (sin unsafe-inline), X-Frame-Options, X-Content-Type-Options |
| Rate limiting | Nginx + Redis |
| Credenciales | `.env` 600, `.credentials` auto-eliminado tras 5 min |
| Backups | **FIX C-5: DB comprimido, .env cifrado separadamente** |
| Redis | **FIX A-2: Con contraseña** |
| Instalador | **FIX C-1: Sin eval, sin inyección de comandos** |

## Comandos post-instalación

```bash
cd /opt/chatguire

# Estado
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

# Backup manual
bash scripts/backup.sh

# Restaurar
bash scripts/restore.sh /opt/chatguire-backups/db_20260516_030000.sql.gz

# Actualizar (zero-downtime, rollback automático)
bash scripts/update.sh

# Verificar salud
bash scripts/health-check.sh
bash scripts/verify-install.sh
```

## Correcciones aplicadas (Fase 0+1)

| ID | Problema | Fix |
|----|----------|-----|
| **C-1** | Inyección de comandos via `eval` | `printf -v` en todo el instalador |
| **C-2** | `ENCRYPTION_KEY` en `.credentials` | Mostrada UNA VEZ en pantalla, `.credentials` auto-borra en 5 min |
| **C-6** | Fallback `DB_PASS=changeme` | Eliminado — sin fallback, falla si falta variable |
| **A-6** | Scripts usaban `docker-compose.yml` | Todos usan `docker-compose.prod.yml` |
| **A-3** | `deploy.resources` ignorado | Reemplazado por `mem_limit` / `memswap_limit` |
| **M-9** | Sin rotación de logs | `logging.options.max-size` y `max-file` en todos los servicios |
| **M-10** | Backup incluía `.env` sin cifrar | `.env` excluido de config backup; backup separado cifrado con AES-256-CBC |
| **A-1** | UFW abría 3000/3001 | Eliminados — solo accesibles via Nginx en 127.0.0.1 |
| **M-6** | CSP con `unsafe-inline` | CSP endurecido, sin unsafe-inline/unsafe-eval |
| **M-7** | Sin HSTS | `Strict-Transport-Security` agregado |
| **M-11** | Credenciales hardcodeadas en restore | Leídas dinámicamente de `.env` |
| **M-13** | `sleep 2` para BGSAVE | `LASTSAVE` loop para confirmar |
| **B-3** | Temp file con PID predecible | `mktemp` |
| **B-8** | `eval` en health-check | Funciones directas sin eval |
| **B-9** | Verificaba 3000/3001 abiertos | Verifica que NO estén abiertos públicamente |
| **C-3** | `git reset --hard` en CI/CD | `git merge --ff-only` |
| **A-5** | `StrictHostKeyChecking=no` | Con fingerprint conocido desde secret |
| **A-8** | Node 20 en CI vs 22 en Docker | Sincronizado a 22 |
| **B-4** | Actions sin pin de commit | Todos pinned a hash específico |
| **B-5** | pnpm 9 en CI vs 10 en Docker | Sincronizado a 10 |
| **A-7** | Rollback sin digest de imagen | Guarda digest anterior, restaura en rollback |
| **M-12** | `sleep 5` insuficiente | Retry loop de 60s con curl |
| **A-4** | Imágenes `latest` | Versiones pineadas (WAHA 2025.1.15, Evolution v2.1.1) |
| **A-2** | Redis sin contraseña | `--requirepass ${REDIS_PASSWORD}` |

## Próximos pasos (Fase 2)

- [ ] Implementar cifrado real de backups con passphrase persistente (no temporal)
- [ ] Agregar monitoreo con Prometheus/Grafana
- [ ] Tests de integración (200+)
- [ ] Inbox tiempo real (SSE)
- [ ] Módulo de campañas completo

---

*Generado por remediación Fase 0+1 — ChatGÜIRE AutoInstallVps v1.1*
