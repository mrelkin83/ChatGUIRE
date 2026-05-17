#Requires -Version 5.1
#
# ChatGÜIRE — Instalador Local v1.0 (Windows)
# Requiere: PowerShell 5.1+, Node.js 20+, Docker Desktop, Git
# Uso: .\install-local.ps1
#

$ErrorActionPreference = "Stop"
$REPO_URL = "https://github.com/mrelkin83/ChatGUIRE.git"

function Write-Ok   { param($m) Write-Host "OK  $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "AVISO  $m" -ForegroundColor Yellow }
function Write-Err  {
    param($m)
    Write-Host "ERROR: $m" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

function New-RandomHex {
    param([int]$Bytes = 32)
    $arr = New-Object byte[] $Bytes
    [System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($arr)
    return ($arr | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

Clear-Host
Write-Host ""
Write-Host "+---------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|  ChatGUIRE - Instalador Local v1.0 (Windows)           |" -ForegroundColor Cyan
Write-Host "|  Entorno de desarrollo local                           |" -ForegroundColor Cyan
Write-Host "+---------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# ─── PASO 1: Prerequisitos ───────────────────────────────────────────────────
Write-Host "[1/5] Verificando prerequisitos..." -ForegroundColor White

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err "Node.js no instalado. Descarga desde https://nodejs.org (v20+)"
}
$nodeVer = [int](node -e "process.stdout.write(process.version.slice(1).split('.')[0])" 2>$null)
if ($nodeVer -lt 20) { Write-Err "Node.js v$nodeVer detectado. Se requiere v20+. Actualiza desde https://nodejs.org" }
Write-Ok "Node.js $(node --version)"

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "   pnpm no encontrado - instalando..." -ForegroundColor Yellow
    npm install -g pnpm@10.26.1
    if ($LASTEXITCODE -ne 0) { Write-Err "No se pudo instalar pnpm. Ejecuta manualmente: npm install -g pnpm@10.26.1" }
}
Write-Ok "pnpm $(pnpm --version)"

# Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker no instalado. Descarga Docker Desktop desde https://docker.com"
}
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker no esta corriendo. Inicia Docker Desktop y vuelve a ejecutar este script."
}
Write-Ok "Docker OK"

docker compose version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Err "Docker Compose no disponible. Actualiza Docker Desktop." }
Write-Ok "Docker Compose OK"

# Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "Git no instalado. Descarga desde https://git-scm.com"
}
Write-Ok "Git $(git --version)"

# ─── PASO 2: Repositorio ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Preparando repositorio..." -ForegroundColor White

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = ""

# Detectar si el script ya está dentro del repositorio
$pkgFile = Join-Path $ScriptDir "package.json"
if ((Test-Path $pkgFile) -and ((Get-Content $pkgFile -Raw) -match '"saas-omnichannel"')) {
    $ProjectDir = $ScriptDir
    Write-Ok "Repositorio detectado en $ProjectDir"
} else {
    $DefaultDir = Join-Path $env:USERPROFILE "ChatGUIRE"
    $InputDir   = Read-Host "   Donde instalar? [$DefaultDir]"
    $ProjectDir = if ($InputDir.Trim()) { $InputDir.Trim() } else { $DefaultDir }

    if (Test-Path (Join-Path $ProjectDir ".git")) {
        Write-Ok "Repositorio ya existe - actualizando..."
        git -C $ProjectDir pull origin main
        if ($LASTEXITCODE -ne 0) { Write-Warn "No se pudo actualizar. Continuando con la version local." }
    } else {
        Write-Host "   Clonando repositorio..." -ForegroundColor Gray
        git clone $REPO_URL $ProjectDir
        if ($LASTEXITCODE -ne 0) { Write-Err "No se pudo clonar. Verifica tu conexion a internet." }
        Write-Ok "Repositorio clonado en $ProjectDir"
    }
}

Set-Location $ProjectDir

# ─── PASO 3: Dependencias npm ────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Instalando dependencias..." -ForegroundColor White

pnpm install
if ($LASTEXITCODE -ne 0) { Write-Err "Fallo pnpm install. Revisa tu conexion o el pnpm-lock.yaml." }
Write-Ok "Dependencias instaladas"

# ─── PASO 4: Variables de entorno ────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Configurando entorno..." -ForegroundColor White

$EnvFile = Join-Path $ProjectDir ".env"

if (Test-Path $EnvFile) {
    Write-Warn ".env ya existe - no se sobreescribe. Eliminalo si quieres regenerarlo."
} else {
    $JwtSecret     = New-RandomHex 32
    $EncryptionKey = New-RandomHex 32
    $BridgeSecret  = New-RandomHex 16

    $envContent = @"
NODE_ENV=development

# Puertos
API_PORT=3001
WEB_PORT=3000

# Base de datos (PostgreSQL en Docker local)
DATABASE_URL=postgresql://chatguire:chatguire_local@localhost:5432/chatguire
DB_USER=chatguire
DB_PASS=chatguire_local
DB_NAME=chatguire

# Redis (Docker local, sin contrasena)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Seguridad (generado automaticamente)
JWT_SECRET=$JwtSecret
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=$EncryptionKey

# URLs locales
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_BASE_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
WEB_BASE_URL=http://localhost:3000

# Servicios externos (opcional - configura cuando los necesites)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_GLOBAL_KEY=
WAHA_API_URL=http://localhost:3100
WAHA_ENGINE=WEBJS
INSTAGRAM_BRIDGE_URL=http://localhost:8000
INSTAGRAM_BRIDGE_PORT=8000
BRIDGE_SECRET=$BridgeSecret
WEBHOOK_SECRET=$BridgeSecret

# Pagos Wompi (opcional)
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_ENVIRONMENT=sandbox
WOMPI_INTEGRITY_SECRET=

# IA (opcional - necesario para funciones de IA)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
"@

    $envContent | Out-File -FilePath $EnvFile -Encoding utf8 -NoNewline
    Write-Ok ".env generado con claves aleatorias"
}

# ─── PASO 5: Base de datos y migraciones ─────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Iniciando PostgreSQL y Redis (Docker)..." -ForegroundColor White

docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) { Write-Err "No se pudieron iniciar los contenedores. Revisa Docker Desktop." }

Write-Host "   Esperando PostgreSQL..." -ForegroundColor Gray
$retries = 30
do {
    Start-Sleep -Seconds 2
    docker compose exec -T postgres pg_isready -U chatguire -d chatguire 2>$null | Out-Null
    $retries--
    if ($retries -eq 0) { Write-Err "PostgreSQL no respondio. Revisa: docker compose logs postgres" }
} until ($LASTEXITCODE -eq 0)
Write-Ok "PostgreSQL listo"

Write-Host "   Ejecutando migraciones Drizzle..." -ForegroundColor Gray
pnpm --filter "@saas/db" db:migrate
if ($LASTEXITCODE -eq 0) {
    Write-Ok "Migraciones aplicadas"
} else {
    Write-Warn "Migracion fallo - ejecuta manualmente: pnpm --filter `"@saas/db`" db:migrate"
}

# ─── Resumen ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "+---------------------------------------------------------+" -ForegroundColor Green
Write-Host "|  Instalacion local completada                          |" -ForegroundColor Green
Write-Host "|                                                        |" -ForegroundColor Green
Write-Host "|  Para iniciar el desarrollo:                           |" -ForegroundColor Green
Write-Host "|    pnpm dev                                            |" -ForegroundColor Green
Write-Host "|                                                        |" -ForegroundColor Green
Write-Host "|  URLs:                                                 |" -ForegroundColor Green
Write-Host "|    Frontend:  http://localhost:3000                    |" -ForegroundColor Green
Write-Host "|    Backend:   http://localhost:3001                    |" -ForegroundColor Green
Write-Host "|    API Docs:  http://localhost:3001/documentation      |" -ForegroundColor Green
Write-Host "|                                                        |" -ForegroundColor Green
Write-Host "|  Base de datos (Docker):                               |" -ForegroundColor Green
Write-Host "|    PostgreSQL: localhost:5432  user=chatguire          |" -ForegroundColor Green
Write-Host "|    Redis:      localhost:6379                          |" -ForegroundColor Green
Write-Host "|                                                        |" -ForegroundColor Green
Write-Host "|  Comandos utiles:                                      |" -ForegroundColor Green
Write-Host "|    docker compose stop postgres redis   # Detener BD  |" -ForegroundColor Green
Write-Host "|    docker compose start postgres redis  # Reanudar BD |" -ForegroundColor Green
Write-Host "|    pnpm --filter @saas/db db:studio     # Drizzle UI  |" -ForegroundColor Green
Write-Host "+---------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  Siguiente paso: pnpm dev" -ForegroundColor Cyan
Write-Host ""
Read-Host "Presiona Enter para salir"
